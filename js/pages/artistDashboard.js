// =============================================
// 265Stream - Artist Dashboard (Shell)
// =============================================
import { api } from '../apiClient.js';
import { icon } from '../icons.js';
import { renderArtistOverview } from './artist/artistOverview.js';
import { renderArtistUpload } from './artist/artistUpload.js';
import { renderArtistSongs } from './artist/artistSongs.js';
import { renderArtistSales } from './artist/artistSales.js';
import { renderArtistAnalytics } from './artist/artistAnalytics.js';

export async function renderArtistDashboard(container, params = {}) {
  const activeTab = params.artistTab || 'overview';

  container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Entering Studio...</p></div>`;

  let artistSongs = [];
  let artistSales = [];
  let salesSummary = { totalSales: 0, totalRevenue: 0 };
  const user = api.getStoredUser() || {};

  try {
    const [songsRes, salesRes] = await Promise.all([
      api.getArtistSongs(),
      api.getArtistSales()
    ]);
    artistSongs = songsRes.songs || [];
    artistSales = salesRes.sales || [];
    salesSummary = salesRes.summary || { totalSales: 0, totalRevenue: 0 };
  } catch (err) {
    console.error('Artist Studio error:', err);
  }

  container.innerHTML = '';

  // Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-section">
      <div style="padding: 0 0.75rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; color: white;">
          ${user.full_name ? user.full_name.substring(0, 2).toUpperCase() : "A"}
        </div>
        <div>
          <div style="font-size: 0.875rem; font-weight: 700;">Artist Studio</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${user.full_name || "Artist"}</div>
        </div>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-link ${activeTab === 'overview' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'overview'})">
        ${icon('grid', 20)} Dashboard
      </div>
      <div class="sidebar-link ${activeTab === 'upload' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'upload'})">
        ${icon('upload', 20)} Upload Track
      </div>
      <div class="sidebar-link ${activeTab === 'songs' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'songs'})">
        ${icon('music', 20)} My Catalog
        <span class="badge">${artistSongs.length}</span>
      </div>
      <div class="sidebar-link ${activeTab === 'sales' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'sales'})">
        ${icon('dollarSign', 20)} Sales
      </div>
      <div class="sidebar-link ${activeTab === 'analytics' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'analytics'})">
        ${icon('trendingUp', 20)} Analytics
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-link" onclick="window.navigateTo('userDashboard', {dashboardTab: 'settings'})">
        ${icon('settings', 20)} Settings
      </div>
      <div class="sidebar-link" onclick="window.location.href='index.html'">
        ${icon('chevronLeft', 20)} Exit Studio
      </div>
    </div>
  `;
  document.getElementById('app').insertBefore(sidebar, container);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); };
  document.getElementById('app').insertBefore(overlay, container);

  const toggle = document.createElement('button');
  toggle.className = 'mobile-sidebar-toggle';
  toggle.innerHTML = icon('menu', 24);
  toggle.onclick = () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); };
  document.getElementById('app').appendChild(toggle);

  container.classList.add('has-sidebar');

  const wrapper = document.createElement('div');
  wrapper.className = 'page-container';
  container.appendChild(wrapper);

  const tabs = {
    overview: () => renderArtistOverview(user, artistSongs, artistSales, salesSummary),
    upload: () => renderArtistUpload(user),
    songs: () => renderArtistSongs(user, artistSongs),
    sales: () => renderArtistSales(user, artistSales, salesSummary),
    analytics: () => renderArtistAnalytics(user, artistSongs, artistSales),
  };

  const renderFn = tabs[activeTab] || tabs.overview;
  wrapper.innerHTML = renderFn();

  // Initialize interactive logic
  if (activeTab === 'upload') {
    initUploadHandlers();
  }
}

// ============================================
// HANDLERS & HELPERS
// ============================================

function initUploadHandlers() {
  const container = document.querySelector('.page-container');
  const audioZone = container.querySelector('#audio-upload-zone');
  const coverZone = container.querySelector('#cover-upload-zone');
  const audioInput = container.querySelector('#audio-file-input');
  const coverInput = container.querySelector('#cover-file-input');

  if (!audioZone || !coverZone) return;

  audioZone.onclick = () => audioInput.click();
  coverZone.onclick = () => coverInput.click();

  audioInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      audioZone.innerHTML = `
        <div style="color:var(--success); font-weight:700;">${icon('check', 40)}</div>
        <div style="font-size:0.9rem; font-weight:600; margin-top:0.5rem;">${file.name}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">Selected. Click to change.</div>
      `;
      audioZone.style.borderColor = 'var(--success)';
    }
  };

  coverInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        coverZone.innerHTML = `
          <img src="${event.target.result}" style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover; margin-bottom: 0.5rem;"/>
          <div style="font-size:0.8rem; font-weight:600;">Artwork Ready</div>
        `;
      };
      reader.readAsDataURL(file);
      coverZone.style.borderColor = 'var(--success)';
    }
  };
}

window.handleUpload = async function () {
  const container = document.querySelector('.page-container');
  const audioInput = container.querySelector('#audio-file-input');
  const coverInput = container.querySelector('#cover-file-input');
  const titleInput = container.querySelector('input[placeholder="Enter song title"]');
  const genreSelect = container.querySelector('.form-select');
  const priceInput = container.querySelector('input[placeholder="0.99"]');
  const descTextarea = container.querySelector('.form-textarea');

  if (!audioInput.files[0] || !titleInput.value || !genreSelect.value) {
    import('../app.js').then(m => m.showToast('error', 'Incomplete Form', 'Please fill in all required fields.'));
    return;
  }

  const formData = new FormData();
  formData.append('audio', audioInput.files[0]);
  if (coverInput.files[0]) formData.append('cover', coverInput.files[0]);
  formData.append('title', titleInput.value);
  formData.append('genre', genreSelect.value);
  formData.append('price', priceInput.value || '0.99');
  formData.append('description', descTextarea.value);

  const btn = document.querySelector('.btn-primary');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Creating...';

  try {
    await api.uploadSong(formData);
    import('../app.js').then(m => {
      m.showToast('success', 'Published!', 'Your song is now live (pending review).');
      m.navigate('artistDashboard', { artistTab: 'songs' });
    });
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = original;
    import('../app.js').then(m => m.showToast('error', 'Failure', err.message || 'Upload failed.'));
  }
};

window.deleteSong = async function (id) {
  if (!confirm('Are you sure you want to delete this track?')) return;
  try {
    await api.deleteSong(id);
    import('../app.js').then(m => {
      m.showToast('success', 'Deleted', 'Track removed from your catalog.');
      m.navigate('artistDashboard', { artistTab: 'songs' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Error', 'Failed to delete track.'));
  }
};
