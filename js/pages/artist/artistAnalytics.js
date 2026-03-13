import { formatCurrency, formatNumber } from '../../data.js';
import { icon } from '../../icons.js';

export function renderArtistAnalytics(user, artistSongs, artistSales) {
    const totalRevenue = artistSales.reduce((a, s) => a + parseFloat(s.artistEarnings || s.amount || 0), 0);

    return `
    <div class="page-header">
      <h1>Analytics Studio</h1>
      <p>In-depth performance data for your catalog</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: var(--primary);">
        <div class="stat-icon">${icon('music', 22)}</div>
        <div class="stat-value">${artistSongs.length}</div>
        <div class="stat-label">Total Tracks</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('shoppingCart', 22)}</div>
        <div class="stat-value">${artistSales.length}</div>
        <div class="stat-label">Units Sold</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
        <div class="stat-label">Creator Earnings</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('users', 22)}</div>
        <div class="stat-value">${formatNumber(user.follower_count || 0)}</div>
        <div class="stat-label">Total Followers</div>
      </div>
    </div>

    <div class="settings-card mt-3">
      <h3>Audience Engagement</h3>
      <div style="display: flex; align-items: flex-end; gap: 8px; height: 150px; padding-top: 1rem;">
        ${generateAnalyticsChart()}
      </div>
    </div>

    <div class="section-header mt-3">
      <h2>Top Performing Content</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Song</th>
            <th>Total Plays</th>
            <th>Units Sold</th>
          </tr>
        </thead>
        <tbody>
          ${[...artistSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5).map((song, i) => `
            <tr>
              <td style="font-weight: 800; color: var(--primary); font-size: 1.1rem;">#${i + 1}</td>
              <td>
                <div class="table-song-cell">
                  <img src="${song.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
                  <div class="song-info">
                    <div class="title" style="font-weight: 600;">${song.title}</div>
                  </div>
                </div>
              </td>
              <td style="font-weight: 500;">${formatNumber(song.play_count || 0)}</td>
              <td>${formatNumber(song.purchase_count || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateAnalyticsChart() {
    const values = [20, 30, 45, 60, 55, 70, 80, 75, 90, 85, 95, 100];
    return values.map((v, i) => `
    <div style="
      flex: 1;
      height: ${v}%;
      background: var(--info);
      border-radius: 3px 3px 0 0;
      opacity: 0.8;
    "></div>
  `).join('');
}
