// ==========================================
// NUMIDIUM / VANTAGE - Frontend Application
// ==========================================

// API Configuration
const API_BASE = 'https://madras1-numidium.hf.space/api/v1';

// ==========================================
// Canvas Background Animation
// ==========================================

const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let nodes = [];

const CONFIG = {
    nodeCount: 80,
    connectionDistance: 150,
    mouseDistance: 200,
    nodeSpeed: 0.3,
    colors: {
        node: 'rgba(235, 241, 245, 0.5)',
        line: 'rgba(38, 197, 237, 0.15)',
        highlight: 'rgba(38, 197, 237, 0.4)'
    }
};

let mouse = { x: null, y: null };

window.addEventListener('resize', function () {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initCanvas();
});

window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseout', function () {
    mouse.x = null;
    mouse.y = null;
});

class Node {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * CONFIG.nodeSpeed;
        this.vy = (Math.random() - 0.5) * CONFIG.nodeSpeed;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.colors.node;
        ctx.fill();
    }
}

function initCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    nodes = [];
    const count = (width * height) / 15000;
    for (let i = 0; i < count; i++) {
        nodes.push(new Node());
    }
}

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, width, height);

    nodes.forEach(node => {
        node.update();
        node.draw();
    });

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.connectionDistance) {
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);

                let opacity = 1 - (distance / CONFIG.connectionDistance);
                ctx.strokeStyle = CONFIG.colors.line.replace('0.15)', `${opacity * 0.15})`);

                if (mouse.x) {
                    const mouseDx = mouse.x - nodes[i].x;
                    const mouseDy = mouse.y - nodes[i].y;
                    const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

                    if (mouseDist < CONFIG.mouseDistance) {
                        ctx.strokeStyle = CONFIG.colors.highlight.replace('0.4)', `${opacity * 0.4})`);
                        ctx.lineWidth = 1;
                    } else {
                        ctx.lineWidth = 0.5;
                    }
                }
                ctx.stroke();
            }
        }
    }
}

initCanvas();
animate();

// ==========================================
// API Functions
// ==========================================

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error: ${endpoint}`, error);
        throw error;
    }
}

// ==========================================
// Navigation
// ==========================================

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.target.dataset.view;
        switchView(view);
    });
});

function switchView(viewName) {
    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Load view data
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'entities':
            loadEntities();
            break;
        case 'ingest':
            loadNewsFeeds();
            break;
    }
}

// ==========================================
// Dashboard
// ==========================================

async function loadDashboard() {
    try {
        const stats = await apiRequest('/search/stats');

        document.getElementById('stat-entities').textContent = stats.total_entities;
        document.getElementById('stat-relationships').textContent = stats.total_relationships;
        document.getElementById('stat-events').textContent = stats.total_events;
        document.getElementById('stat-documents').textContent = stats.total_documents;

        // Update bars (max 100)
        const maxVal = Math.max(stats.total_entities, stats.total_relationships, stats.total_events, stats.total_documents, 1);
        document.getElementById('fill-entities').style.width = `${(stats.total_entities / maxVal) * 100}%`;
        document.getElementById('fill-relationships').style.width = `${(stats.total_relationships / maxVal) * 100}%`;
        document.getElementById('fill-events').style.width = `${(stats.total_events / maxVal) * 100}%`;
        document.getElementById('fill-documents').style.width = `${(stats.total_documents / maxVal) * 100}%`;

        // Recent activity
        const activityHtml = stats.recent_activity.length > 0
            ? stats.recent_activity.map(item => `
                <div class="activity-item" onclick="showEntityDetail('${item.id}')">
                    <span class="activity-type ${item.type}">${item.type.toUpperCase()}</span>
                    <span class="activity-name">${item.name}</span>
                    <span class="activity-time">${formatDate(item.created_at)}</span>
                </div>
            `).join('')
            : '<p class="empty-text">Nenhuma atividade recente. Comece importando dados!</p>';

        document.getElementById('activity-list').innerHTML = activityHtml;

    } catch (error) {
        console.error('Failed to load dashboard', error);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ==========================================
// Entities
// ==========================================

let searchTimeout;

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadEntities, 300);
}

async function loadEntities() {
    const type = document.getElementById('entity-type-filter').value;
    const search = document.getElementById('entity-search').value;

    let endpoint = '/entities?limit=50';
    if (type) endpoint += `&type=${type}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;

    try {
        const entities = await apiRequest(endpoint);

        if (!entities || entities.length === 0) {
            document.getElementById('entities-list').innerHTML =
                '<p class="empty-text">Nenhuma entidade encontrada. Importe dados do Wikipedia ou adicione manualmente.</p>';
            return;
        }

        const html = entities.map(e => `
            <div class="entity-card" onclick="showEntityDetail('${e.id}')">
                <div class="entity-type ${e.type}">${getTypeIcon(e.type)}</div>
                <div class="entity-info">
                    <h3>${e.name}</h3>
                    <p>${e.description ? e.description.substring(0, 100) + '...' : 'Sem descrição'}</p>
                    <span class="entity-source">${e.source || 'manual'}</span>
                </div>
            </div>
        `).join('');

        document.getElementById('entities-list').innerHTML = html;

    } catch (error) {
        console.error('Error loading entities:', error);
        document.getElementById('entities-list').innerHTML =
            '<p class="empty-text">Nenhuma entidade encontrada. Importe dados do Wikipedia ou adicione manualmente.</p>';
    }
}

function getTypeIcon(type) {
    const icons = {
        person: '👤',
        organization: '🏢',
        location: '📍',
        event: '📅',
        unknown: '❓'
    };
    return icons[type] || icons.unknown;
}

function showAddEntityModal() {
    // Switch to ingest view with manual tab
    switchView('ingest');
    switchIngestTab('manual');
}

async function showEntityDetail(id) {
    try {
        const entity = await apiRequest(`/entities/${id}`);
        const connections = await apiRequest(`/entities/${id}/connections?depth=1`);

        const modal = document.getElementById('entity-modal');
        const body = document.getElementById('entity-modal-body');

        body.innerHTML = `
            <div class="entity-detail">
                <div class="entity-type-badge ${entity.type}">${getTypeIcon(entity.type)} ${entity.type.toUpperCase()}</div>
                <h2>${entity.name}</h2>
                <p class="entity-description">${entity.description || 'Sem descrição'}</p>
                
                ${entity.source_url ? `<a href="${entity.source_url}" target="_blank" class="source-link">🔗 Ver fonte original</a>` : ''}
                
                ${entity.latitude && entity.longitude ? `
                    <div class="geo-info">
                        <span>📍 ${entity.latitude.toFixed(4)}, ${entity.longitude.toFixed(4)}</span>
                    </div>
                ` : ''}
                
                <div class="connections-section">
                    <h3>Conexões (${connections.nodes.length - 1})</h3>
                    <div class="connections-list">
                        ${connections.nodes.filter(n => n.id !== id).map(n => `
                            <div class="connection-item" onclick="showEntityDetail('${n.id}')">
                                <span class="conn-icon">${getTypeIcon(n.type)}</span>
                                <span>${n.name}</span>
                            </div>
                        `).join('') || '<p class="empty-text">Nenhuma conexão encontrada</p>'}
                    </div>
                </div>
                
                <div class="entity-actions">
                    <button class="btn-secondary" onclick="deleteEntity('${id}')">🗑️ Excluir</button>
                </div>
            </div>
        `;

        modal.classList.add('active');

    } catch (error) {
        console.error('Failed to load entity', error);
    }
}

function closeModal() {
    document.getElementById('entity-modal').classList.remove('active');
}

async function deleteEntity(id) {
    if (!confirm('Tem certeza que deseja excluir esta entidade?')) return;

    try {
        await apiRequest(`/entities/${id}`, { method: 'DELETE' });
        closeModal();
        loadEntities();
        loadDashboard();
    } catch (error) {
        alert('Erro ao excluir entidade');
    }
}

// ==========================================
// Data Ingestion
// ==========================================

function switchIngestTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ingest-panel').forEach(p => p.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`ingest-${tab}`).classList.add('active');
}

// Wikipedia
async function searchWikipedia() {
    const query = document.getElementById('wiki-search').value;
    if (!query) return;

    document.getElementById('wiki-results').innerHTML = '<p class="loading-text">Buscando...</p>';

    try {
        const results = await apiRequest(`/ingest/wikipedia/search?q=${encodeURIComponent(query)}`);

        if (results.length === 0) {
            document.getElementById('wiki-results').innerHTML = '<p class="empty-text">Nenhum resultado encontrado</p>';
            return;
        }

        const html = results.map(r => `
            <div class="result-item">
                <h4>${r.title}</h4>
                <p>${r.snippet}</p>
                <div class="result-actions">
                    <button onclick="importFromWikipedia('${r.title}', 'person')">👤 Pessoa</button>
                    <button onclick="importFromWikipedia('${r.title}', 'organization')">🏢 Org</button>
                    <button onclick="importFromWikipedia('${r.title}', 'location')">📍 Local</button>
                </div>
            </div>
        `).join('');

        document.getElementById('wiki-results').innerHTML = html;

    } catch (error) {
        document.getElementById('wiki-results').innerHTML = '<p class="error-text">Erro ao buscar</p>';
    }
}

async function importFromWikipedia(title, type) {
    try {
        const entity = await apiRequest(`/ingest/wikipedia/entity?title=${encodeURIComponent(title)}&entity_type=${type}`, {
            method: 'POST'
        });

        alert(`✅ "${entity.name}" importado com sucesso!`);
        loadDashboard();

    } catch (error) {
        alert('❌ Erro ao importar');
    }
}

// News
async function loadNewsFeeds() {
    try {
        const feeds = await apiRequest('/ingest/news/feeds');

        const html = feeds.map(f => `
            <button class="feed-btn" onclick="fetchNewsFeed('${f}')">${f.toUpperCase()}</button>
        `).join('');

        document.getElementById('news-feeds-list').innerHTML = html;

    } catch (error) {
        console.error('Failed to load feeds', error);
    }
}

async function fetchNewsFeed(feed) {
    document.getElementById('news-results').innerHTML = '<p class="loading-text">Buscando notícias...</p>';

    try {
        const articles = await apiRequest(`/ingest/news/fetch?feed=${feed}`);

        const html = articles.slice(0, 10).map(a => `
            <div class="news-item">
                <h4>${a.title}</h4>
                <p>${a.description || ''}</p>
                <div class="news-meta">
                    <span>${a.source}</span>
                    <a href="${a.url}" target="_blank">🔗 Ler mais</a>
                </div>
            </div>
        `).join('');

        document.getElementById('news-results').innerHTML = html || '<p class="empty-text">Nenhuma notícia</p>';

    } catch (error) {
        document.getElementById('news-results').innerHTML = '<p class="error-text">Erro ao buscar notícias</p>';
    }
}

async function searchNews() {
    const query = document.getElementById('news-search').value;
    if (!query) return;

    document.getElementById('news-results').innerHTML = '<p class="loading-text">Buscando...</p>';

    try {
        const articles = await apiRequest(`/ingest/news/search?q=${encodeURIComponent(query)}`);

        const html = articles.slice(0, 10).map(a => `
            <div class="news-item">
                <h4>${a.title}</h4>
                <p>${a.description || ''}</p>
                <a href="${a.url}" target="_blank">🔗 Ler mais</a>
            </div>
        `).join('');

        document.getElementById('news-results').innerHTML = html || '<p class="empty-text">Nenhuma notícia</p>';

    } catch (error) {
        document.getElementById('news-results').innerHTML = '<p class="error-text">Erro ao buscar</p>';
    }
}

// Manual Entry
async function createManualEntity(event) {
    event.preventDefault();

    const entity = {
        type: document.getElementById('manual-type').value,
        name: document.getElementById('manual-name').value,
        description: document.getElementById('manual-desc').value,
        source: 'manual'
    };

    const lat = document.getElementById('manual-lat').value;
    const lng = document.getElementById('manual-lng').value;

    if (lat && lng) {
        entity.latitude = parseFloat(lat);
        entity.longitude = parseFloat(lng);
    }

    try {
        await apiRequest('/entities', {
            method: 'POST',
            body: JSON.stringify(entity)
        });

        alert('✅ Entidade criada com sucesso!');
        document.getElementById('manual-entity-form').reset();
        loadDashboard();

    } catch (error) {
        alert('❌ Erro ao criar entidade');
    }
}

// ==========================================
// Global Search
// ==========================================

async function globalSearch() {
    const query = document.getElementById('global-search').value;
    if (!query || query.length < 2) return;

    document.getElementById('search-results').innerHTML = '<p class="loading-text">Buscando...</p>';

    try {
        const results = await apiRequest(`/search?q=${encodeURIComponent(query)}`);

        let html = '';

        if (results.entities.length > 0) {
            html += '<h3>Entidades</h3><div class="search-section">';
            html += results.entities.map(e => `
                <div class="search-result-item" onclick="showEntityDetail('${e.id}')">
                    <span class="result-icon">${getTypeIcon(e.type)}</span>
                    <div>
                        <strong>${e.name}</strong>
                        <p>${e.description?.substring(0, 80) || ''}...</p>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        if (results.events.length > 0) {
            html += '<h3>Eventos</h3><div class="search-section">';
            html += results.events.map(e => `
                <div class="search-result-item">
                    <span class="result-icon">📅</span>
                    <div>
                        <strong>${e.title}</strong>
                        <p>${e.description?.substring(0, 80) || ''}...</p>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        if (results.documents.length > 0) {
            html += '<h3>Documentos</h3><div class="search-section">';
            html += results.documents.map(d => `
                <div class="search-result-item">
                    <span class="result-icon">📄</span>
                    <div>
                        <strong>${d.title}</strong>
                        <p>${d.content?.substring(0, 80) || ''}...</p>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        if (!html) {
            html = '<p class="empty-text">Nenhum resultado encontrado</p>';
        }

        document.getElementById('search-results').innerHTML = html;

    } catch (error) {
        document.getElementById('search-results').innerHTML = '<p class="error-text">Erro ao buscar</p>';
    }
}

// Enter key for search
document.getElementById('global-search')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') globalSearch();
});

document.getElementById('wiki-search')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWikipedia();
});

document.getElementById('news-search')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchNews();
});

// ==========================================
// API Status Check
// ==========================================

async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE.replace('/api/v1', '')}/health`);

        if (response.ok) {
            document.querySelector('.status-dot').classList.add('online');
            document.getElementById('api-status-text').textContent = 'Online';
            document.getElementById('footer-status').textContent = 'ONLINE';
            document.getElementById('footer-status').classList.add('status-ok');
            return true;
        }
    } catch (error) {
        document.querySelector('.status-dot').classList.remove('online');
        document.getElementById('api-status-text').textContent = 'Offline';
        document.getElementById('footer-status').textContent = 'OFFLINE';
        document.getElementById('footer-status').classList.remove('status-ok');
    }
    return false;
}

// ==========================================
// Initialize
// ==========================================

async function init() {
    const online = await checkApiStatus();
    if (online) {
        loadDashboard();
    }

    // Check status every 30 seconds
    setInterval(checkApiStatus, 30000);
}

init();
