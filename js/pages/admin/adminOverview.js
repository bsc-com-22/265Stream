import { formatCurrency, getTimeAgo } from '../../data.js';
import { icon } from '../../icons.js';

export function renderAdminOverview(stats = {}, recentActivity = []) {
    const totalRevenue = stats.totalRevenue || 0;

    return `
    <div class="page-header">
      <h1>Admin Dashboard</h1>
      <p>System overview and platform metrics</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">${icon('users', 22)}</div>
        <div class="stat-value">${stats.totalUsers || 0}</div>
        <div class="stat-label">Total Users</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +12 this month</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--primary);">
        <div class="stat-icon">${icon('mic', 22)}</div>
        <div class="stat-value">${stats.totalArtists || 0}</div>
        <div class="stat-label">Artists</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +2 this month</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">${icon('music', 22)}</div>
        <div class="stat-value">${stats.totalSongs || 0}</div>
        <div class="stat-label">Total Songs</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">${icon('dollarSign', 22)}</div>
        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
        <div class="stat-label">Platform Revenue</div>
        <div class="stat-change up">${icon('trendingUp', 12)} +8% this month</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; margin-top: 1rem;">
      <div class="settings-card" style="margin-bottom: 0;">
        <h3>Recent Activity</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${recentActivity.length > 0 ? recentActivity.slice(0, 10).map(item => renderActivityItem(item)).join('') : '<p style="color:var(--text-muted);">No recent activity</p>'}
        </div>
      </div>

      <div class="settings-card" style="margin-bottom: 0;">
        <h3>Platform Health</h3>
        <div style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 0.5rem;">
          ${renderHealthBar('Server Uptime', 99.9, 'var(--success)')}
          ${renderHealthBar('Storage Used', 45, 'var(--info)')}
          ${renderHealthBar('Bandwidth', 62, 'var(--warning)')}
          ${renderHealthBar('API Calls', 78, 'var(--primary)')}
          ${renderHealthBar('Error Rate', 2, 'var(--success)')}
        </div>
      </div>
    </div>
  `;
}

function renderActivityItem(item) {
    let iconName = 'activity';
    let color = 'var(--info)';
    if (item.action.includes('user')) { iconName = 'user'; color = 'var(--primary)'; }
    if (item.action.includes('artist')) { iconName = 'mic'; color = 'var(--warning)'; }
    if (item.action.includes('purchase')) { iconName = 'shoppingCart'; color = 'var(--success)'; }
    if (item.action.includes('content')) { iconName = 'music'; color = 'var(--danger)'; }

    return `
    <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
      <div style="width: 36px; height: 36px; border-radius: var(--radius-full); background: ${color}15; color: ${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        ${icon(iconName, 16)}
      </div>
      <div style="flex: 1;">
        <div style="font-size: 0.85rem; font-weight: 500;">${item.actor?.full_name || 'System'} ${item.action.replace('.', ' ')}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${getTimeAgo(item.created_at)}</div>
      </div>
    </div>
  `;
}

function renderHealthBar(label, value, color) {
    return `
    <div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
        <span style="font-size: 0.8rem; font-weight: 500;">${label}</span>
        <span style="font-size: 0.8rem; font-weight: 700; color: ${color};">${value}%</span>
      </div>
      <div style="height: 6px; background: var(--border); border-radius: var(--radius-full); overflow: hidden;">
        <div style="height: 100%; width: ${value}%; background: ${color}; border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
      </div>
    </div>
  `;
}
