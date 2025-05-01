from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from models import db, User, StudyGroup, GroupMember, Category
from sqlalchemy import text

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///study_groups.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

def auto_assign_category(subject):
    category_keywords = {
        "Math": ["MA", "MATH", "CALC", "STAT"],
        "English": ["ENGL", "COM", "WRIT", "SCLA"],
        "Science": ["PHYS", "CHEM", "BIO", "SCI", "OCHEM", "NUTR"],
        "Computer Science": ["CS", "CNIT", "INFO"],
        "Engineering": ["ENGR", "ECE", "ME", "CE"]
    }
    subject = subject.upper()
    for name, keywords in category_keywords.items():
        if any(k in subject for k in keywords):
            category = Category.query.filter_by(name=name).first()
            if category:
                return category.id
    return None

@app.route('/api/study-groups', methods=['GET'])
def get_study_groups():
    groups = StudyGroup.query.all()
    group_data = []
    for g in groups:
        member_count = GroupMember.query.filter_by(study_group_id=g.id).count()
        group_data.append({
            'id': g.id,
            'subject': g.subject,
            'description': g.description,
            'meeting_time': g.meeting_time.strftime('%Y-%m-%d %I:%M %p'),
            'location': g.location,
            'category': g.category.name if g.category else 'Uncategorized',
            'organizer_id': g.organizer_id,
            'max_members': g.max_members,
            'member_count': member_count
        })
    return jsonify(group_data)

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{'id': u.id, 'name': u.name} for u in users])

@app.route('/api/study-groups', methods=['POST'])
def create_study_group():
    data = request.json
    try:
        subject = data['subject']
        description = data.get('description', '')
        meeting_time = datetime.strptime(data['meeting_time'], '%Y-%m-%dT%H:%M')
        location = data['location']
        organizer_id = data['organizer_id']
        max_members = data.get('max_members')
        detected_id = data.get('category_id') or auto_assign_category(subject)

        new_group = StudyGroup(
            subject=subject,
            description=description,
            meeting_time=meeting_time,
            location=location,
            category_id=detected_id,
            organizer_id=organizer_id,
            max_members=max_members
        )

        db.session.add(new_group)
        db.session.commit()
        return jsonify({'message': 'Study group created successfully!', 'id': new_group.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<int:user_id>/joined-groups', methods=['GET'])
def get_joined_groups(user_id):
    query = """
        SELECT sg.*, c.name AS category_name
        FROM study_group sg
        JOIN group_member gm ON sg.id = gm.study_group_id
        LEFT JOIN category c ON sg.category_id = c.id
        WHERE gm.user_id = :user_id
    """
    result = db.session.execute(text(query), {'user_id': user_id})
    groups = []
    for row in result:
        groups.append({
            'id': row.id,
            'subject': row.subject,
            'meeting_time': row.meeting_time,
            'location': row.location,
            'category': row.category_name or 'Uncategorized',
            'organizer_id': row.organizer_id,
            'max_members': row.max_members
        })
    return jsonify(groups)

@app.route('/api/study-groups/<int:id>', methods=['PUT'])
def update_study_group(id):
    data = request.json
    group = StudyGroup.query.get(id)
    if not group:
        return jsonify({'error': 'Study group not found'}), 404

    try:
        group.subject = data.get('subject', group.subject)
        group.description = data.get('description', group.description)
        group.location = data.get('location', group.location)

        meeting_time = data.get('meeting_time')
        if meeting_time:
            if 'T' in meeting_time:
                group.meeting_time = datetime.strptime(meeting_time, '%Y-%m-%dT%H:%M')
            else:
                group.meeting_time = datetime.strptime(meeting_time, '%Y-%m-%d %H:%M')

        if 'category_id' in data and data['category_id'] is not None:
            group.category_id = data['category_id']
        else:
            detected_id = auto_assign_category(group.subject)
            if detected_id:
                group.category_id = detected_id

        if 'max_members' in data:
            group.max_members = data['max_members']

        db.session.commit()
        return jsonify({'message': 'Study group updated successfully'})
    except Exception as e:
        print("Error while updating:", e)
        return jsonify({'error': str(e)}), 400

@app.route('/api/study-groups/<int:id>', methods=['DELETE'])
def delete_study_group(id):
    group = StudyGroup.query.get(id)
    if not group:
        return jsonify({'error': 'Study group not found'}), 404

    db.session.delete(group)
    db.session.commit()
    return jsonify({'message': 'Study group deleted successfully'})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{'id': c.id, 'name': c.name} for c in categories])

@app.route('/api/categories/summary', methods=['GET'])
def category_summary():
    query = """
        SELECT c.name AS category_name, COUNT(sg.id) AS group_count
        FROM category c
        LEFT JOIN study_group sg ON sg.category_id = c.id
        GROUP BY c.name
        ORDER BY group_count DESC
    """
    result = db.session.execute(text(query))
    summary = [{'category': row.category_name, 'count': row.group_count} for row in result]
    return jsonify(summary)

@app.route('/api/study-groups/report', methods=['POST'])
def report_study_groups():
    data = request.json
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    category_id = data.get('category_id') or None
    min_members = data.get('min_members')
    sort_order = data.get('sort_order', 'asc').lower()

    sort_sql = 'ASC' if sort_order != 'desc' else 'DESC'

    query = f"""
        SELECT sg.*, COUNT(gm.id) AS member_count
        FROM study_group sg
        LEFT JOIN group_member gm ON sg.id = gm.study_group_id
        WHERE (:start_date IS NULL OR date(sg.meeting_time) >= date(:start_date))
          AND (:end_date IS NULL OR date(sg.meeting_time) <= date(:end_date))
          AND (:category_id IS NULL OR sg.category_id = :category_id)
        GROUP BY sg.id
        HAVING (:min_members IS NULL OR COUNT(gm.id) >= :min_members)
        ORDER BY sg.meeting_time {sort_sql}
    """

    result = db.session.execute(text(query), {
        'start_date': start_date,
        'end_date': end_date,
        'category_id': category_id,
        'min_members': min_members
    })

    groups = [{
        'id': row.id,
        'subject': row.subject,
        'description': row.description,
        'meeting_time': row.meeting_time,
        'location': row.location,
        'category_id': row.category_id,
        'organizer_id': row.organizer_id,
        'member_count': row.member_count,
        'max_members': row.max_members
    } for row in result]

    return jsonify(groups)

@app.route('/api/study-groups/<int:group_id>/join', methods=['POST'])
def join_study_group(group_id):
    data = request.json
    user_id = data.get('user_id')
    group = StudyGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404

    member_count = GroupMember.query.filter_by(study_group_id=group_id).count()
    if group.max_members is not None and member_count >= group.max_members:
        return jsonify({'error': 'This group is full.'}), 403

    existing = GroupMember.query.filter_by(user_id=user_id, study_group_id=group_id).first()
    if existing:
        return jsonify({'message': 'Already joined'}), 200

    try:
        new_member = GroupMember(user_id=user_id, study_group_id=group_id, status="Joined")
        db.session.add(new_member)
        db.session.commit()
        return jsonify({'message': 'Joined successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        print("Available routes:")
        for rule in app.url_map.iter_rules():
            print(rule)
    app.run(debug=True)
