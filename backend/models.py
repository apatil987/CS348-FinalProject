from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    major = db.Column(db.String(100), nullable=True)

class StudyGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    meeting_time = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True) 
    organizer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    max_members = db.Column(db.Integer, nullable=True)
    category = db.relationship('Category', backref='study_groups') 


class GroupMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    study_group_id = db.Column(db.Integer, db.ForeignKey('study_group.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # "Joined", "Interested"

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
