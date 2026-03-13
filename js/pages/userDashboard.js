// =============================================
// 265Stream - User Dashboard
// =============================================
import { appState, formatCurrency, formatDate, getTimeAgo } from '../data.js';
import { icon } from '../icons.js';
import { api } from '../apiClient.js';

export async function renderUserDashboard(container, params = {}) {
  const activeTab = params.dashboardTab || 'overview';

  // Show loading state first
  container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading dashboard...</p></div>`;

  try {
    // Fetch real data
    const purchasesRes = await api.getPurchaseHistory({ limit: 100 });
    const purchasesList = purchasesRes.purchases || [];
    const purchasedSongs = purchasesList.map(p => ({
      ...p.song,
      price: p.amount,
      purchasedAt: p.createdAt
    }));

    // Clear container to render actual UI
    container.innerHTML = '';

    // Build sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Dashboard</div>
        <div class="sidebar-link ${activeTab === 'overview' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'overview'})">
          ${icon('home', 20)} Overview
        </div>
        <div class="sidebar-link ${activeTab === 'purchases' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'purchases'})">
          ${icon('shoppingCart', 20)} My Purchases
          <span class="badge">${purchasedSongs.length}</span>
        </div>
        <div class="sidebar-link ${activeTab === 'library' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'library'})">
          ${icon('music', 20)} My Library
        </div>
        <div class="sidebar-link ${activeTab === 'favorites' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'favorites'})">
          ${icon('heart', 20)} Favorites
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Account</div>
        <div class="sidebar-link ${activeTab === 'settings' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'settings'})">
          ${icon('settings', 20)} Settings
        </div>
        <div class="sidebar-link" onclick="window.navigateTo('home')">
          ${icon('chevronLeft', 20)} Back to Home
        </div>
      </div>
    `;
    document.getElementById('app').insertBefore(sidebar, container);

    // Add overlay for mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    };
    document.getElementById('app').insertBefore(overlay, container);

    // Mobile toggle
    const toggle = document.createElement('button');
    toggle.className = 'mobile-sidebar-toggle';
    toggle.innerHTML = icon('menu', 24);
    toggle.onclick = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    };
    document.getElementById('app').appendChild(toggle);

    container.classList.add('has-sidebar');

    const wrapper = document.createElement('div');
    wrapper.className = 'page-container';
    container.appendChild(wrapper);

    // Render content based on tab
    const contentMap = {
      overview: () => renderOverview(purchasedSongs),
      purchases: () => renderPurchases(purchasesList),
      library: () => renderLibrary(purchasedSongs),
      favorites: renderFavorites,
      settings: renderSettings,
    };

    const renderFn = contentMap[activeTab] || (() => renderOverview(purchasedSongs));
    wrapper.innerHTML = renderFn();

  } catch (err) {
    console.error('User Dashboard error:', err);
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--error);">Failed to load dashboard data. Please try again later.</div>`;
  }
}

function renderOverview(purchasedSongs = []) {
  const totalSpent = purchasedSongs.reduce((sum, s) => sum + (s.price || 0), 0);
  const user = api.getStoredUser() || appState.currentUser;
  const firstName = user.full_name ? user.full_name.split(' ')[0] : 'Music Lover';

  return `
    <div class="page-header">
      <h1>Welcome back, ${firstName} 👋</h1>
      <p>Here's your listening overview</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: var(--primary);">
        <div class="stat-icon">${icon('music', 22)}</div>
        <div class="stat-value">${purchasedSongs.length}</div>
        <div class="stat-label">Songs Owned</div>
        <div class="stat-change up">
          ${icon('trendingUp', 12)} +2 this month
        </div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(totalSpent)}</div>
        <div class="stat-label">Total Spent</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('headphones', 22)}</div>
        <div class="stat-value">47</div>
        <div class="stat-label">Hours Listened</div>
        <div class="stat-change up">
          ${icon('trendingUp', 12)} +12% this week
        </div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('heart', 22)}</div>
        <div class="stat-value">8</div>
        <div class="stat-label">Favorites</div>
      </div>
    </div>

    <!-- Recently Purchased -->
    <section class="content-section">
      <div class="section-header">
        <h2>Recently Purchased</h2>
        <span class="see-all" onclick="window.navigateTo('userDashboard', {dashboardTab: 'purchases'})">
          View All ${icon('chevronRight', 16)}
        </span>
      </div>
      ${purchasedSongs.length > 0 ? `
        <div class="card-grid">
          ${purchasedSongs.map(s => `
            <div class="music-card" onclick="window.navigateTo('songDetail', {currentSongId: ${s.id}})">
              <div class="card-artwork">
                <img src="${s.cover}" alt="${s.title}" loading="lazy"/>
                <div class="play-overlay">
                  <div class="play-btn-circle" onclick="event.stopPropagation(); window.playSongById(${s.id})">
                    ${icon('play', 22)}
                  </div>
                </div>
              </div>
              <div class="card-info">
                <div class="card-title">${s.title}</div>
              </div>
              <div class="card-meta">
                <span class="badge badge-success">${icon('check', 10)} Owned</span>
                <button class="card-buy" style="background: var(--bg-elevated); color: var(--text-secondary);" onclick="event.stopPropagation();">
                  ${icon('download', 12)}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          ${icon('shoppingCart', 64)}
          <h3>No purchases yet</h3>
          <p>Browse our catalog and find music you love</p>
          <button class="btn btn-primary" onclick="window.navigateTo('home')">Browse Music</button>
        </div>
      `}
    </section>
  `;
}

function renderPurchases(purchasesList = []) {
  return `
    <div class="page-header">
      <h1>My Purchases</h1>
      <p>All your purchased songs and downloads</p>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Song</th>
            <th>Genre</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${purchasesList.length > 0 ? purchasesList.map(p => `
            <tr>
              <td>
                <div class="table-song-cell">
                  <img src="${p.song?.coverUrl || p.album?.coverUrl || 'assets/images/albums/default.png'}" alt="${p.song?.title || p.album?.title || 'Unknown'}"/>
                  <div class="song-info">
                    <div class="title">${p.song?.title || p.album?.title || 'Unknown'}</div>
                    <div class="artist">${p.artist?.name || 'Unknown Artist'}</div>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-primary">${p.song?.genre || 'N/A'}</span></td>
              <td>${p.song?.duration || '-'}</td>
              <td style="font-weight: 600; color: var(--text-primary);">${formatCurrency(p.amount)}</td>
              <td><span class="badge badge-success">${icon('check', 10)} Purchased</span></td>
              <td>
                <div class="flex gap-1">
                  ${p.song ? `
                  <button class="btn btn-sm btn-primary" onclick="window.playSongById('${p.song.id}')">
                    ${icon('play', 14)} Play
                  </button>
                  <button class="btn btn-sm btn-secondary">
                    ${icon('download', 14)} Download
                  </button>` : ''}
                </div>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="6">
                <div class="empty-state" style="padding: 3rem;">
                  ${icon('shoppingCart', 48)}
                  <h3>No purchases yet</h3>
                  <p>Start exploring and buy music you love</p>
                </div>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function renderLibrary(purchasedSongs = []) {
  return `
    <div class="page-header">
      <h1>My Library</h1>
      <p>Your complete music collection</p>
    </div>

    ${purchasedSongs.length > 0 ? `
      <div class="card-grid large">
        ${purchasedSongs.map(s => `
          <div class="music-card" onclick="window.navigateTo('songDetail', {currentSongId: '${s.id}'})">
            <div class="card-artwork">
              <img src="${s.coverUrl || 'assets/images/albums/default.png'}" alt="${s.title}" loading="lazy"/>
              <div class="play-overlay">
                <div class="play-btn-circle" onclick="event.stopPropagation(); window.playSongById('${s.id}')">
                  ${icon('play', 22)}
                </div>
              </div>
            </div>
            <div class="card-info">
              <div class="card-title">${s.title}</div>
            </div>
            <div class="card-meta">
              <span class="badge badge-success">${icon('check', 10)} Owned</span>
              <button class="card-buy" style="background: var(--bg-elevated);" onclick="event.stopPropagation(); window.playSongById('${s.id}')">
                ${icon('play', 12)}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        ${icon('music', 64)}
        <h3>Your library is empty</h3>
        <p>Purchase songs to build your collection</p>
        <button class="btn btn-primary" onclick="window.navigateTo('home')">Browse Music</button>
      </div>
    `}
  `;
}

function renderFavorites() {
  return `
    <div class="page-header">
      <h1>Favorites</h1>
      <p>Songs you've liked</p>
    </div>

    <div class="empty-state">
      ${icon('heart', 64)}
      <h3>No favorites yet</h3>
      <p>Tap the heart icon on any song to save it here</p>
      <button class="btn btn-primary" onclick="window.navigateTo('home')">Explore Music</button>
    </div>
  `;
}

function renderSettings() {
  const user = api.getStoredUser() || appState.currentUser;
  const username = user.full_name ? user.full_name.split(' ')[0].toLowerCase() : 'user';
  return `
    <div class="page-header">
      <h1>Account Settings</h1>
      <p>Manage your profile and preferences</p>
    </div>

    <div class="settings-card">
      <h3>Profile Information</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" type="text" value="${api.getStoredUser()?.full_name || appState.currentUser.name}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" value="${api.getStoredUser()?.email || appState.currentUser.email}" readonly/>
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input class="form-input" type="text" value="@${username}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" type="tel" placeholder="+1 (555) 000-0000"/>
        </div>
      </div>
      <div class="form-group" style="margin-top: 0.5rem;">
        <label class="form-label">Bio</label>
        <textarea class="form-textarea" placeholder="Tell us about yourself...">Music enthusiast and audiophile.</textarea>
      </div>
      <button class="btn btn-primary mt-2">Save Changes</button>
    </div>

    <div class="settings-card">
      <h3>Password & Security</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input class="form-input" type="password" placeholder="••••••••"/>
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input class="form-input" type="password" placeholder="••••••••"/>
        </div>
      </div>
      <button class="btn btn-secondary mt-2">Update Password</button>
    </div>

    <div class="settings-card">
      <h3>Notifications</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${renderToggle('Email Notifications', 'New releases from artists you follow', true)}
        ${renderToggle('Purchase Receipts', 'Email confirmation for purchases', true)}
        ${renderToggle('Marketing Emails', 'Promotions and offers', false)}
        ${renderToggle('Push Notifications', 'Browser notifications for updates', true)}
      </div>
    </div>

    <div class="settings-card" style="border-color: rgba(239,68,68,0.3);">
      <h3 style="color: var(--danger);">Danger Zone</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      <button class="btn btn-sm" style="background: rgba(239,68,68,0.12); color: var(--danger);">
        Delete Account
      </button>
    </div>
  `;
}

function renderToggle(label, desc, on) {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0;">
      <div>
        <div style="font-size: 0.875rem; font-weight: 600;">${label}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${desc}</div>
      </div>
      <label style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer;">
        <input type="checkbox" ${on ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
        <span style="
          position: absolute; inset: 0;
          background: ${on ? 'var(--primary)' : 'var(--border)'};
          border-radius: 12px;
          transition: 0.3s;
        "></span>
        <span style="
          position: absolute;
          width: 18px; height: 18px;
          background: white;
          border-radius: 50%;
          top: 3px;
          left: ${on ? '23px' : '3px'};
          transition: 0.3s;
        "></span>
      </label>
    </div>
  `;
}
