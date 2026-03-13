import { formatDate, formatCurrency } from '../../data.js';
import { icon } from '../../icons.js';

export function renderPurchaseRecords(purchases = []) {
    const totalRevenue = purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return `
    <div class="page-header">
      <h1>Purchase Records</h1>
      <p>System-wide transaction history</p>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('shoppingCart', 22)}</div>
        <div class="stat-value">${purchases.length}</div>
        <div class="stat-label">Total Transactions</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('trendingUp', 22)}</div>
        <div class="stat-value">${formatCurrency(purchases.length > 0 ? totalRevenue / purchases.length : 0)}</div>
        <div class="stat-label">Avg. Order Value</div>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Buyer</th>
            <th>Song</th>
            <th>Artist</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${purchases.map(p => renderPurchaseRow(p)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPurchaseRow(p) {
    return `
    <tr>
      <td style="font-weight: 600; font-family: monospace; font-size: 0.8rem;">TXN-${p.id.substring(0, 6).toUpperCase()}</td>
      <td>
        <div class="flex items-center gap-1">
          <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">
            ${p.buyer?.full_name ? p.buyer.full_name.substring(0, 2).toUpperCase() : '??'}
          </div>
          <span style="font-size: 0.85rem;">${p.buyer?.full_name || 'Unknown'}</span>
        </div>
      </td>
      <td>
        <div class="table-song-cell">
          <img src="${p.song?.coverStoragePath || 'assets/images/albums/default.png'}" alt=""/>
          <div class="song-info">
            <div class="title" style="font-size: 0.85rem;">${p.song?.title || 'Unknown Track'}</div>
          </div>
        </div>
      </td>
      <td style="font-size: 0.85rem;">${p.artist?.artist_name || 'Unknown'}</td>
      <td style="font-size: 0.85rem;">${formatDate(p.created_at)}</td>
      <td style="font-weight: 700; color: var(--success);">${formatCurrency(p.amount || 0)}</td>
      <td><span class="badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}">${p.status}</span></td>
    </tr>
  `;
}
