import { supabase } from './supabase.js';
import { logout } from './auth.js';

// Pagination variables
let currentPage = 1;
const perPage = 20;
let currentFilter = 'all';
const userRole = localStorage.getItem('userRole');

// Initialize SOS alerts page
document.addEventListener('DOMContentLoaded', () => {
    loadSOSAlerts();
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        loadSOSAlerts();
    });
    document.getElementById('prevBtn').addEventListener('click', prevPage);
    document.getElementById('nextBtn').addEventListener('click', nextPage);
    document.getElementById('logout').addEventListener('click', logout);
});

// Load SOS alerts with filters and pagination
async function loadSOSAlerts() {
    try {
        let query = supabase
            .from('sos_alerts')
            .select('*')
            .order('time', { ascending: false })
            .range((currentPage - 1) * perPage, currentPage * perPage - 1);

        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        renderTable(data, count);

        // Update pagination buttons
        document.getElementById('prevBtn').disabled = currentPage === 1;
        document.getElementById('nextBtn').disabled = data.length < perPage;
        document.getElementById('pageInfo').innerText = `Page ${currentPage}`;
    } catch (error) {
        console.error('Error loading SOS alerts:', error);
    }
}

// Render table rows
function renderTable(alerts, totalCount) {
    const tbody = document.querySelector('#sosTable tbody');
    tbody.innerHTML = '';

    alerts.forEach(alert => {
        const actions = `
            <button onclick="viewOnMap('${alert.location}')">View on Map</button>
            ${alert.status === 'triggered' && (userRole === 'Admin' || userRole === 'Officer') ?
                `<button onclick="resolveAlert(${alert.id})">Resolve</button>` : ''}
        `;
        const row = `
            <tr>
                <td>${alert.user_id}</td>
                <td>${alert.location}</td>
                <td>${new Date(alert.time).toLocaleString()}</td>
                <td>${alert.status}</td>
                <td>${actions}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadSOSAlerts();
    }
}

function nextPage() {
    // If next button was enabled, load next page
    currentPage++;
    loadSOSAlerts();
}

// Resolve alert
async function resolveAlert(id) {
    try {
        const { error } = await supabase
            .from('sos_alerts')
            .update({ status: 'resolved' })
            .eq('id', id);

        if (error) throw error;
        loadSOSAlerts(); // Reload table
    } catch (error) {
        console.error('Error resolving alert:', error);
    }
}

// View on map (go to live-tracking)
function viewOnMap(location) {
    window.location.href = `live-tracking.html?location=${location}`;
}
