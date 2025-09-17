import { supabase } from './supabase.js';
import { logout } from './auth.js';

// Map and markers
let map;
const markers = new Map(); // user_id -> marker

// Initialize live tracking
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadLocations();
    setupRealtime();
    document.getElementById('logout').addEventListener('click', logout);

    // Periodic refresh every 10 seconds
    setInterval(loadLocations, 10000);

    // Check URL for location to center on
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get('location');
    if (location) {
        const [lat, lon] = location.split(',').map(Number);
        map.setView([lat, lon], 15);
    }
});

// Initialize full-screen Leaflet map
function initializeMap() {
    map = L.map('map').setView([51.505, -0.09], 13); // Default view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Make map full viewport
    document.getElementById('map').style.height = '100vh';
}

// Load all current live locations
async function loadLocations() {
    try {
        const { data, error } = await supabase
            .from('live_locations')
            .select('user_id, lat, lon, last_update');

        if (error) throw error;

        clearMarkers();
        data.forEach(location => {
            addMarker(location);
        });

        if (data.length > 0) {
            map.fitBounds(Array.from(markers.values()).map(m => m.getLatLng()));
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Add marker for location
function addMarker(location) {
    const marker = L.marker([location.lat, location.lon])
        .addTo(map)
        .bindPopup(`User ID: ${location.user_id}<br>Last Seen: ${new Date(location.last_update).toLocaleString()}`);
    markers.set(location.user_id, marker);
}

// Clear all markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers.clear();
}

// Setup Supabase Realtime for live locations
function setupRealtime() {
    supabase
        .channel('live_locations_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
            // On any change, reload all locations (simplified)
            loadLocations();
        })
        .subscribe();
}
