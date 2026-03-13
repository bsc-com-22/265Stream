// =============================================
// 265Stream - Admin Panel (Main Shell)
// =============================================
import { api } from '../apiClient.js';
import { icon } from '../icons.js';
import { renderAdminOverview } from './admin/adminOverview.js';
import { renderUserManagement } from './admin/adminUsers.js';
import { renderArtistManagement } from './admin/adminArtists.js';
import { renderContentModeration } from './admin/adminContent.js';
import { renderPurchaseRecords } from './admin/adminPurchases.js';

export async function renderAdminPanel(container, params = {}) {
  const activeTab = params.adminTab || 'overview';

  container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading Admin Panel...</p></div>`;

  let adminData = { users: [], artists: [], songs: [], purchases: [], dashboard: {}, recentActivity: [] };

  try {
    // Fetch data based on active tab
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

  // Sidebar creation
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
      <div class="sidebar-link" onclick="window.location.href='index.html'">
        ${icon('chevronLeft', 20)} Back to Store
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

  // Page Content mapping
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
}

// ============================================
// ADMIN ACTION HANDLERS (Global for easy access from HTML)
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
