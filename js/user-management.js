import { supabase } from './supabase.js';
import { logout } from './auth.js';

// Initialize user management
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    document.getElementById('inviteForm').addEventListener('submit', inviteUser);
    document.getElementById('logout').addEventListener('click', logout);
});

// Load all users
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;

        renderUserTable(data);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Render user table
function renderUserTable(users) {
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
                <button onclick="editRole('${user.id}', '${user.role}')">Edit Role</button>
                <button onclick="deleteUser('${user.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Edit user role
function editRole(userId, currentRole) {
    // Prompt for new role
    const newRole = prompt('Enter new role (Admin, Officer, Viewer):', currentRole);
    if (newRole && ['Admin', 'Officer', 'Viewer'].includes(newRole)) {
        updateUserRole(userId, newRole);
    }
}

// Update user role in database
async function updateUserRole(userId, role) {
    try {
        const { error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', userId);

        if (error) throw error;
        loadUsers(); // Refresh table
    } catch (error) {
        console.error('Error updating role:', error);
    }
}

// Delete user
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            // Only delete from users table, as admin functions need server-side
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            loadUsers(); // Refresh table
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}

// Invite new user (placeholder)
function inviteUser(event) {
    event.preventDefault();
    const email = document.getElementById('inviteEmail').value;
    const role = document.getElementById('inviteRole').value;

    // Placeholder: in real app, use Supabase admin invite or send email
    document.getElementById('inviteMessage').innerText = `Invitation sent to ${email} with role ${role}. (Note: This is a placeholder. Implement actual invite logic with server-side code.)`;

    // Reset form
    event.target.reset();
}
