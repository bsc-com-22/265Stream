import { formatCurrency, formatNumber } from '../../data.js';
import { icon } from '../../icons.js';
import { api } from '../../apiClient.js';

export function renderUserOverview(purchasedSongs = []) {
    const totalSpent = purchasedSongs.reduce((sum, s) => sum + (s.price || 0), 0);
    const user = api.getStoredUser() || {};
    const firstName = user.full_name ? user.full_name.split(' ')[0] : 'Music Lover';

    return `
    <div class="page-header">
      <h1>Welcome back, ${firstName} 👋</h1>
      <p>Here's what's happening with your collection</p>
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
      </div>
    </div>

    <!-- Recently Purchased -->
    <section class="content-section" style="margin-top: 2rem;">
      <div class="section-header">
        <h2>Recently Purchased</h2>
        <span class="see-all" onclick="window.navigateTo('userDashboard', {dashboardTab: 'purchases'})" style="cursor: pointer; color: var(--primary); font-weight: 600;">
          View All ${icon('chevronRight', 16)}
        </span>
      </div>
      
      ${purchasedSongs.length > 0 ? `
        <div class="card-grid">
          ${purchasedSongs.slice(0, 4).map(s => renderMiniCard(s)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <h3>No purchases yet</h3>
          <p>Find your first favorite song today</p>
          <button class="btn btn-primary" onclick="window.navigateTo('home')" style="margin-top: 1rem;">Explore Catalog</button>
        </div>
      `}
    </section>
  `;
}

function renderMiniCard(s) {
    return `
    <div class="music-card" onclick="window.navigateTo('songDetail', {currentSongId: '${s.id}'})">
      <div class="card-artwork">
        <img src="${s.coverUrl || 'assets/images/albums/default.png'}" alt="${s.title}"/>
      </div>
      <div class="card-info">
        <div class="card-title">${s.title}</div>
      </div>
    </div>
  `;
}
