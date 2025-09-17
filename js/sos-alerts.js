// js/sos-alerts.js
import { supabase } from './supabase.js';
import { logout } from './auth.js';

let currentPage = 1;
const perPage = 10;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadSOSAlerts();
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        loadSOSAlerts();
    });
    document.getElementById('prevBtn').addEventListener('click', () => { currentPage--; loadSOSAlerts(); });
    document.getElementById('nextBtn').addEventListener('click', () => { currentPage++; loadSOSAlerts(); });
    document.getElementById('logout').addEventListener('click', logout);
});

async function loadSOSAlerts() {
    const from = (currentPage - 1) * perPage;
    let query = supabase.from('sos_alerts').select('*', { count: 'exact' }).order('time', { ascending: false }).range(from, from + perPage - 1);
    if (currentFilter !== 'all') {
        query = query.eq('status', currentFilter);
    }
    const { data, error, count } = await query;
    if (error) return console.error('Error loading SOS alerts:', error);
    renderTable(data, count);
}

function renderTable(alerts, totalCount) {
    const userRole = localStorage.getItem('userRole'); // Get role for conditional rendering
    const tbody = document.querySelector('#sosTable tbody');
    tbody.innerHTML = '';

    alerts.forEach(alert => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${alert.user_id.substring(0, 8)}...</td>
            <td>${alert.location}</td>
            <td>${new Date(alert.time).toLocaleString()}</td>
            <td><span class="status-${alert.status}">${alert.status}</span></td>
            <td>
                <button class="view-map-btn" data-location="${alert.location}">View Map</button>
                ${alert.status === 'triggered' && (userRole === 'Admin' || userRole === 'Officer') ?
                    `<button class="resolve-btn" data-id="${alert.id}">Resolve</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    updatePagination(alerts.length, totalCount);
}

document.querySelector('#sosTable tbody').addEventListener('click', async (event) => {
    if (event.target.classList.contains('resolve-btn')) {
        const id = event.target.dataset.id;
        await supabase.from('sos_alerts').update({ status: 'resolved' }).eq('id', id);
        loadSOSAlerts(); // Refresh the table
    }
    if (event.target.classList.contains('view-map-btn')) {
        const location = event.target.dataset.location;
        window.location.href = `live-tracking.html?location=${location}`;
    }
});

function updatePagination(fetchedCount, totalCount) {
    const totalPages = Math.ceil(totalCount / perPage);
    document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}