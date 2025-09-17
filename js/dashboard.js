// js/dashboard.js
import { supabase } from './supabase.js';
import { logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadRecentSOS();
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




// **FIXED**: Setup Supabase Realtime to listen for INSERT and UPDATE
function setupRealtime() {
    supabase
        .channel('sos_alerts_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, (payload) => {
            console.log('Realtime change received:', payload);
            
            // On any change, just reload all the data to keep it simple and consistent
            loadStats();
            loadRecentSOS();

            // Show a notification only for new alerts
            if (payload.eventType === 'INSERT') {
                new Notification('New SOS Alert!', { body: `An alert was triggered at ${payload.new.location}` });
            }
        })
        .subscribe();
}
