// js/dashboard.js
import { supabase } from './supabase.js';
import { logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadRecentSOS();
    loadActiveUsers();
    setupRealtime();
    document.getElementById('logout').addEventListener('click', logout);
});

async function loadStats() {
    try {
        // Active SOS Alerts
        const { count: activeSos } = await supabase
            .from('sos_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'triggered');
        document.getElementById('activeSosCount').innerText = activeSos || 0;

        // **FIXED**: Tourists Online (users active in the last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count: touristsOnline } = await supabase
            .from('live_locations')
            .select('user_id', { count: 'exact', head: true })
            .gte('last_update', tenMinutesAgo);
        document.getElementById('touristsOnlineCount').innerText = touristsOnline || 0;

        // Anomalies Detected
        const { count: anomalies } = await supabase
            .from('anomalies')
            .select('*', { count: 'exact', head: true });
        document.getElementById('anomaliesCount').innerText = anomalies || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentSOS() {
    const { data, error } = await supabase
        .from('sos_alerts')
        .select('id, user_id, location, time, status')
        .order('time', { ascending: false })
        .limit(5);

    if (error) return console.error('Error loading recent SOS:', error);
    renderRecentSOSTable(data);
}

function renderRecentSOSTable(alerts) {
    const tbody = document.querySelector('#sosTable tbody');
    tbody.innerHTML = '';
    alerts.forEach(alert => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${alert.user_id.substring(0, 8)}...</td>
            <td>${alert.location}</td>
            <td>${new Date(alert.time).toLocaleString()}</td>
            <td><span class="status-${alert.status}">${alert.status}</span></td>
            <td><button class="view-map-btn" data-location="${alert.location}">View on Map</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Event listener for the "View on Map" button
document.querySelector('#sosTable tbody').addEventListener('click', (event) => {
    if (event.target.classList.contains('view-map-btn')) {
        const location = event.target.dataset.location;
        window.location.href = `live-tracking.html?location=${location}`;
    }
});




// Load active users' locations from last 10 minutes
async function loadActiveUsers() {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('live_locations')
            .select('user_id, lat, lon, last_update')
            .gte('last_update', tenMinutesAgo)
            .order('last_update', { ascending: false });

        if (error) throw error;
        renderActiveUsersTable(data);
    } catch (error) {
        console.error('Error loading active users:', error);
    }
}

function renderActiveUsersTable(users) {
    const tbody = document.querySelector('#activeUsersTable tbody');
    tbody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.lat.toFixed(6)}, ${user.lon.toFixed(6)}</td>
            <td>${new Date(user.last_update).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// **FIXED**: Setup Supabase Realtime for multiple channels
function setupRealtime() {
    // For SOS alerts
    supabase
        .channel('sos_alerts_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, (payload) => {
            console.log('SOS Realtime change received:', payload);

            loadStats();
            loadRecentSOS();

            // Show a notification only for new alerts
            if (payload.eventType === 'INSERT') {
                new Notification('New SOS Alert!', { body: `An alert was triggered at ${payload.new.location}` });
            }
        })
        .subscribe();

    // For live locations (to update active users list)
    supabase
        .channel('live_locations_dashboard_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
            console.log('Location change received - updating dashboard');
            loadStats(); // Update count
            loadActiveUsers(); // Update active users list
        })
        .subscribe();
}
