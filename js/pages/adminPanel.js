// =============================================
// 265Stream - Admin Panel
// =============================================
import { appState, formatNumber, formatCurrency, formatDate, getTimeAgo } from '../data.js';
import { api } from '../apiClient.js';
import { icon } from '../icons.js';

export async function renderAdminPanel(container, params = {}) {
  const activeTab = params.adminTab || 'overview';

  container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading Admin Panel...</p></div>`;

  let adminData = { users: [], artists: [], songs: [], purchases: [], dashboard: {} };
  try {
    if (activeTab === 'overview') {
      const dash = await api.getAdminDashboard();
      adminData.dashboard = dash.stats || {};
      adminData.recentActivity = dash.recentActivity || [];
    } else if (activeTab === 'users') {
      const res = await api.getAdminUsers({ limit: 100 });
      adminData.users = res.users || [];
    } else if (activeTab === 'artists') {
      const res = await api.getAdminArtists();
      adminData.artists = res.artists || [];
    } else if (activeTab === 'content') {
      const res = await api.getAdminContent({ limit: 100 });
      adminData.songs = res.songs || [];
    } else if (activeTab === 'purchases') {
      const res = await api.getAdminPurchases({ limit: 100 });
      adminData.purchases = res.purchases || [];
    }
  } catch (err) {
    console.error('Admin API error:', err);
  }

  container.innerHTML = '';


  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-section">
      <div style="padding: 0 0.75rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--primary), #FF4444); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem;">
          ${icon('shield', 20)}
        </div>
        <div>
          <div style="font-size: 0.875rem; font-weight: 700;">Admin Panel</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">System Management</div>
        </div>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Management</div>
      <div class="sidebar-link ${activeTab === 'overview' ? 'active' : ''}" onclick="window.navigateTo('admin', {adminTab: 'overview'})">
        ${icon('grid', 20)} Dashboard
      </div>
      <div class="sidebar-link ${activeTab === 'users' ? 'active' : ''}" onclick="window.navigateTo('admin', {adminTab: 'users'})">
        ${icon('users', 20)} Users
        
      </div>
      <div class="sidebar-link ${activeTab === 'artists' ? 'active' : ''}" onclick="window.navigateTo('admin', {adminTab: 'artists'})">
        ${icon('mic', 20)} Artists
        
      </div>
      <div class="sidebar-link ${activeTab === 'content' ? 'active' : ''}" onclick="window.navigateTo('admin', {adminTab: 'content'})">
        ${icon('music', 20)} Content
        
      </div>
      <div class="sidebar-link ${activeTab === 'purchases' ? 'active' : ''}" onclick="window.navigateTo('admin', {adminTab: 'purchases'})">
        ${icon('creditCard', 20)} Purchases
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">System</div>
      <div class="sidebar-link" onclick="window.navigateTo('admin', {adminTab: 'settings'})">
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
    overview: () => renderAdminOverview(adminData.dashboard, adminData.recentActivity),
    users: () => renderUserManagement(adminData.users),
    artists: () => renderArtistManagement(adminData.artists),
    content: () => renderContentModeration(adminData.songs),
    purchases: () => renderPurchaseRecords(adminData.purchases),
  };

  const renderFn = tabs[activeTab] || tabs.overview;

  const wrapper = document.createElement('div');
  wrapper.className = 'page-container';
  wrapper.innerHTML = renderFn();
  container.appendChild(wrapper);

  // Initialize handlers for the current tab
  initAdminHandlers(activeTab);
}

function initAdminHandlers(tab) {
  if (tab === 'users') {
    // User-specific management logic
  }
}

// ============================================
// ADMIN ACTION HANDLERS
// ============================================

window.toggleUserStatus = async function (userId, currentStatus) {
  const action = currentStatus ? 'suspend' : 'reactivate';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;

  try {
    await api.suspendUser(userId, currentStatus, `Admin ${action}`);
    import('../app.js').then(m => {
      m.showToast('success', 'User Updated', `User has been ${currentStatus ? 'suspended' : 'reactivated'}.`);
      m.navigate('admin', { adminTab: 'users' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Update Failed', err.message || 'Failed to update user.'));
  }
};

window.changeUserRole = async function (userId) {
  const newRole = prompt('Enter new role (listener, artist, admin):');
  if (!newRole || !['listener', 'artist', 'admin'].includes(newRole)) {
    if (newRole) alert('Invalid role. Please enter listener, artist, or admin.');
    return;
  }

  try {
    await api.changeUserRole(userId, newRole);
    import('../app.js').then(m => {
      m.showToast('success', 'Role Updated', `User role changed to ${newRole}.`);
      m.navigate('admin', { adminTab: 'users' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Update Failed', err.message || 'Failed to update role.'));
  }
};

window.approveArtistAction = async function (artistId, approve) {
  const action = approve ? 'approve' : 'reject';
  if (!confirm(`Are you sure you want to ${action} this artist?`)) return;

  try {
    await api.approveArtist(artistId, approve);
    import('../app.js').then(m => {
      m.showToast('success', 'Artist Updated', `Artist application ${action}ed.`);
      m.navigate('admin', { adminTab: 'artists' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Update Failed', err.message || 'Failed to update artist status.'));
  }
};

window.toggleArtistVerification = async function (artistId, currentVerified) {
  const newStatus = !currentVerified;
  try {
    await api.verifyArtist(artistId, newStatus);
    import('../app.js').then(m => {
      m.showToast('success', 'Artist Updated', `Artist verification ${newStatus ? 'added' : 'removed'}.`);
      m.navigate('admin', { adminTab: 'artists' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Update Failed', err.message || 'Failed to update verification.'));
  }
};

window.moderateSongAction = async function (songId, status) {
  const actionLabel = status === 'published' ? 'approve' : status === 'removed' ? 'remove' : 'moderate';
  if (!confirm(`Are you sure you want to ${actionLabel} this content?`)) return;

  try {
    await api.moderateContent(songId, status, `Admin ${actionLabel}`);
    import('../app.js').then(m => {
      m.showToast('success', 'Content Updated', `Song status set to ${status}.`);
      m.navigate('admin', { adminTab: 'content' });
    });
  } catch (err) {
    import('../app.js').then(m => m.showToast('error', 'Action Failed', err.message || 'Failed to moderate content.'));
  }
};

function renderAdminOverview(stats = {}, recentActivity = []) {
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

    <!--Activity cards-- >
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-top: 1rem;">
      <div class="settings-card" style="margin-bottom: 0;">
        <h3>Recent Activity</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${recentActivity.slice(0, 5).map(item => {
    let iconName = 'activity'; let color = 'var(--info)';
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
  }).join('')}
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
    </div >
    `;
}

function renderUserManagement(users = []) {
  return `
    < div class="page-header" >
      <div class="flex justify-between items-center">
        <div>
          <h1>User Management</h1>
          <p>Manage registered users on the platform</p>
        </div>
        <button class="btn btn-primary">
          ${icon('plus', 18)} Add User
        </button>
      </div>
    </div >

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Purchases</th>
            <th>Spent</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>
                <div class="flex items-center gap-1">
                  <div style="width: 36px; height: 36px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
                    ${user.full_name ? user.full_name.substring(0, 2).toUpperCase() : "U"}
                  </div>
                  <span style="font-weight: 600;">${user.full_name || user.username || "User"}</span>
                </div>
              </td>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${user.email}</td>
              <td>
                <span class="badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'artist' ? 'badge-primary' : 'badge-info'}">${user.role}</span>
              </td>
              <td>${formatDate(user.created_at)}</td>
              <td>-</td>
              <td style="font-weight: 600;">-</td>
              <td><span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">${user.is_active ? 'Active' : 'Suspended'}</span></td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-sm btn-ghost" title="View Details">${icon('eye', 14)}</button>
                  <button class="btn btn-sm btn-ghost" title="Change Role" onclick="window.changeUserRole('${user.id}')">${icon('user', 14)}</button>
                  <button class="btn btn-sm btn-ghost" style="color: ${user.is_active ? 'var(--danger)' : 'var(--success)'};" 
                    title="${user.is_active ? 'Suspend' : 'Reactivate'}" 
                    onclick="window.toggleUserStatus('${user.id}', ${user.is_active})">
                    ${icon(user.is_active ? 'xCircle' : 'checkCircle', 14)}
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="active">1</button>
      <button>2</button>
      <button>3</button>
      <button>${icon('chevronRight', 14)}</button>
    </div>
  `;
}

function renderArtistManagement(artists = []) {
  return `
    < div class="page-header" >
      <div class="flex justify-between items-center">
        <div>
          <h1>Artist Management</h1>
          <p>Manage verified and pending artists</p>
        </div>
        <button class="btn btn-primary">
          ${icon('plus', 18)} Add Artist
        </button>
      </div>
    </div >

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Artist</th>
            <th>Genre</th>
            <th>Songs</th>
            <th>Followers</th>
            <th>Verified</th>
            <th>Revenue</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${artists.map(artist => {
    const revenue = artist.total_earnings || 0;
    return `
              <tr>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 36px; height: 36px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary), #FF4444); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
                      ${artist.artist_name ? artist.artist_name.substring(0, 2).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <span style="font-weight: 600;">${artist.artist_name || 'Unknown'}</span>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-primary">Various</span></td>
                <td>-</td>
                <td>${formatNumber(artist.follower_count || 0)}</td>
                <td>
                  ${artist.verified
        ? `<span class="badge badge-success">${icon('check', 10)} Verified</span>`
        : `<span class="badge badge-warning">Pending</span>`
      }
                </td>
                <td style="font-weight: 600; color: var(--success);">${formatCurrency(parseFloat(revenue))}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" title="View Profile">${icon('eye', 14)}</button>
                    ${artist.status === 'pending' ? `<button class="btn btn-sm btn-ghost" style="color: var(--success);" title="Approve" onclick="window.approveArtistAction('${artist.id}', true)">${icon('check', 14)}</button>` : ''}
                    <button class="btn btn-sm btn-ghost" style="color: ${artist.verified ? 'var(--warning)' : 'var(--success)'};" 
                      title="${artist.verified ? 'Unverify' : 'Verify'}" 
                      onclick="window.toggleArtistVerification('${artist.id}', ${artist.verified})">
                      ${icon('shield', 14)}
                    </button>
                    <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Suspend Artist" onclick="window.approveArtistAction('${artist.id}', false)">${icon('slash', 14)}</button>
                  </div>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderContentModeration(songs = []) {
  return `
    < div class="page-header" >
      <h1>Content Moderation</h1>
      <p>Review and manage all music content on the platform</p>
    </div >

    < !--Filter Tabs-- >
    <div class="tabs">
      <div class="tab active">All Content</div>
      <div class="tab">Published</div>
      <div class="tab">Pending Review</div>
      <div class="tab">Flagged</div>
      <div class="tab">Removed</div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Song</th>
            <th>Artist</th>
            <th>Genre</th>
            <th>Price</th>
            <th>Upload Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${songs.map((song, i) => {
    const status = song.status || 'published';
    const statusClass = status === 'published' ? 'badge-success' : status === 'pending_review' ? 'badge-warning' : 'badge-danger';
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
                <td style="font-weight: 500;">${song.artist?.artist_name || 'Unknown'}</td>
                <td><span class="badge badge-primary">${song.genre || '-'}</span></td>
                <td>${formatCurrency(song.price || 0)}</td>
                <td>${formatDate(song.created_at)}</td>
                <td><span class="badge ${statusClass}">${status === 'published' ? icon('check', 10) + ' ' : ''}${status}</span></td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" title="Preview">${icon('eye', 14)}</button>
                    ${status === 'pending_review' ? `<button class="btn btn-sm btn-ghost" style="color: var(--success);" title="Approve" onclick="window.moderateSongAction('${song.id}', 'published')">${icon('check', 14)}</button>` : ''}
                    ${status === 'published' ? `<button class="btn btn-sm btn-ghost" style="color: var(--warning);" title="Flag" onclick="window.moderateSongAction('${song.id}', 'flagged')">${icon('flag', 14)}</button>` : ''}
                    <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Remove Content" onclick="window.moderateSongAction('${song.id}', 'removed')">${icon('trash', 14)}</button>
                  </div>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPurchaseRecords(purchases = []) {
  const totalRevenue = purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return `
    < div class="page-header" >
      <h1>Purchase Records</h1>
      <p>Complete transaction history</p>
    </div >

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
        <div class="stat-value">${formatCurrency(totalRevenue / purchases.length)}</div>
        <div class="stat-label">Avg. Transaction</div>
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
            <th>Payment</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${purchases.map((p, i) => {
    return `
              <tr>
                <td style="font-weight: 600; font-family: monospace; font-size: 0.8rem;">TXN-${p.id.substring(0, 6).toUpperCase()}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">
                      ${p.buyer?.full_name ? p.buyer.full_name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <span>${p.buyer?.full_name || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div class="table-song-cell">
                    <img src="${p.song?.coverStoragePath || 'assets/images/albums/default.png'}" alt=""/>
                    <div class="song-info">
                      <div class="title">${p.song?.title || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td>${p.artist?.artist_name || 'Unknown'}</td>
                <td>${formatDate(p.created_at)}</td>
                <td style="font-size: 0.8rem;">${p.payment_method || 'card'}</td>
                <td style="font-weight: 700; color: var(--success);">${formatCurrency(p.amount || 0)}</td>
                <td><span class="badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}">${icon('check', 10)} ${p.status}</span></td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
