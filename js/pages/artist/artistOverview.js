import { formatCurrency, formatNumber, getTimeAgo } from '../../data.js';
import { icon } from '../../icons.js';

export function renderArtistOverview(user, artistSongs, artistSales, salesSummary) {
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
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('shoppingCart', 22)}</div>
        <div class="stat-value">${salesSummary.totalSales || 0}</div>
        <div class="stat-label">Total Sales</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('headphones', 22)}</div>
        <div class="stat-value">${formatNumber(totalStreams)}</div>
        <div class="stat-label">Total Streams</div>
      </div>
    </div>

    <div class="settings-card mb-3">
      <h3>Revenue Overview</h3>
      <div style="display: flex; align-items: flex-end; gap: 8px; height: 180px; padding-top: 1rem;">
        ${generateBarChart()}
      </div>
    </div>

    <div class="section-header">
      <h2>Recent Sales</h2>
      <span class="see-all" onclick="window.navigateTo('artistDashboard', {artistTab: 'sales'})" style="cursor:pointer; color:var(--primary);">
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
          ${artistSales.length > 0 ? artistSales.slice(0, 5).map(p => renderSaleRow(p)).join('') : '<tr><td colspan="4" style="text-align:center; padding:2rem;">No sales yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderSaleRow(p) {
    return `
    <tr>
      <td>
        <div class="flex items-center gap-1">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">
            ${p.buyer?.name ? p.buyer.name.substring(0, 2).toUpperCase() : '??'}
          </div>
          <span style="font-size: 0.85rem;">${p.buyer?.name || 'Unknown'}</span>
        </div>
      </td>
      <td>
        <div class="table-song-cell">
          <img src="${p.song?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
          <div class="song-info">
            <div class="title" style="font-size: 0.85rem;">${p.song?.title || 'Unknown'}</div>
          </div>
        </div>
      </td>
      <td style="font-size: 0.85rem;">${getTimeAgo(p.createdAt)}</td>
      <td style="font-weight: 700; color: var(--success);">${formatCurrency(p.amount)}</td>
    </tr>
  `;
}

function generateBarChart() {
    const values = [35, 45, 55, 40, 65, 75, 85, 70, 90, 80, 95, 60];
    return values.map((v, i) => `
    <div style="
      flex: 1;
      height: ${v}%;
      background: ${i === values.length - 1 ? 'var(--primary)' : 'rgba(255,100,100,0.3)'};
      border-radius: 4px 4px 0 0;
    "></div>
  `).join('');
}
