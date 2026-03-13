import { formatCurrency, formatDate } from '../../data.js';
import { icon } from '../../icons.js';

export function renderArtistSales(user, artistSales, salesSummary) {
    return `
    <div class="page-header">
      <h1>Sales & Earnings</h1>
      <p>Detailed breakdown of your revenue</p>
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
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('trendingUp', 22)}</div>
        <div class="stat-value">${salesSummary.totalSales > 0 ? formatCurrency(parseFloat(salesSummary.totalRevenue) / salesSummary.totalSales) : '$0.00'}</div>
        <div class="stat-label">Avg. Per Sale</div>
      </div>
    </div>

    <div class="section-header mt-3">
      <h2>All Transactions</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Buyer</th>
            <th>Song</th>
            <th>Date</th>
            <th>Earnings</th>
          </tr>
        </thead>
        <tbody>
          ${artistSales.length > 0 ? artistSales.map((p, i) => renderDetailedSaleRow(p, i)).join('') : '<tr><td colspan="5" style="padding:2rem; text-align:center;">No transactions found.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderDetailedSaleRow(p, i) {
    return `
    <tr>
      <td style="font-weight: 600; font-family: monospace;">#SR-${String(2000 + i).padStart(4, '0')}</td>
      <td>
        <div class="flex items-center gap-1">
          <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">
            ${p.buyer?.name ? p.buyer.name.substring(0, 2).toUpperCase() : '??'}
          </div>
          <span style="font-size: 0.85rem;">${p.buyer?.name || 'Unknown Buyer'}</span>
        </div>
      </td>
      <td>
        <div class="table-song-cell">
          <img src="${p.song?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
          <div class="song-info">
            <div class="title" style="font-size: 0.85rem;">${p.song?.title || 'Unknown Track'}</div>
          </div>
        </div>
      </td>
      <td style="font-size: 0.85rem;">${formatDate(p.createdAt)}</td>
      <td style="font-weight: 700; color: var(--success);">${formatCurrency(p.artistEarnings || p.amount || 0)}</td>
    </tr>
  `;
}
