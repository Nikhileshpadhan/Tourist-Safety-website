import { supabase } from './supabase.js';

// Initialize authentication on load
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await signIn(email, password);
        });
    }

    // On other pages, check auth if not login page
    if (!window.location.pathname.includes('index.html')) {
        checkAuth();
    }
});

// Sign in user with Supabase Auth
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // After sign in, get user role
        const role = await getUserRole(data.user.id);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', data.user.id);

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        document.getElementById('message').innerText = `Login failed: ${error.message}`;
    }
}

// Get user role from public.users table
async function getUserRole(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data.role;
}

// Check if user is authenticated on page load
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    } else {
        // Check role for specific pages
        const role = localStorage.getItem('userRole');
        if (!role) {
            logout();
        }

        // Restrict access for Viewer and Officer on user management
        if (window.location.pathname.includes('user-management.html') && role !== 'Admin') {
            alert('Access denied. Admin role required.');
            window.location.href = 'dashboard.html';
        }
    }
}

// Logout function (to be called from pages)
export async function logout() {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = 'index.html';
}

// Export functions if needed elsewhere
export { getUserRole, checkAuth };
