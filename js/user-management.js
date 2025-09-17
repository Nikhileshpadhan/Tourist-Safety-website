// js/user-management.js
import { supabase } from './supabase.js';
import { logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    document.getElementById('inviteForm').addEventListener('submit', inviteUser);
    document.getElementById('logout').addEventListener('click', logout);
});

async function loadUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('Error loading users:', error);
        return;
    }
    renderUserTable(data);
}

function renderUserTable(users) {
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        // "Edit Role" button has been removed from this section
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
                <button class="delete-user-btn" data-id="${user.id}">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Add event listener for the delete button
document.querySelector('#userTable tbody').addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-user-btn')) {
        const userId = event.target.dataset.id;
        deleteUser(userId);
    }
});

async function inviteUser(event) {
    event.preventDefault();
    const email = document.getElementById('inviteEmail').value;
    const role = document.getElementById('inviteRole').value;
    const inviteMessage = document.getElementById('inviteMessage');

    const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role },
    });

    if (error) {
        inviteMessage.innerText = `Error: ${error.message}`;
    } else {
        inviteMessage.innerText = `Successfully sent invitation to ${email}.`;
        loadUsers(); // Refresh the table
    }
    event.target.reset();
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to permanently delete this user?')) {
        const { error } = await supabase.functions.invoke('delete-user', {
            body: { userId },
        });
        if (error) {
            alert(`Error deleting user: ${error.message}`);
        } else {
            alert('User deleted successfully.');
            loadUsers();
        }
    }
}