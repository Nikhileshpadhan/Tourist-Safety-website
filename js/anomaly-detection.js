import { supabase } from './supabase.js';
import { logout } from './auth.js';

// Initialize anomaly detection page
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadAnomalies();
    loadHeatmap();
    startAnomalyDetection();
    document.getElementById('logout').addEventListener('click', logout);
});

// Initialize Leaflet map for prediction
let map;
function initializeMap() {
    map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    loadHeatmap();
}

// Load and display anomalies list
async function loadAnomalies() {
    try {
        const { data, error } = await supabase
            .from('anomalies')
            .select('*')
            .order('time', { ascending: false });

        if (error) throw error;

        const anomalyList = document.getElementById('anomalyList');
        anomalyList.innerHTML = '';

        data.forEach(anomaly => {
            const listItem = document.createElement('li');
            listItem.innerText = `${anomaly.description} at ${anomaly.location} on ${new Date(anomaly.time).toLocaleString()}`;
            anomalyList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading anomalies:', error);
    }
}

// Generate predictive heatmap from SOS alerts and anomalies
async function loadHeatmap() {
    try {
        const { data: alerts, error: alertError } = await supabase
            .from('sos_alerts')
            .select('location');

        if (alertError) throw alertError;

        const { data: anomalies, error: anomalyError } = await supabase
            .from('anomalies')
            .select('location');

        if (anomalyError) throw anomalyError;

        const heatPoints = [];

        // Add SOS locations with intensity 0.5
        alerts.forEach(alert => {
            const [lat, lon] = alert.location.split(',').map(Number);
            if (lat && lon) heatPoints.push([lat, lon, 0.5]);
        });

        // Add anomaly locations with higher intensity 1.0
        anomalies.forEach(anomaly => {
            const [lat, lon] = anomaly.location.split(',').map(Number);
            if (lat && lon) heatPoints.push([lat, lon, 1.0]);
        });

        // Add heatmap layer
        L.heatLayer(heatPoints, {
            radius: 15,
            blur: 25,
            maxZoom: 17,
            gradient: { 0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 1: 'red' }
        }).addTo(map);
    } catch (error) {
        console.error('Error loading heatmap:', error);
    }
}

// Start periodic anomaly detection
function startAnomalyDetection() {
    // Run immediately, then every 5 minutes
    detectAnomalies();
    setInterval(detectAnomalies, 300000);
}

// Function to detect anomalies
async function detectAnomalies() {
    try {
        // Get SOS alerts from last 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

        const { data: alerts, error } = await supabase
            .from('sos_alerts')
            .select('location, time')
            .gte('time', thirtyMinutesAgo);

        if (error) throw error;

        const anomalyLocations = new Set();

        alerts.forEach(alert => {
            const [lat, lon] = alert.location.split(',').map(Number);
            if (lat && lon) {
                let count = 0;
                alerts.forEach(other => {
                    const [otherLat, otherLon] = other.location.split(',').map(Number);
                    if (calculateDistance(lat, lon, otherLat, otherLon) <= 1.0) {
                        count++;
                    }
                });
                if (count > 3) {
                    anomalyLocations.add(alert.location);
                }
            }
        });

        // Insert new anomalies
        for (const location of anomalyLocations) {
            const description = 'Multiple SOS alerts detected in close proximity';
            const time = new Date().toISOString();

            const { error: insertError } = await supabase
                .from('anomalies')
                .insert({ description, location, time });

            if (insertError) {
                console.error('Error inserting anomaly:', insertError);
            }
        }

        // Reload anomalies and heatmap
        if (anomalyLocations.size > 0) {
            loadAnomalies();
            loadHeatmap();
        }
    } catch (error) {
        console.error('Error detecting anomalies:', error);
    }
}

// Haversine formula to calculate distance in km between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
