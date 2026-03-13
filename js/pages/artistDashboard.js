// =============================================
// 265Stream - Artist Dashboard
// =============================================
import { appState, formatNumber, formatCurrency, formatDate, getTimeAgo } from '../data.js';
import { api } from '../apiClient.js';
import { icon } from '../icons.js';

export async function renderArtistDashboard(container, params = {}) {
  const activeTab = params.artistTab || 'overview';

  container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading Artist Studio...</p></div>`;

  let artistSongs = [];
  let artistSales = [];
  let salesSummary = { totalSales: 0, totalRevenue: 0 };
  const user = api.getStoredUser() || appState.currentUser;

  try {
    const [songsRes, salesRes] = await Promise.all([
      api.getArtistSongs(),
      api.getArtistSales()
    ]);
    artistSongs = songsRes.songs || [];
    artistSales = salesRes.sales || [];
    salesSummary = salesRes.summary || { totalSales: 0, totalRevenue: 0 };
  } catch (err) {
    console.error('Artist fetch error:', err);
  }

  container.innerHTML = '';


  // Add sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-section">
      <div style="padding: 0 0.75rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary), #FF4444); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem;">
          ${user.full_name ? user.full_name.substring(0, 2).toUpperCase() : "A"}
        </div>
        <div>
          <div style="font-size: 0.875rem; font-weight: 700;">Artist Studio</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${user.full_name || user.username || "Artist"}</div>
        </div>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Studio</div>
      <div class="sidebar-link ${activeTab === 'overview' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'overview'})">
        ${icon('barChart', 20)} Dashboard
      </div>
      <div class="sidebar-link ${activeTab === 'upload' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'upload'})">
        ${icon('upload', 20)} Upload Music
      </div>
      <div class="sidebar-link ${activeTab === 'songs' ? 'active' : ''}" onclick="window.navigateTo('artistDashboard', {artistTab: 'songs'})">
        ${icon('music', 20)} My Songs
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
      <div class="sidebar-section-title">Account</div>
      <div class="sidebar-link" onclick="window.navigateTo('userDashboard', {dashboardTab: 'settings'})">
        ${icon('settings', 20)} Settings
      </div>
      <div class="sidebar-link" onclick="window.navigateTo('home')">
        ${icon('chevronLeft', 20)} Back to Home
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

  const tabs = {
    overview: () => renderArtistOverview(user, artistSongs, artistSales, salesSummary),
    upload: () => renderUpload(user),
    songs: () => renderMySongs(user, artistSongs),
    sales: () => renderSales(user, artistSales, salesSummary),
    analytics: () => renderAnalytics(user, artistSongs, artistSales),
  };

  const renderFn = tabs[activeTab] || tabs.overview;

  const wrapper = document.createElement('div');
  wrapper.className = 'page-container';
  wrapper.innerHTML = renderFn();
  container.appendChild(wrapper);

  // Initialize event handlers for the current tab
  initTabHandlers(activeTab, artistSongs);
}

function initTabHandlers(tab, artistSongs) {
  if (tab === 'upload') {
    initUploadHandlers();
  } else if (tab === 'songs') {
    // Other song specific handlers if needed
  }
}

function initUploadHandlers() {
  const audioDropZone = document.getElementById('audio-upload-zone');
  const coverDropZone = document.getElementById('cover-upload-zone');
  const audioInput = document.getElementById('audio-file-input');
  const coverInput = document.getElementById('cover-file-input');

  if (!audioDropZone || !coverDropZone) return;

  // Click to select
  audioDropZone.onclick = () => audioInput.click();
  coverDropZone.onclick = () => coverInput.click();

  // File selection updates
  audioInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      audioDropZone.innerHTML = `
        ${icon('check', 48)}
        <div class="upload-text">Selected: ${file.name}</div>
        <div class="upload-hint">Click to change</div>
      `;
      audioDropZone.style.borderColor = 'var(--success)';
    }
  };

  coverInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        coverDropZone.innerHTML = `
          <img src="${event.target.result}" style="width: 120px; height: 120px; border-radius: var(--radius-md); object-fit: cover; margin-bottom: 1rem;"/>
          <div class="upload-text">Artwork Selected</div>
          <div class="upload-hint">Click to change</div>
        `;
      };
      reader.readAsDataURL(file);
      coverDropZone.style.borderColor = 'var(--success)';
    }
  };

  // Drag and drop
  [audioDropZone, coverDropZone].forEach(zone => {
    zone.ondragover = (e) => { e.preventDefault(); zone.style.background = 'var(--bg-elevated)'; };
    zone.ondragleave = () => { zone.style.background = ''; };
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.style.background = '';
      const file = e.dataTransfer.files[0];
      const inputId = zone.id === 'audio-upload-zone' ? 'audio-file-input' : 'cover-file-input';
      document.getElementById(inputId).files = e.dataTransfer.files;
      document.getElementById(inputId).dispatchEvent(new Event('change'));
    };
  });
}

window.handleUpload = async function () {
  const audioInput = document.getElementById('audio-file-input');
  const coverInput = document.getElementById('cover-file-input');
  const titleInput = document.querySelector('input[placeholder="Enter song title"]');
  const albumInput = document.querySelector('input[placeholder="Album name (optional)"]');
  const genreSelect = document.querySelector('.form-select');
  const priceInput = document.querySelector('input[placeholder="0.99"]');
  const descTextarea = document.querySelector('.form-textarea');

  if (!audioInput.files[0]) {
    import('../app.js').then(m => m.showToast('error', 'Missing File', 'Please select an audio file to upload.'));
    return;
  }

  if (!titleInput.value) {
    import('../app.js').then(m => m.showToast('error', 'Missing Title', 'Please enter a song title.'));
    return;
  }

  const formData = new FormData();
  formData.append('audio', audioInput.files[0]);
  if (coverInput.files[0]) formData.append('cover', coverInput.files[0]);
  formData.append('title', titleInput.value);
  formData.append('albumName', albumInput.value);
  formData.append('genre', genreSelect.value);
  formData.append('price', priceInput.value || '0.99');
  formData.append('description', descTextarea.value);

  const uploadBtn = document.querySelector('.btn-primary');
  const originalHtml = uploadBtn.innerHTML;
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';

  try {
    const result = await api.uploadSong(formData);
    import('../app.js').then(m => {
      m.showToast('success', 'Upload Successful', 'Your song has been uploaded and is pending review.');
      m.navigate('artistDashboard', { artistTab: 'songs' });
    });
  } catch (err) {
    console.error('Upload failed:', err);
    import('../app.js').then(m => m.showToast('error', 'Upload Failed', err.message || 'An error occurred during upload.'));
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = originalHtml;
  }
};

window.deleteSong = async function (id) {
  if (!confirm('Are you sure you want to delete this song? This action cannot be undone.')) return;

  try {
    await api.deleteSong(id);
    import('../app.js').then(m => {
      m.showToast('success', 'Deleted', 'Song has been removed.');
      m.navigate('artistDashboard', { artistTab: 'songs' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Error', 'Failed to delete song.'));
  }
};

function renderArtistOverview(user, artistSongs, artistSales, salesSummary) {
  const totalStreams = artistSongs.reduce((a, s) => a + (s.play_count || s.plays || 0), 0);
  return `
    <div class="page-header">
      <h1>Artist Dashboard</h1>
      <p>Overview of your music and earnings</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: var(--primary);">
        <div class="stat-icon">${icon('music', 22)}</div>
        <div class="stat-value">${artistSongs.length}</div>
        <div class="stat-label">Total Songs</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +3 this month</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(parseFloat(salesSummary.totalRevenue || 0))}</div>
        <div class="stat-label">Total Earnings</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +18% this month</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('shoppingCart', 22)}</div>
        <div class="stat-value">${salesSummary.totalSales || 0}</div>
        <div class="stat-label">Total Sales</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +24% this month</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('headphones', 22)}</div>
        <div class="stat-value">${formatNumber(totalStreams)}</div>
        <div class="stat-label">Total Streams</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +12% this month</div>
      </div>
    </div>

    <!-- Revenue Chart Placeholder -->
    <div class="settings-card mb-3">
      <h3>Revenue Overview</h3>
      <div style="display: flex; align-items: flex-end; gap: 8px; height: 200px; padding-top: 1rem;">
        ${generateBarChart()}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; padding: 0 4px;">
        ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m =>
    `<span style="font-size: 0.65rem; color: var(--text-muted); flex: 1; text-align: center;">${m}</span>`
  ).join('')}
      </div>
    </div>

    <!-- Recent Sales -->
    <div class="section-header">
      <h2>Recent Sales</h2>
      <span class="see-all" onclick="window.navigateTo('artistDashboard', {artistTab: 'sales'})">
        View All ${icon('chevronRight', 16)}
      </span>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Buyer</th>
            <th>Song</th>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${artistSales.slice(0, 5).map(p => {
    return `
              <tr>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">
                      ${p.buyer?.name ? p.buyer.name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <span>${p.buyer?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div class="table-song-cell">
                    <img src="${p.song?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
                    <div class="song-info">
                      <div class="title">${p.song?.title || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td>${getTimeAgo(p.createdAt)}</td>
                <td style="font-weight: 700; color: var(--success);">${formatCurrency(p.amount)}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderUpload(user) {
  return `
    <div class="page-header">
      <h1>Upload Music</h1>
      <p>Share your music with the world</p>
    </div>

    <div class="settings-card">
      <h3>Upload Audio File</h3>
      <div class="file-upload-zone" id="audio-upload-zone">
        ${icon('upload', 48)}
        <div class="upload-text">Drag & drop your audio file here, or click to browse</div>
        <div class="upload-hint">Supported formats: MP3, WAV, FLAC, AAC • Max size: 50MB</div>
      </div>
      <input type="file" id="audio-file-input" accept="audio/*" style="display: none;">
    </div>

    <div class="settings-card">
      <h3>Cover Artwork</h3>
      <div class="file-upload-zone" id="cover-upload-zone" style="padding: 2rem;">
        <div style="width: 120px; height: 120px; border-radius: var(--radius-md); background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          ${icon('fileMusic', 40)}
        </div>
        <div class="upload-text">Upload cover artwork</div>
        <div class="upload-hint">PNG, JPG • Min 500x500px • Max 5MB</div>
      </div>
      <input type="file" id="cover-file-input" accept="image/*" style="display: none;">
    </div>

    <div class="settings-card">
      <h3>Song Details</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Song Title *</label>
          <input class="form-input" type="text" placeholder="Enter song title"/>
        </div>
        <div class="form-group">
          <label class="form-label">Album</label>
          <input class="form-input" type="text" placeholder="Album name (optional)"/>
        </div>
        <div class="form-group">
          <label class="form-label">Genre *</label>
          <select class="form-select">
            <option value="">Select genre</option>
            <option>Pop</option>
            <option>Hip-Hop</option>
            <option>R&B</option>
            <option>Rock</option>
            <option>Electronic</option>
            <option>Jazz</option>
            <option>Classical</option>
            <option>Country</option>
            <option>Lo-Fi</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Price (USD) *</label>
          <input class="form-input" type="number" min="0" step="0.01" placeholder="0.99"/>
        </div>
      </div>
      <div class="form-group" style="margin-top: 0.5rem;">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" placeholder="Tell listeners about this track..."></textarea>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        <button class="btn btn-primary" onclick="handleUpload()">
          ${icon('upload', 18)} Upload Song
        </button>
        <button class="btn btn-secondary">Save as Draft</button>
      </div>
    </div>
  `;
}

function renderMySongs(user, artistSongs) {
  return `
    <div class="page-header">
      <div class="flex justify-between items-center">
        <div>
          <h1>My Songs</h1>
          <p>Manage your published tracks</p>
        </div>
        <button class="btn btn-primary" onclick="window.navigateTo('artistDashboard', {artistTab: 'upload'})">
          ${icon('plus', 18)} Upload New Song
        </button>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Song</th>
            <th>Genre</th>
            <th>Price</th>
            <th>Plays</th>
            <th>Sales</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${artistSongs.length > 0 ? artistSongs.map(song => {
    return `
              <tr>
                <td>
                  <div class="table-song-cell">
                    <img src="${song.coverUrl || 'assets/images/albums/default.png'}" alt="${song.title}"/>
                    <div class="song-info">
                      <div class="title">${song.title}</div>
                      <div class="artist">${song.album_name || 'Single'}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-primary">${song.genre || 'N/A'}</span></td>
                <td style="font-weight: 600;">${formatCurrency(parseFloat(song.price) || 0)}</td>
                <td>${formatNumber(song.play_count || 0)}</td>
                <td>${formatNumber(song.purchase_count || 0)}</td>
                <td><span class="badge ${song.status === 'published' ? 'badge-success' : 'badge-warning'}">${song.status || 'Draft'}</span></td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" title="Edit">${icon('edit', 14)}</button>
                    <button class="btn btn-sm btn-ghost" title="Analytics">${icon('barChart', 14)}</button>
                    <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Delete" onclick="window.deleteSong('${song.id}')">${icon('trash', 14)}</button>
                  </div>
                </td>
              </tr>
            `;
  }).join('') : '<tr><td colspan="7" class="text-center" style="padding:2rem;">No songs uploaded yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderSales(user, artistSales, salesSummary) {
  return `
    <div class="page-header">
      <h1>Sales Dashboard</h1>
      <p>Track your revenue and buyer activity</p>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(parseFloat(salesSummary.totalRevenue) || 0)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('shoppingCart', 22)}</div>
        <div class="stat-value">${salesSummary.totalSales || 0}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('trendingUp', 22)}</div>
        <div class="stat-value">${salesSummary.totalSales > 0 ? formatCurrency(parseFloat(salesSummary.totalRevenue) / salesSummary.totalSales) : '$0.00'}</div>
        <div class="stat-label">Avg. Order Value</div>
      </div>
    </div>

    <div class="section-header mt-3">
      <h2>All Sales</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Buyer</th>
            <th>Song</th>
            <th>Date</th>
            <th>Payment</th>
            <th>Earnings</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${artistSales.length > 0 ? artistSales.map((p, i) => {
    return `
              <tr>
                <td style="font-weight: 600;">#${String(1000 + i).padStart(4, '0')}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">
                      ${p.buyer?.name ? p.buyer.name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <span>${p.buyer?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div class="table-song-cell">
                    <img src="${p.song?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
                    <div class="song-info">
                      <div class="title">${p.song?.title || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td>${formatDate(p.createdAt)}</td>
                <td style="font-size: 0.8rem;">${p.paymentMethod}</td>
                <td style="font-weight: 700; color: var(--success);">${formatCurrency(p.artistEarnings)}</td>
                <td><span class="badge badge-success">${icon('check', 10)} ${p.status}</span></td>
              </tr>
            `;
  }).join('') : '<tr><td colspan="7" class="text-center" style="padding:2rem;">No sales yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderAnalytics(user, artistSongs, artistSales) {
  const totalStreams = artistSongs.reduce((a, s) => a + (s.play_count || 0), 0);
  const totalRevenue = artistSales.reduce((a, s) => a + parseFloat(s.artistEarnings || 0), 0);

  return `
    <div class="page-header">
      <h1>Analytics</h1>
      <p>Deep insights into your music performance</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: var(--primary);">
        <div class="stat-icon">${icon('music', 22)}</div>
        <div class="stat-value">${artistSongs.length}</div>
        <div class="stat-label">Total Songs</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('shoppingCart', 22)}</div>
        <div class="stat-value">${artistSales.length}</div>
        <div class="stat-label">Total Sales</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
        <div class="stat-label">Total Earnings</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('users', 22)}</div>
        <div class="stat-value">${formatNumber(user.follower_count || 0)}</div>
        <div class="stat-label">Followers</div>
      </div>
    </div>

    <!-- Performance chart -->
    <div class="settings-card mb-3">
      <h3>Streaming Performance</h3>
      <div style="display: flex; align-items: flex-end; gap: 8px; height: 200px; padding-top: 1rem;">
        ${generateBarChart()}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; padding: 0 4px;">
        ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m =>
    `<span style="font-size: 0.65rem; color: var(--text-muted); flex: 1; text-align: center;">${m}</span>`
  ).join('')}
      </div>
    </div>

    <!-- Top Songs -->
    <div class="section-header mt-3">
      <h2>Top Performing Songs</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Song</th>
            <th>Plays</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
          ${[...artistSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 8).map((song, i) => {
    return `
              <tr>
                <td style="font-weight: 700; color: ${i < 3 ? 'var(--primary)' : 'var(--text-muted)'};">${i + 1}</td>
                <td>
                  <div class="table-song-cell">
                    <img src="${song.coverUrl || 'assets/images/albums/default.png'}" alt="${song.title}"/>
                    <div class="song-info">
                      <div class="title">${song.title}</div>
                      <div class="artist">${song.album_name || 'Single'}</div>
                    </div>
                  </div>
                </td>
                <td>${formatNumber(song.play_count || 0)}</td>
                <td>${formatNumber(song.purchase_count || 0)}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateBarChart() {
  const values = [35, 45, 55, 40, 65, 75, 85, 70, 90, 80, 95, 60];
  return values.map((v, i) => `
    <div style="
      flex: 1;
      height: ${v}%;
      background: ${i === values.length - 4 ? 'var(--primary)' : 'linear-gradient(to top, var(--primary), rgba(255,0,0,0.3))'};
      border-radius: 4px 4px 0 0;
      transition: all 0.3s;
      opacity: ${i <= new Date().getMonth() ? 1 : 0.3};
      cursor: pointer;
      position: relative;
    " title="$${(v * 30 + Math.floor(Math.random() * 200)).toFixed(0)}"
    onmouseover="this.style.opacity='1'; this.style.filter='brightness(1.2)'"
    onmouseout="this.style.opacity='${i <= new Date().getMonth() ? 1 : 0.3}'; this.style.filter=''"></div>
  `).join('');
}

window.handleUpload = function () {
  import('../app.js').then(m => {
    m.showToast('success', 'Song Uploaded!', 'Your song has been submitted for review.');
  });
};
