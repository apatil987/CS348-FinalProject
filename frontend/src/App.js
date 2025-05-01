import React, { useEffect, useState } from 'react';
import {
  joinStudyGroup,
  getStudyGroups,
  createStudyGroup,
  deleteStudyGroup,
  updateStudyGroup,
  getCategories,
  getReport
} from './services/api';

function App() {
  const [studyGroups, setStudyGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(1);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [showJoined, setShowJoined] = useState(false);
  const [newGroup, setNewGroup] = useState({ subject: '', meeting_time: '', location: '', organizer_id: 1, max_members: '' });
  const [editingGroup, setEditingGroup] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({ start_date: '', end_date: '', category_id: '', min_members: '', sort_order: 'asc' });
  const [categories, setCategories] = useState([]);
  const [detectedCategory, setDetectedCategory] = useState('');
  const [categorySummary, setCategorySummary] = useState([]);

  useEffect(() => {
    fetchGroups();
    fetchCategories();
    fetchCategorySummary();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    const data = await getStudyGroups();
    setStudyGroups(data);
  };

  const fetchCategories = async () => {
    const data = await getCategories();
    setCategories(data);
  };

  const fetchCategorySummary = async () => {
    const res = await fetch('http://localhost:5000/api/categories/summary');
    const data = await res.json();
    setCategorySummary(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('http://localhost:5000/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const fetchJoinedGroups = async () => {
    const res = await fetch(`http://localhost:5000/api/users/${selectedUser}/joined-groups`);
    const data = await res.json();
    setJoinedGroups(data);
    setShowJoined(true);
  };

  const handleCreateGroup = async () => {
    const matched = categories.find(c => c.name === detectedCategory);
    const payload = {
      ...newGroup,
      category_id: matched ? matched.id : null
    };

    await createStudyGroup(payload);
    fetchGroups();
    fetchCategorySummary();
    resetForm();
  };

  const handleDeleteGroup = async (id) => {
    await deleteStudyGroup(id);
    fetchGroups();
    fetchCategorySummary();
  };

  const handleEditClick = (group) => {
    const formattedTime = new Date(group.meeting_time).toISOString().slice(0, 16);
    setEditingGroup(group);
    setNewGroup({
      subject: group.subject,
      meeting_time: formattedTime,
      location: group.location,
      organizer_id: group.organizer_id,
      category_id: group.category_id,
      max_members: group.max_members || ''
    });
  };

  const handleUpdateGroup = async () => {
    if (editingGroup) {
      const updatedGroup = {
        subject: newGroup.subject,
        location: newGroup.location,
        organizer_id: newGroup.organizer_id,
        meeting_time: newGroup.meeting_time || editingGroup.meeting_time,
        category_id: editingGroup.category_id || null,
        max_members: newGroup.max_members || null
      };

      await updateStudyGroup(editingGroup.id, updatedGroup);
      setEditingGroup(null);
      fetchGroups();
      fetchCategorySummary();
      resetForm();
    }
  };

  const resetForm = () => {
    setNewGroup({ subject: '', meeting_time: '', location: '', organizer_id: 1, max_members: '' });
    setDetectedCategory('');
  };

  const handleReportSubmit = async () => {
    const filters = {
      ...reportFilters,
      min_members: reportFilters.min_members === '' ? null : parseInt(reportFilters.min_members)
    };
    const result = await getReport(filters);
    setReportData(result);
  };

  const handleJoinGroup = async (group) => {
    if (group.max_members && group.member_count >= group.max_members) {
      alert("This group is full.");
      return;
    }
    const res = await joinStudyGroup(group.id, selectedUser);
    alert(res.message);
    fetchGroups();
    fetchCategorySummary();
  };

  const handleClearFilters = () => {
    setReportFilters({ start_date: '', end_date: '', category_id: '', min_members: '', sort_order: 'asc' });
    setReportData([]);
  };

  const detectCategory = (subject) => {
    const keywords = {
      "Math": ["MA", "MATH", "CALC", "STAT"],
      "English": ["ENGL", "COM", "WRIT", "SCLA"],
      "Science": ["PHYS", "CHEM", "BIO", "SCI", "OCHEM", "NUTR"],
      "Computer Science": ["CS", "CNIT", "INFO"],
      "Engineering": ["ENGR", "ECE", "ME", "CE"]
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (subject.toUpperCase().includes(word)) {
          setDetectedCategory(category);
          return;
        }
      }
    }
    setDetectedCategory('');
  };

  return (
    <div>
      <h1>Online Study Group Finder</h1>

      <div>
        <input type="text" placeholder="Subject" value={newGroup.subject} onChange={e => {
          const subject = e.target.value;
          setNewGroup({ ...newGroup, subject });
          detectCategory(subject);
        }} />

        <input type="datetime-local" value={newGroup.meeting_time} onChange={e => setNewGroup({ ...newGroup, meeting_time: e.target.value })} />

        <input type="text" placeholder="Location" value={newGroup.location} onChange={e => setNewGroup({ ...newGroup, location: e.target.value })} />

        <input type="number" placeholder="Max Members" value={newGroup.max_members} onChange={e => setNewGroup({ ...newGroup, max_members: e.target.value })} />

        <button onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}>
          {editingGroup ? "Update Study Group" : "Create Study Group"}
        </button>

        {editingGroup && <button onClick={() => { setEditingGroup(null); resetForm(); }}>Cancel</button>}

        {detectedCategory && <p>Detected Category: {detectedCategory}</p>}
      </div>

      <h3>Join As:</h3>
      <select value={selectedUser} onChange={e => {
        setSelectedUser(parseInt(e.target.value));
        setJoinedGroups([]);
        setShowJoined(false);
      }}>
        {users.map(user => (
          <option key={user.id} value={user.id}>{user.name}</option>
        ))}
      </select>

      <ul>
        {studyGroups.map(group => (
          <li key={group.id}>
            {group.subject} - {group.location} | Meeting: {new Date(group.meeting_time).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })} | Members: {group.member_count}/{group.max_members ?? '∞'} | Category: {group.category || "Uncategorized"}
            <button onClick={() => handleEditClick(group)}>Edit</button>
            <button onClick={() => handleDeleteGroup(group.id)}>Delete</button>
            <button onClick={() => handleJoinGroup(group)}>Join</button>
          </li>
        ))}
      </ul>

      <hr />
      <h2>Category Summary</h2>
      <ul>
        {categorySummary.map(item => (
          <li key={item.category}>{item.category}: {item.count} groups</li>
        ))}
      </ul>

      <hr />
      <h2>Study Group Report</h2>
      <div>
        <label>Start Date: </label>
        <input type="date" value={reportFilters.start_date} onChange={e => setReportFilters({ ...reportFilters, start_date: e.target.value })} />
        <label>End Date: </label>
        <input type="date" value={reportFilters.end_date} onChange={e => setReportFilters({ ...reportFilters, end_date: e.target.value })} />
        <label>Category: </label>
        <select value={reportFilters.category_id} onChange={e => setReportFilters({ ...reportFilters, category_id: e.target.value || '' })}>
          <option value="">All</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <label>Minimum Members: </label>
        <input type="number" value={reportFilters.min_members || ''} onChange={e => setReportFilters({ ...reportFilters, min_members: e.target.value })} />
        <label>Sort by Date:</label>
        <select value={reportFilters.sort_order} onChange={e => setReportFilters({ ...reportFilters, sort_order: e.target.value })}>
          <option value="asc">Oldest First</option>
          <option value="desc">Newest First</option>
        </select>

        <button onClick={handleReportSubmit}>Generate Report</button>
        <button onClick={handleClearFilters}>Clear Filters</button>
      </div>

      <h3>Report Results</h3>
      <p>Total Groups: {reportData.length}</p>
      <ul>
        {reportData.map(group => (
          <li key={group.id}>
            {group.subject} — {group.location} | {new Date(group.meeting_time).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })} | Members: {group.member_count}/{group.max_members ?? '∞'}
          </li>
        ))}
      </ul>

      <hr />
      <h2>Joined Study Groups for User {selectedUser}</h2>
      <button onClick={fetchJoinedGroups}>Show My Groups</button>
      <button onClick={() => setShowJoined(false)}>Hide</button>
      {showJoined && (
        <ul>
          {joinedGroups.map(group => (
            <li key={group.id}>
              {group.subject} — {group.location} | {new Date(group.meeting_time).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })} | Max Members: {group.max_members ?? '∞'} | Category: {group.category || "Uncategorized"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
