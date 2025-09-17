import { supabase } from './supabase.js';
import { logout } from './auth.js';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadRecentSOS();
    initializeMap();
    setupRealtime();
    document.getElementById('logout').addEventListener('click', logout);
});

// Load dashboard statistics
async function loadStats() {
    try {
        // Active SOS Alerts (status = 'triggered')
        const { count: activeSos } = await supabase
            .from('sos_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'triggered');
        document.getElementById('activeSosCount').innerText = activeSos || 0;

        // Tourists Online (distinct user_id from live_locations)
        const { count: touristsOnline } = await supabase
            .from('live_locations')
            .select('user_id', { count: 'exact', head: true });
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

// Load recent 5 SOS alerts
async function loadRecentSOS() {
    try {
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('id, location, time, status')
            .order('time', { ascending: false })
            .limit(5);

        if (error) throw error;

        const tbody = document.querySelector('#sosTable tbody');
        tbody.innerHTML = '';
        data.forEach(alert => {
            const row = `
                <tr>
                    <td>${alert.id}</td>
                    <td>${alert.location}</td>
                    <td>${new Date(alert.time).toLocaleString()}</td>
                    <td>${alert.status}</td>
                    <td><button onclick="viewOnMap('${alert.location}')">View on Map</button></td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error loading recent SOS:', error);
    }
}

// Initialize Leaflet map with hotspots
let map;
function initializeMap() {
    map = L.map('map').setView([51.505, -0.09], 13); // Default view, update to relevant location
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    loadHotspots();
}

// Load SOS locations as markers on map
async function loadHotspots() {
    try {
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('location');

        if (error) throw error;

        const markerGroup = L.layerGroup();

        data.forEach(alert => {
            const [lat, lon] = alert.location.split(',').map(Number);
            if (lat && lon) {
                L.marker([lat, lon]).addTo(markerGroup);
            }
        });

        markerGroup.addTo(map);
        map.fitBounds(markerGroup.getBounds());
    } catch (error) {
        console.error('Error loading hotspots:', error);
    }
}

// Setup Supabase Realtime for notifications
function setupRealtime() {
    supabase
        .channel('sos_alerts_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' }, (payload) => {
            // Show browser notification
            if (Notification.permission === 'granted') {
                new Notification('New SOS Alert Triggered!', { body: `Location: ${payload.new.location}` });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('New SOS Alert Triggered!', { body: `Location: ${payload.new.location}` });
                    }
                });
            }

            // Refresh data
            loadStats();
            loadRecentSOS();
            loadHotspots(); // Update map if new alert
        })
        .subscribe();
}

// Function to view alert on map (placeholder, integrate with live-tracking)
function viewOnMap(location) {
    // Open live-tracking with centered location
    window.location.href = `live-tracking.html?location=${location}`;
}
