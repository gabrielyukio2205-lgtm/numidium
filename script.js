// ==========================================
// NUMIDIUM - Frontend Application
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
        node: 'rgba(240, 230, 210, 0.5)',
        line: 'rgba(202, 166, 90, 0.18)',
        highlight: 'rgba(95, 164, 147, 0.35)'
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
// Session Management
// ==========================================

let sessionId = localStorage.getItem('numidium_session_id');

async function ensureSession() {
    if (!sessionId) {
        try {
            const response = await fetch(`${API_BASE}/session/create`, { method: 'POST' });
            const data = await response.json();
            sessionId = data.session_id;
            localStorage.setItem('numidium_session_id', sessionId);
            console.log('Created new session:', sessionId);
        } catch (e) {
            console.error('Failed to create session:', e);
            sessionId = crypto.randomUUID();
            localStorage.setItem('numidium_session_id', sessionId);
        }
    }
    return sessionId;
}

// ==========================================
// API Functions
// ==========================================

async function apiRequest(endpoint, options = {}) {
    await ensureSession();

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId,
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
    const activeLink = document.querySelector(`[data-view="${viewName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

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
        case 'map':
            initMap();
            break;
        case 'network':
            initNetworkGraph();
            break;
        case 'research':
            // Research view ready
            break;
        case 'chat':
            // Chat view ready
            break;
        case 'investigate':
            // Investigation view ready
            break;
        case 'timeline':
            loadTimeline();
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
        person: 'PES',
        organization: 'ORG',
        location: 'LOC',
        event: 'EVT',
        document: 'DOC',
        relationship: 'REL',
        unknown: 'UNK'
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
                
                ${entity.source_url ? `<a href="${entity.source_url}" target="_blank" class="source-link">Ver fonte original</a>` : ''}
                
                ${entity.latitude && entity.longitude ? `
                    <div class="geo-info">
                        <span>${entity.latitude.toFixed(4)}, ${entity.longitude.toFixed(4)}</span>
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
                    <button class="btn-primary" onclick="researchEntity('${entity.name}', '${entity.type}')">Pesquisar mais</button>
                    <button class="btn-secondary" onclick="deleteEntity('${id}')">Excluir</button>
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
                    <button onclick="importFromWikipedia('${r.title}', 'person')">Pessoa</button>
                    <button onclick="importFromWikipedia('${r.title}', 'organization')">Organização</button>
                    <button onclick="importFromWikipedia('${r.title}', 'location')">Local</button>
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

        alert(`"${entity.name}" importado com sucesso!`);
        loadDashboard();

    } catch (error) {
        alert('Erro ao importar');
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
                    <a href="${a.url}" target="_blank">Ler mais</a>
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
                <a href="${a.url}" target="_blank">Ler mais</a>
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

        alert('Entidade criada com sucesso!');
        document.getElementById('manual-entity-form').reset();
        loadDashboard();

    } catch (error) {
        alert('Erro ao criar entidade');
    }
}

// AI Analysis
async function analyzeText() {
    const text = document.getElementById('analyze-text').value;
    const autoCreate = document.getElementById('analyze-auto-create').checked;

    if (!text || text.length < 10) {
        alert('Por favor, insira um texto com pelo menos 10 caracteres.');
        return;
    }

    const resultsDiv = document.getElementById('analyze-results');
    resultsDiv.innerHTML = `
        <div class="analyze-loading">
            <div class="loading-spinner"></div>
            <p>Analisando texto com IA (Qwen 3 235B via Cerebras)...</p>
            <p class="loading-sub">Isso pode levar alguns segundos</p>
        </div>
    `;

    try {
        const result = await apiRequest('/analyze', {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                auto_create: autoCreate
            })
        });

        // Debug log
        console.log('Analyze result:', result);
        console.log('Entities:', result.entities);
        console.log('Stats:', result.stats);

        let html = '<div class="analyze-results-content">';

        // Stats summary
        html += `
            <div class="analyze-stats">
                <div class="stat-item">
                    <span class="stat-number">${result.stats.total_entities}</span>
                    <span class="stat-label">Entidades</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${result.stats.total_relationships}</span>
                    <span class="stat-label">Relacionamentos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${result.stats.total_events}</span>
                    <span class="stat-label">Eventos</span>
                </div>
                ${autoCreate ? `
                    <div class="stat-item created">
                        <span class="stat-number">${result.stats.created_entities}</span>
                        <span class="stat-label">Criadas no DB</span>
                    </div>
                ` : ''}
            </div>
        `;

        // Entities
        if (result.entities.length > 0) {
            html += '<div class="analyze-section"><h3>Entidades Extraídas</h3><div class="entities-grid small">';
            result.entities.forEach(e => {
                html += `
                    <div class="entity-card mini ${e.created ? 'created' : ''}">
                        <span class="entity-type-icon">${getTypeIcon(e.type)}</span>
                        <div class="entity-info">
                            <strong>${e.name}</strong>
                            ${e.role ? `<span class="entity-role">${e.role}</span>` : ''}
                            ${e.created ? '<span class="badge-created">Criado</span>' : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Relationships
        if (result.relationships.length > 0) {
            html += '<div class="analyze-section"><h3>Relacionamentos</h3><div class="relationships-list">';
            result.relationships.forEach(r => {
                html += `
                    <div class="relationship-item ${r.created ? 'created' : ''}">
                        <span class="rel-source">${r.source}</span>
                        <span class="rel-arrow">→</span>
                        <span class="rel-type">${r.relationship_type}</span>
                        <span class="rel-arrow">→</span>
                        <span class="rel-target">${r.target}</span>
                        ${r.created ? '<span class="badge-created">Criado</span>' : ''}
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Events
        if (result.events.length > 0) {
            html += '<div class="analyze-section"><h3>Eventos</h3><div class="events-list">';
            result.events.forEach(ev => {
                html += `
                    <div class="event-item ${ev.created ? 'created' : ''}">
                        <strong>${ev.description}</strong>
                        ${ev.event_type ? `<span class="event-type">${ev.event_type}</span>` : ''}
                        ${ev.date ? `<span class="event-date">Data: ${ev.date}</span>` : ''}
                        ${ev.participants && ev.participants.length > 0 ? `<span class="event-participants">Participantes: ${ev.participants.join(', ')}</span>` : ''}
                        ${ev.created ? '<span class="badge-created">Criado</span>' : ''}
                    </div>
                `;
            });
            html += '</div></div>';
        }

        if (result.entities.length === 0 && result.relationships.length === 0 && result.events.length === 0) {
            html += '<p class="empty-text">Nenhuma entidade, relacionamento ou evento encontrado no texto.</p>';
        }

        html += '</div>';
        resultsDiv.innerHTML = html;

        // Refresh dashboard if entities were created
        if (autoCreate && result.stats.created_entities > 0) {
            loadDashboard();
        }

    } catch (error) {
        console.error('Analysis error:', error);
        resultsDiv.innerHTML = `
            <div class="analyze-error">
                <p>Erro ao analisar texto</p>
                <p class="error-detail">${error.message || 'Verifique se a API está configurada corretamente.'}</p>
            </div>
        `;
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
                    <span class="result-icon">${getTypeIcon('event')}</span>
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
                    <span class="result-icon">${getTypeIcon('document')}</span>
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
// Map Functions
// ==========================================

let map = null;
let mapMarkers = [];

function initMap() {
    if (map) {
        loadMapData();
        return;
    }

    // Create map centered on Brazil
    map = L.map('map-container').setView([-15.7801, -47.9292], 4);

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    loadMapData();
}

async function loadMapData() {
    if (!map) return;

    // Clear existing markers
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    const type = document.getElementById('map-type-filter').value;
    let endpoint = '/search/geo';
    if (type) endpoint += `?entity_type=${type}`;

    try {
        const entities = await apiRequest(endpoint);

        if (entities.length === 0) {
            document.getElementById('map-info').innerHTML =
                '<p class="empty-text">Nenhuma entidade com geolocalização. Importe locais do Wikipedia!</p>';
            return;
        }

        entities.forEach(e => {
            const marker = L.marker([e.lat, e.lng])
                .addTo(map)
                .bindPopup(`
                    <div class="map-entity-popup">
                        <span class="popup-type">${e.type}</span>
                        <h4>${e.name}</h4>
                        <p>Lat: ${e.lat.toFixed(4)}, Lng: ${e.lng.toFixed(4)}</p>
                    </div>
                `);

            marker.on('click', () => {
                document.getElementById('map-info').innerHTML = `
                    <div class="entity-card" onclick="showEntityDetail('${e.id}')" style="cursor:pointer">
                        <div class="entity-type ${e.type}">${getTypeIcon(e.type)}</div>
                        <div class="entity-info">
                            <h3>${e.name}</h3>
                            <p>Coord: ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}</p>
                            <span class="entity-source">Clique para ver detalhes</span>
                        </div>
                    </div>
                `;
            });

            mapMarkers.push(marker);
        });

        document.getElementById('map-info').innerHTML =
            `<p class="hint-text">${entities.length} entidade(s) com geolocalização. Clique nos marcadores para detalhes.</p>`;

        // Fit map to markers if we have any
        if (mapMarkers.length > 0) {
            const group = new L.featureGroup(mapMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }

    } catch (error) {
        console.error('Error loading map data:', error);
        document.getElementById('map-info').innerHTML =
            '<p class="error-text">Erro ao carregar dados do mapa</p>';
    }
}

// ==========================================
// Network Graph (Cytoscape.js)
// ==========================================

let cy = null;

const NODE_COLORS = {
    person: '#caa65a',      // Brass
    organization: '#9b6d3f', // Burnished copper
    location: '#5fa493',     // Patina
    event: '#b07b5a',        // Copper
    unknown: '#7d705f'       // Ash
};

function initNetworkGraph() {
    if (cy) {
        loadNetworkGraph();
        return;
    }

    cy = cytoscape({
        container: document.getElementById('cy-container'),
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': function (ele) {
                        return NODE_COLORS[ele.data('type')] || NODE_COLORS.unknown;
                    },
                    'label': 'data(label)',
                    'color': '#f0e6d2',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'font-size': '10px',
                    'font-family': 'Alegreya Sans, sans-serif',
                    'text-margin-y': 5,
                    'width': 40,
                    'height': 40,
                    'border-width': 2,
                    'border-color': '#463b2b'
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 4,
                    'border-color': '#caa65a',
                    'background-color': '#caa65a'
                }
            },
            {
                selector: 'node[?isCentral]',
                style: {
                    'width': 60,
                    'height': 60,
                    'border-width': 4,
                    'border-color': '#d7b06b'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': 'rgba(202, 166, 90, 0.35)',
                    'target-arrow-color': 'rgba(202, 166, 90, 0.55)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(label)',
                    'font-size': '8px',
                    'color': '#b7a98e',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'width': 4,
                    'line-color': '#caa65a',
                    'target-arrow-color': '#caa65a'
                }
            }
        ],
        layout: {
            name: 'cose',
            animate: true,
            animationDuration: 500
        },
        minZoom: 0.2,
        maxZoom: 3
    });

    // Node click handler
    cy.on('tap', 'node', function (evt) {
        const node = evt.target;
        const data = node.data();

        document.getElementById('network-selected').innerHTML = `
            <div class="selected-entity">
                <span class="entity-type-badge ${data.type}">${getTypeIcon(data.type)} ${data.type.toUpperCase()}</span>
                <h3>${data.fullName}</h3>
                <p>${data.description || 'Sem descrição'}</p>
                <small>Fonte: ${data.source}</small>
                <button class="btn-primary" onclick="showEntityDetail('${data.id}')" style="margin-top: 1rem;">VER DETALHES</button>
            </div>
        `;
    });

    // Edge click handler
    cy.on('tap', 'edge', function (evt) {
        const edge = evt.target;
        const data = edge.data();
        const sourceNode = cy.getElementById(data.source).data();
        const targetNode = cy.getElementById(data.target).data();

        document.getElementById('network-selected').innerHTML = `
            <div class="selected-relationship">
                <h4>Relacionamento</h4>
                <p><strong>${sourceNode?.fullName || 'Desconhecido'}</strong></p>
                <p class="rel-type">${data.label}</p>
                <p><strong>${targetNode?.fullName || 'Desconhecido'}</strong></p>
            </div>
        `;
    });

    // Background click handler
    cy.on('tap', function (evt) {
        if (evt.target === cy) {
            document.getElementById('network-selected').innerHTML = `
                <p class="hint-text">Clique em um nó para ver detalhes</p>
            `;
        }
    });

    loadNetworkGraph();
}

async function loadNetworkGraph() {
    if (!cy) return;

    const entityType = document.getElementById('network-type-filter')?.value || '';

    try {
        let endpoint = '/graph';
        if (entityType) {
            endpoint += `?entity_type=${entityType}`;
        }

        const data = await apiRequest(endpoint);

        // Clear existing elements
        cy.elements().remove();

        // Add new elements
        cy.add(data.nodes);
        cy.add(data.edges);

        // Apply layout
        const layoutName = document.getElementById('network-layout')?.value || 'cose';
        cy.layout({
            name: layoutName,
            animate: true,
            animationDuration: 500,
            nodeSpacing: 50,
            padding: 50
        }).run();

        // Update stats
        document.getElementById('network-node-count').textContent = `${data.stats.total_nodes} nós`;
        document.getElementById('network-edge-count').textContent = `${data.stats.total_edges} conexões`;

        // Fit to view
        setTimeout(() => {
            cy.fit(50);
        }, 600);

    } catch (error) {
        console.error('Failed to load network graph:', error);
        document.getElementById('network-selected').innerHTML = `
            <p class="error-text">Erro ao carregar grafo</p>
        `;
    }
}

function changeNetworkLayout() {
    if (!cy) return;

    const layoutName = document.getElementById('network-layout').value;

    cy.layout({
        name: layoutName,
        animate: true,
        animationDuration: 500,
        nodeSpacing: 50,
        padding: 50
    }).run();

    setTimeout(() => {
        cy.fit(50);
    }, 600);
}

// ==========================================
// Entity Merge
// ==========================================

let allEntitiesForMerge = [];

async function showMergeModal() {
    document.getElementById('merge-modal').classList.add('active');

    // Load all entities for the dropdowns
    try {
        const entities = await apiRequest('/entities?limit=200');
        allEntitiesForMerge = entities;

        const primarySelect = document.getElementById('merge-primary');
        const secondarySelect = document.getElementById('merge-secondary');

        let options = '<option value="">Selecione...</option>';
        entities.forEach(e => {
            options += `<option value="${e.id}">${e.name} (${e.type})</option>`;
        });

        primarySelect.innerHTML = options;
        secondarySelect.innerHTML = options;

    } catch (error) {
        console.error('Error loading entities for merge:', error);
    }
}

function closeMergeModal() {
    document.getElementById('merge-modal').classList.remove('active');
}

async function loadMergeSuggestions() {
    const container = document.getElementById('merge-suggestions-list');
    container.innerHTML = `
        <div class="analyze-loading">
            <div class="loading-spinner"></div>
            <p>Analisando entidades com IA...</p>
        </div>
    `;

    try {
        const result = await apiRequest('/entities/suggest-merge');

        if (result.candidates && result.candidates.length > 0) {
            let html = '';
            result.candidates.forEach(c => {
                html += `
                    <div class="merge-suggestion-item" onclick="selectMergeCandidate('${c.entity1.id}', '${c.entity2.id}')">
                        <div class="merge-pair">
                            <span class="entity-name">${c.entity1.name}</span>
                            <span class="merge-vs">≈</span>
                            <span class="entity-name">${c.entity2.name}</span>
                        </div>
                        <div class="merge-reason">
                            <span class="confidence">${Math.round(c.confidence * 100)}%</span>
                            ${c.reason}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="hint-text">Nenhuma duplicata encontrada pela IA</p>';
        }

    } catch (error) {
        console.error('Error loading suggestions:', error);
        container.innerHTML = '<p class="error-text">Erro ao buscar sugestões</p>';
    }
}

function selectMergeCandidate(id1, id2) {
    document.getElementById('merge-primary').value = id1;
    document.getElementById('merge-secondary').value = id2;
    updateMergePreview();
}

function updateMergePreview() {
    const primaryId = document.getElementById('merge-primary').value;
    const secondaryId = document.getElementById('merge-secondary').value;
    const previewDiv = document.getElementById('merge-preview');
    const mergeBtn = document.getElementById('merge-btn');

    if (!primaryId || !secondaryId) {
        previewDiv.innerHTML = '';
        mergeBtn.disabled = true;
        return;
    }

    if (primaryId === secondaryId) {
        previewDiv.innerHTML = '<p class="error-text">Selecione duas entidades diferentes</p>';
        mergeBtn.disabled = true;
        return;
    }

    const primary = allEntitiesForMerge.find(e => e.id === primaryId);
    const secondary = allEntitiesForMerge.find(e => e.id === secondaryId);

    if (primary && secondary) {
        previewDiv.innerHTML = `
            <div class="merge-preview-content">
                <p><strong>"${secondary.name}"</strong> será mesclada em <strong>"${primary.name}"</strong></p>
                <ul>
                    <li>O nome "${secondary.name}" será adicionado como alias</li>
                    <li>Relacionamentos serão transferidos</li>
                    <li>A entidade secundária será deletada</li>
                </ul>
            </div>
        `;
        mergeBtn.disabled = false;
    }
}

async function executeMerge() {
    const primaryId = document.getElementById('merge-primary').value;
    const secondaryId = document.getElementById('merge-secondary').value;

    if (!primaryId || !secondaryId || primaryId === secondaryId) {
        return;
    }

    const primary = allEntitiesForMerge.find(e => e.id === primaryId);
    const secondary = allEntitiesForMerge.find(e => e.id === secondaryId);

    if (!confirm(`Confirma mesclar "${secondary?.name}" em "${primary?.name}"? Esta ação não pode ser desfeita.`)) {
        return;
    }

    try {
        const result = await apiRequest(`/entities/merge?primary_id=${primaryId}&secondary_id=${secondaryId}`, {
            method: 'POST'
        });

        alert(`${result.message}`);
        closeMergeModal();
        loadEntities();

        // Reload graph if visible
        if (cy) {
            loadNetworkGraph();
        }

    } catch (error) {
        console.error('Merge error:', error);
        alert('Erro ao mesclar entidades');
    }
}

// ==========================================
// Relationship Creation
// ==========================================

async function showAddRelationshipModal() {
    document.getElementById('relationship-modal').classList.add('active');

    // Load entities for dropdowns
    try {
        const entities = await apiRequest('/entities?limit=200');

        let options = '<option value="">Selecione...</option>';
        entities.forEach(e => {
            options += `<option value="${e.id}">${e.name} (${e.type})</option>`;
        });

        document.getElementById('rel-source').innerHTML = options;
        document.getElementById('rel-target').innerHTML = options;
        document.getElementById('rel-type').value = '';

    } catch (error) {
        console.error('Error loading entities:', error);
    }
}

function closeRelationshipModal() {
    document.getElementById('relationship-modal').classList.remove('active');
}

function setRelType(type) {
    document.getElementById('rel-type').value = type;
}

async function createRelationship() {
    const sourceId = document.getElementById('rel-source').value;
    const targetId = document.getElementById('rel-target').value;
    const relType = document.getElementById('rel-type').value.trim();

    if (!sourceId || !targetId) {
        alert('Selecione as duas entidades');
        return;
    }

    if (!relType) {
        alert('Digite o tipo de relação');
        return;
    }

    if (sourceId === targetId) {
        alert('Selecione entidades diferentes');
        return;
    }

    try {
        await apiRequest('/relationships/', {
            method: 'POST',
            body: JSON.stringify({
                source_id: sourceId,
                target_id: targetId,
                type: relType
            })
        });

        alert('Conexão criada!');
        closeRelationshipModal();
        loadNetworkGraph();

    } catch (error) {
        console.error('Error creating relationship:', error);
        alert('Erro ao criar conexão');
    }
}

// ==========================================
// Research (Lancer Integration)
// ==========================================

async function executeResearch() {
    const query = document.getElementById('research-query').value.trim();
    const mode = document.getElementById('research-mode').value;
    const autoExtract = document.getElementById('research-auto-extract').checked;

    if (!query) {
        alert('Digite uma pesquisa');
        return;
    }

    const loading = document.getElementById('research-loading');
    const results = document.getElementById('research-results');

    loading.style.display = 'flex';
    results.innerHTML = '';

    try {
        const response = await apiRequest('/research', {
            method: 'POST',
            body: JSON.stringify({
                query: query,
                mode: mode,
                max_results: 10,
                auto_extract: autoExtract
            })
        });

        loading.style.display = 'none';

        // Build results HTML
        let html = `
            <div class="research-answer">
                <h3>Resposta</h3>
                <div class="answer-content">${formatResearchAnswer(response.answer)}</div>
            </div>
        `;

        // Extraction stats
        if (autoExtract) {
            html += `
                <div class="research-extraction-stats">
                    <span>Entidades: ${response.extracted_entities}</span>
                    <span>Relacionamentos: ${response.extracted_relationships}</span>
                    <span>Tempo: ${(response.processing_time_ms / 1000).toFixed(1)}s</span>
                </div>
            `;
        }

        // Sources
        if (response.sources && response.sources.length > 0) {
            html += `<div class="research-sources"><h3>Fontes</h3><div class="sources-list">`;
            response.sources.forEach((src, idx) => {
                html += `
                    <div class="source-item">
                        <span class="source-index">[${idx + 1}]</span>
                        <div class="source-content">
                            <a href="${src.url}" target="_blank" class="source-title">${src.title}</a>
                            <p class="source-snippet">${src.content}</p>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        results.innerHTML = html;

    } catch (error) {
        loading.style.display = 'none';
        console.error('Research error:', error);
        results.innerHTML = `<p class="error-text">Erro na pesquisa: ${error.message || 'Falha na API'}</p>`;
    }
}

function formatResearchAnswer(answer) {
    if (!answer) return '<p class="empty-text">Nenhuma resposta gerada</p>';

    // Basic markdown-ish formatting
    return answer
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// Research entity from modal
async function researchEntity(name, type) {
    closeModal();
    switchView('research');

    // Set the query and execute
    document.getElementById('research-query').value = `${name} ${type === 'person' ? 'biografia' : type === 'organization' ? 'empresa' : 'informações'}`;
    document.getElementById('research-mode').value = 'search';

    // Small delay to allow view switch
    setTimeout(() => {
        executeResearch();
    }, 100);
}

// ==========================================
// Chat (AVANGARD)
// ==========================================

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const useWeb = document.getElementById('chat-use-web').checked;
    const messagesContainer = document.getElementById('chat-messages');

    // Add user message
    messagesContainer.innerHTML += `
        <div class="chat-message user">
            <div class="message-content"><p>${message}</p></div>
            <div class="message-avatar">EU</div>
        </div>
    `;

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    messagesContainer.innerHTML += `
        <div class="chat-message assistant" id="${loadingId}">
            <div class="message-avatar">AV</div>
            <div class="message-content"><p class="typing">Pensando...</p></div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await apiRequest('/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: message,
                use_web: useWeb,
                use_history: true
            })
        });

        // Replace loading with response
        const loadingEl = document.getElementById(loadingId);
        loadingEl.innerHTML = `
            <div class="message-avatar">AV</div>
            <div class="message-content">
                ${formatChatResponse(response.answer)}
                <div class="message-meta">
                    ${response.local_context_used ? 'Local: ' + response.entities_found + ' entidades' : ''} 
                    ${response.web_context_used ? 'Web' : ''}
                </div>
            </div>
        `;

    } catch (error) {
        const loadingEl = document.getElementById(loadingId);
        loadingEl.innerHTML = `
            <div class="message-avatar">AV</div>
            <div class="message-content error">
                <p>Erro: ${error.message || 'Falha na comunicação'}</p>
            </div>
        `;
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Sanitize text from model that may contain thinking artifacts.
 * Only removes thinking tags, does NOT remove characters.
 */
function sanitizeText(text) {
    if (!text) return text;

    // Remove thinking tags if present (but keep the content clean)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/<\|think\|>[\s\S]*?<\|\/think\|>/gi, '');

    // Remove other common model artifacts like <|...|> tags
    text = text.replace(/<\|.*?\|>/g, '');

    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

function formatChatResponse(text) {
    if (!text) return '<p>Sem resposta</p>';
    // Apply sanitization first
    text = sanitizeText(text);
    return text
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

async function clearChatHistory() {
    try {
        await apiRequest('/chat/clear', { method: 'POST' });
        document.getElementById('chat-messages').innerHTML = `
            <div class="chat-message assistant">
                <div class="message-avatar">AV</div>
                <div class="message-content">
                    <p>Histórico limpo! Como posso ajudar?</p>
                </div>
            </div>
        `;
    } catch (error) {
        alert('Erro ao limpar histórico');
    }
}

// ==========================================
// Investigation (Dossier)
// ==========================================

function switchInvTab(tab) {
    document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.inv-panel').forEach(p => p.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`inv-${tab}`).classList.add('active');
}

async function investigateCompany() {
    const cnpj = document.getElementById('inv-cnpj').value.trim();
    if (!cnpj) {
        alert('Digite o CNPJ');
        return;
    }

    await runInvestigation('/investigate/company', { cnpj });
}

async function investigatePerson() {
    const nome = document.getElementById('inv-nome').value.trim();
    const cpf = document.getElementById('inv-cpf').value.trim();

    if (!nome) {
        alert('Digite o nome');
        return;
    }

    await runInvestigation('/investigate/person', { nome, cpf: cpf || null });
}

async function investigateWithAgent() {
    const mission = document.getElementById('inv-mission').value.trim();
    if (!mission || mission.length < 5) {
        alert('Digite uma missão de investigação (mínimo 5 caracteres)');
        return;
    }

    const loading = document.getElementById('inv-loading');
    const loadingText = document.getElementById('inv-loading-text');
    const result = document.getElementById('inv-result');

    loading.style.display = 'flex';
    loadingText.textContent = 'Agente investigando... buscando no NUMIDIUM, consultando CNPJs, pesquisando na web...';
    result.innerHTML = '';

    try {
        const response = await apiRequest('/investigate/agent', {
            method: 'POST',
            body: JSON.stringify({ mission, max_iterations: 10 })
        });

        loading.style.display = 'none';
        result.innerHTML = renderAgentResult(response);

    } catch (error) {
        loading.style.display = 'none';
        result.innerHTML = `<p class="error-text">Erro: ${error.message || 'Falha na investigação'}</p>`;
    }
}

function renderAgentResult(r) {
    let html = `
        <div class="dossier agent-result">
            <div class="dossier-header">
                <div class="dossier-title">
                    <h2>Investigação: ${r.mission}</h2>
                    <span class="dossier-id">${r.iterations} iterações • ${r.tools_used.length} ferramentas</span>
                </div>
                <div class="risk-score ok">
                    <span>Status</span>
                    <strong>${r.status}</strong>
                </div>
            </div>

            <div class="agent-stats">
                <div class="stat-item">
                    <span class="stat-number">${r.entities_discovered}</span>
                    <span class="stat-label">Entidades</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${r.connections_mapped}</span>
                    <span class="stat-label">Conexões</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${r.findings.length}</span>
                    <span class="stat-label">Descobertas</span>
                </div>
            </div>

            <div class="dossier-section">
                <h3>Relatório</h3>
                <div class="report-content">${formatChatResponse(r.report)}</div>
            </div>
    `;

    if (r.findings && r.findings.length > 0) {
        html += `<div class="dossier-section"><h3>Descobertas</h3><div class="findings-list">`;
        r.findings.forEach(f => {
            html += `
                <div class="finding-item">
                    <strong>${sanitizeText(f.title)}</strong>
                    <p>${sanitizeText(f.content)}</p>
                    <small>Fonte: ${f.source}</small>
                </div>
            `;
        });
        html += `</div></div>`;
    }

    if (r.tools_used && r.tools_used.length > 0) {
        html += `<div class="dossier-section"><h3>Ferramentas Usadas</h3><div class="tools-list">`;
        r.tools_used.forEach(t => {
            html += `<span class="tool-badge">${t}</span>`;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

async function runInvestigation(endpoint, data) {
    const loading = document.getElementById('inv-loading');
    const loadingText = document.getElementById('inv-loading-text');
    const result = document.getElementById('inv-result');

    loading.style.display = 'flex';
    loadingText.textContent = 'Coletando dados de múltiplas fontes... isso pode levar alguns segundos';
    result.innerHTML = '';

    try {
        const dossier = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        loading.style.display = 'none';
        result.innerHTML = renderDossier(dossier);

    } catch (error) {
        loading.style.display = 'none';
        result.innerHTML = `<p class="error-text">Erro: ${error.message || 'Falha na investigação'}</p>`;
    }
}

function renderDossier(d) {
    const riskClass = d.score_risco >= 50 ? 'danger' : d.score_risco >= 20 ? 'warning' : 'ok';

    let html = `
        <div class="dossier">
            <div class="dossier-header">
                <div class="dossier-title">
                    <h2>${getTypeIcon(d.tipo)} ${d.alvo}</h2>
                    ${d.cnpj_cpf ? `<span class="dossier-id">${d.cnpj_cpf}</span>` : ''}
                </div>
                <div class="risk-score ${riskClass}">
                    <span>Score de Risco</span>
                    <strong>${d.score_risco}</strong>
                </div>
            </div>
    `;

    // Red flags
    if (d.red_flags && d.red_flags.length > 0) {
        html += `<div class="red-flags">`;
        d.red_flags.forEach(flag => {
            html += `<div class="flag-item">${flag}</div>`;
        });
        html += `</div>`;
    }

    // Sections
    for (const [key, section] of Object.entries(d.secoes || {})) {
        html += `
            <div class="dossier-section ${section.status}">
                <h3>${section.titulo}</h3>
                <div class="section-content">
                    ${renderSectionContent(key, section.conteudo)}
                </div>
            </div>
        `;
    }

    // Sources
    if (d.fonte_dados && d.fonte_dados.length > 0) {
        html += `
            <div class="dossier-sources">
                <span>Fontes: ${d.fonte_dados.join(', ')}</span>
                <span>Gerado em: ${new Date(d.data_geracao).toLocaleString('pt-BR')}</span>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

function renderSectionContent(key, content) {
    if (!content) return '<p>Sem dados</p>';

    if (key === 'dados_cadastrais') {
        return `
            <div class="cadastral-grid">
                ${Object.entries(content).map(([k, v]) =>
            `<div class="cad-item"><span>${k.replace(/_/g, ' ')}</span><strong>${v || '-'}</strong></div>`
        ).join('')}
            </div>
        `;
    }

    if (key === 'socios' && Array.isArray(content)) {
        return `
            <div class="partners-list">
                ${content.map(s => `
                    <div class="partner-item">
                        <span class="partner-name">${s.nome}</span>
                        <span class="partner-role">${s.qualificacao}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (key === 'sancoes' && content.registros) {
        if (content.registros.length === 0) {
            return `<p class="ok-text">${content.mensagem || 'Nenhuma sanção encontrada'}</p>`;
        }
        return `
            <div class="sanctions-list">
                ${content.registros.map(s => `
                    <div class="sanction-item">
                        <span class="sanction-type">${s.tipo}</span>
                        <span>${s.tipo_sancao}</span>
                        <span>${s.orgao}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (key === 'dados_politicos') {
        let html = '<div class="political-data">';

        if (content.ultimo_cargo) {
            html += `<div class="pol-item"><strong>Último cargo:</strong> ${content.ultimo_cargo}</div>`;
        }
        if (content.partidos && content.partidos.length > 0) {
            html += `<div class="pol-item"><strong>Partidos:</strong> ${content.partidos.join(', ')}</div>`;
        }
        if (content.patrimonio_declarado) {
            html += `<div class="pol-item"><strong>Patrimônio declarado:</strong> R$ ${content.patrimonio_declarado.toLocaleString('pt-BR')}</div>`;
        }
        if (content.ufs && content.ufs.length > 0) {
            html += `<div class="pol-item"><strong>UFs:</strong> ${content.ufs.join(', ')}</div>`;
        }

        if (content.candidaturas && content.candidaturas.length > 0) {
            html += '<div class="candidaturas-list"><strong>Histórico:</strong>';
            content.candidaturas.forEach(c => {
                html += `<div class="candidatura-item">
                    <span class="cand-ano">${c.ano}</span>
                    <span class="cand-cargo">${c.cargo}</span>
                    <span class="cand-partido">${c.partido}</span>
                    <span class="cand-situacao">${c.situacao}</span>
                </div>`;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    if (key === 'noticias' && content.resumo) {
        let html = `<div class="news-summary">${content.resumo}</div>`;
        if (content.fontes && content.fontes.length > 0) {
            html += `<div class="news-sources">`;
            content.fontes.forEach((f, i) => {
                html += `<a href="${f.url}" target="_blank">[${i + 1}] ${f.titulo}</a>`;
            });
            html += `</div>`;
        }
        return html;
    }

    if (key === 'entidades_relacionadas' && Array.isArray(content)) {
        return `
            <div class="entities-list">
                ${content.map(e => `
                    <div class="entity-tag ${e.tipo}">
                        ${e.nome} <small>(${e.tipo})</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `<pre>${JSON.stringify(content, null, 2)}</pre>`;
}

// ==========================================
// Timeline
// ==========================================

async function loadTimeline() {
    const container = document.getElementById('timeline-container');
    const totalEl = document.getElementById('timeline-total');

    const days = document.getElementById('timeline-days')?.value || 30;
    const entityType = document.getElementById('timeline-type')?.value || '';

    container.innerHTML = `
        <div class="timeline-loading">
            <div class="loading-spinner"></div>
            <p>Carregando timeline...</p>
        </div>
    `;

    try {
        let url = `/timeline?days=${days}&limit=100`;
        if (entityType) {
            url += `&entity_type=${entityType}`;
        }

        const data = await apiRequest(url);

        if (!data.groups || data.groups.length === 0) {
            container.innerHTML = `
                <div class="timeline-empty">
                    <span class="empty-icon" aria-hidden="true"></span>
                    <h3>Nenhum evento encontrado</h3>
                    <p>Não há entidades ou conexões criadas no período selecionado.</p>
                </div>
            `;
            totalEl.textContent = '0 eventos';
            return;
        }

        totalEl.textContent = `${data.total_events} eventos`;
        container.innerHTML = renderTimeline(data.groups);

    } catch (error) {
        console.error('Timeline error:', error);
        container.innerHTML = `
            <div class="timeline-empty error">
                <span class="empty-icon" aria-hidden="true"></span>
                <h3>Erro ao carregar timeline</h3>
                <p>${error.message || 'Tente novamente'}</p>
            </div>
        `;
    }
}

function renderTimeline(groups) {
    let html = '<div class="timeline-track">';

    groups.forEach((group, groupIndex) => {
        html += `
            <div class="timeline-group" style="--delay: ${groupIndex * 0.1}s">
                <div class="timeline-date">
                    <span class="date-label">${group.label}</span>
                    <span class="event-count">${group.events.length} evento(s)</span>
                </div>
                <div class="timeline-events">
        `;

        group.events.forEach((event, eventIndex) => {
            const typeClass = event.entity_type || event.type;
            html += `
                <div class="timeline-event ${typeClass}" style="--event-delay: ${eventIndex * 0.05}s" onclick="viewTimelineEvent('${event.type}', ${event.id})">
                    <div class="event-icon">${getTypeIcon(typeClass)}</div>
                    <div class="event-content">
                        <h4>${event.name}</h4>
                        ${event.description ? `<p>${event.description}</p>` : ''}
                        <span class="event-type">${event.entity_type || event.type}</span>
                    </div>
                    <div class="event-time">
                        ${new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function viewTimelineEvent(type, id) {
    if (type === 'entity') {
        openEntityModal(id);
    }
    // For relationships, could open a relationship detail view
}

// ==========================================
// Projects
// ==========================================

async function loadProjects() {
    try {
        const projects = await apiRequest('/projects');
        const select = document.getElementById('project-select');

        // Keep first option (All Projects)
        select.innerHTML = '<option value="">Todos os Projetos</option>';

        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} (${p.entity_count})`;
            option.style.color = p.color;
            if (p.id === currentProjectId) option.selected = true;
            select.appendChild(option);
        });

        // Update project list in modal
        renderProjectList(projects);

    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

function renderProjectList(projects) {
    const list = document.getElementById('project-list');
    if (!list) return;

    if (projects.length === 0) {
        list.innerHTML = '<p class="empty-state">Nenhum projeto criado ainda</p>';
        return;
    }

    list.innerHTML = projects.map(p => `
        <div class="project-item" style="border-left: 3px solid ${p.color}">
            <div class="project-info">
                <strong>${p.name}</strong>
                <span>${p.entity_count} entidades</span>
            </div>
            <div class="project-actions">
                <button class="btn-sm" onclick="switchProject('${p.id}')">Usar</button>
                <button class="btn-sm btn-danger" onclick="deleteProject('${p.id}')">×</button>
            </div>
        </div>
    `).join('');
}

async function createProject() {
    const name = document.getElementById('new-project-name').value.trim();
    const color = document.getElementById('new-project-color').value;

    if (!name) {
        alert('Digite um nome para o projeto');
        return;
    }

    try {
        await apiRequest('/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });

        document.getElementById('new-project-name').value = '';
        loadProjects();

    } catch (error) {
        console.error('Failed to create project:', error);
        alert('Erro ao criar projeto');
    }
}

function switchProject(projectId) {
    currentProjectId = projectId;
    localStorage.setItem('currentProjectId', projectId);

    // Update select
    const select = document.getElementById('project-select');
    if (select) select.value = projectId;

    // Reload current view data
    loadDashboard();
    loadEntities();

    closeProjectModal();
}

async function deleteProject(projectId) {
    if (!confirm('Excluir este projeto? As entidades serão mantidas sem projeto.')) return;

    try {
        await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });

        if (currentProjectId === projectId) {
            switchProject('');
        }

        loadProjects();
    } catch (error) {
        console.error('Failed to delete project:', error);
    }
}

function openProjectModal() {
    document.getElementById('project-modal').classList.add('active');
    loadProjects();
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
}

// ==========================================
// AetherMap Functions
// ==========================================

let aetherJobId = null;

function showAetherTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.aether-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.aether-tab').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(`aether-tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

function aetherShowLoading(show) {
    document.getElementById('aether-loading').style.display = show ? 'flex' : 'none';
}

function aetherUpdateStatus(data) {
    const statusDiv = document.getElementById('aether-status-content');
    aetherJobId = data.job_id;

    // Estatísticas básicas (grid igual ao AetherMap original)
    const riquezaLexical = data.metrics?.riqueza_lexical || 0;
    const entropia = data.metrics?.entropia || 0;

    let html = `
        <div class="aether-stats-grid">
            <div class="aether-stat">
                <span class="aether-stat-value">${data.num_documents}</span>
                <span class="aether-stat-label">Documentos</span>
            </div>
            <div class="aether-stat">
                <span class="aether-stat-value">${data.num_clusters}</span>
                <span class="aether-stat-label">Clusters</span>
            </div>
            <div class="aether-stat">
                <span class="aether-stat-value">${data.num_noise}</span>
                <span class="aether-stat-label">Pontos de Ruído</span>
            </div>
            <div class="aether-stat">
                <span class="aether-stat-value">${riquezaLexical}</span>
                <span class="aether-stat-label">Riqueza Lexical</span>
            </div>
            <div class="aether-stat highlight">
                <span class="aether-stat-value">${entropia.toFixed(2)}</span>
                <span class="aether-stat-label">Entropia (bits)</span>
            </div>
        </div>
    `;

    // TF-IDF Global (barras horizontais como no AetherMap)
    if (data.metrics?.top_tfidf_palavras && data.metrics.top_tfidf_palavras.length > 0) {
        const maxScore = Math.max(...data.metrics.top_tfidf_palavras.map(p => p.score));
        html += `<div class="aether-tfidf-section">
            <h4>Relevância Global (TF-IDF)</h4>
            <div class="tfidf-bars">`;
        data.metrics.top_tfidf_palavras.forEach(item => {
            const widthPercent = (item.score / maxScore) * 100;
            html += `
                <div class="tfidf-bar-item">
                    <span class="tfidf-word">${item.palavra}</span>
                    <div class="tfidf-bar-container">
                        <div class="tfidf-bar" style="width: ${widthPercent}%"></div>
                        <span class="tfidf-score">${item.score.toFixed(1)}</span>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    }

    // Análise por Cluster (se disponível)
    if (data.cluster_analysis && Object.keys(data.cluster_analysis).length > 0) {
        html += `<div class="aether-clusters-section"><h4>Análise por Cluster</h4>`;

        // cluster_analysis é um dict onde chave = cluster_id
        const clusters = Object.entries(data.cluster_analysis);
        clusters.slice(0, 5).forEach(([clusterId, clusterData]) => {
            if (clusterId === '-1') return; // Skip noise

            const numDocs = clusterData.num_documentos || clusterData.count || '?';
            const topWords = clusterData.top_palavras || clusterData.top_words || [];

            html += `
                <div class="cluster-card">
                    <div class="cluster-header">
                        <span class="cluster-name">Cluster ${clusterId}</span>
                        <span class="cluster-count">${numDocs} Documentos</span>
                    </div>`;

            if (topWords.length > 0) {
                const wordsStr = topWords.slice(0, 5).map(w =>
                    typeof w === 'string' ? w : (w.palavra || w.word)
                ).join(', ');
                html += `<p class="cluster-words"><strong>Top Palavras (TF-IDF):</strong> "${wordsStr}"</p>`;
            }

            html += `</div>`;
        });

        html += `</div>`;
    }

    // Job ID pequeno no final
    html += `<p class="aether-job-id">Job: ${data.job_id}</p>`;

    statusDiv.innerHTML = html;
}

async function aetherUploadFile() {
    const fileInput = document.getElementById('aether-file');
    const fastMode = document.getElementById('aether-fast-mode').checked;

    if (!fileInput.files[0]) {
        alert('Selecione um arquivo');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('fast_mode', fastMode.toString());

    aetherShowLoading(true);
    try {
        const response = await fetch(`${API_BASE}/aethermap/upload`, {
            method: 'POST',
            body: formData,
            headers: { 'X-Session-Id': sessionId }
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        aetherUpdateStatus(data);

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        aetherShowLoading(false);
    }
}

async function aetherIndexEntities() {
    const entityType = document.getElementById('aether-entity-type').value;
    const limit = parseInt(document.getElementById('aether-entity-limit').value) || 500;

    aetherShowLoading(true);
    try {
        const body = { limit };
        if (entityType) body.entity_types = [entityType];

        const response = await fetch(`${API_BASE}/aethermap/index-entities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        aetherUpdateStatus(data);

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        aetherShowLoading(false);
    }
}

async function aetherIndexText() {
    const text = document.getElementById('aether-text-input').value;
    const documents = text.split('\n').filter(line => line.trim());

    if (documents.length === 0) {
        alert('Cole alguns documentos (um por linha)');
        return;
    }

    aetherShowLoading(true);
    try {
        const response = await fetch(`${API_BASE}/aethermap/index`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            body: JSON.stringify({ documents, fast_mode: true })
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        aetherUpdateStatus(data);

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        aetherShowLoading(false);
    }
}

async function aetherSearch() {
    const query = document.getElementById('aether-search-query').value;
    if (!query) return;

    if (!aetherJobId) {
        alert('Indexe documentos primeiro');
        return;
    }

    const resultDiv = document.getElementById('aether-search-result');
    resultDiv.innerHTML = '<p class="mono-label">Buscando...</p>';

    try {
        const response = await fetch(`${API_BASE}/aethermap/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            body: JSON.stringify({ query, turbo_mode: true })
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        resultDiv.innerHTML = `
            <div class="aether-answer">
                <h4>Resposta RAG:</h4>
                <p>${data.summary || 'Sem resposta'}</p>
            </div>
        `;

    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
    }
}

async function aetherExtractEntities() {
    if (!aetherJobId) {
        alert('Indexe documentos primeiro');
        return;
    }

    const resultDiv = document.getElementById('aether-ner-result');
    resultDiv.innerHTML = '<p class="mono-label">Extraindo entidades...</p>';

    try {
        const response = await fetch(`${API_BASE}/aethermap/entities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();

        let html = `<p><strong>Nós:</strong> ${data.node_count} | <strong>Arestas:</strong> ${data.edge_count}</p>`;

        if (data.hubs && data.hubs.length) {
            html += '<h4>Entidades Centrais (Hubs):</h4><ul>';
            data.hubs.forEach(hub => {
                html += `<li><strong>${hub.entity}</strong> (${hub.type}) - ${hub.degree} conexões</li>`;
            });
            html += '</ul>';
        }

        if (data.insights) {
            html += `<p><strong>Total conexões:</strong> ${data.insights.total_connections || 0}</p>`;
        }

        resultDiv.innerHTML = html;

    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
    }
}

async function aetherAnalyzeGraph() {
    if (!aetherJobId) {
        alert('Indexe documentos primeiro');
        return;
    }

    const resultDiv = document.getElementById('aether-ner-result');
    resultDiv.innerHTML = '<p class="mono-label">Analisando grafo com LLM...</p>';

    try {
        const response = await fetch(`${API_BASE}/aethermap/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        resultDiv.innerHTML = `
            <h4>Análise do Grafo:</h4>
            <p>${data.analysis || 'Sem análise disponível'}</p>
        `;

    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
    }
}

// ==========================================
// Initialize
// ==========================================

async function init() {
    const online = await checkApiStatus();
    if (online) {
        loadDashboard();
        loadProjects();
    }

    // Check status every 30 seconds
    setInterval(checkApiStatus, 30000);
}

init();
