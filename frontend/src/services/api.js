const API_URL = 'http://127.0.0.1:5000/api/study-groups';

export const getStudyGroups = async () => {
    const response = await fetch(API_URL);
    return response.json();
};

export const createStudyGroup = async (groupData) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
    });
    return response.json();
};

export const deleteStudyGroup = async (id) => {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    return response.json();
};

export const updateStudyGroup = async (id, updatedData) => {
    const response = await fetch(`http://127.0.0.1:5000/api/study-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
    });
    return response.json();
};

export const getCategories = async () => {
    const response = await fetch('http://127.0.0.1:5000/api/categories');
    return response.json();
};

export const getReport = async (filters) => {
    const response = await fetch('http://127.0.0.1:5000/api/study-groups/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
    });
    return response.json();
};

export const joinStudyGroup = async (groupId, userId) => {
    const response = await fetch(`http://127.0.0.1:5000/api/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    });
    return response.json();
};
