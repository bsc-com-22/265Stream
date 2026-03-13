// =============================================
// 265Stream - User Dashboard (Shell)
// =============================================
import { api } from '../apiClient.js';
import { icon } from '../icons.js';
import { renderUserOverview } from './user/userOverview.js';
import { renderUserPurchases } from './user/userPurchases.js';
import { renderUserLibrary } from './user/userLibrary.js';
import { renderUserSettings } from './user/userSettings.js';

export async function renderUserDashboard(container, params = {}) {
  const activeTab = params.dashboardTab || 'overview';

  container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading dashboard...</p></div>`;

  try {
    const purchasesRes = await api.getPurchaseHistory({ limit: 100 });
    const purchasesList = purchasesRes.purchases || [];
    const purchasedSongs = purchasesList.map(p => ({
      ...p.song,
      id: p.song?.id,
      price: p.amount,
      purchasedAt: p.createdAt
    })).filter(s => s.id);

    container.innerHTML = '';

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Library</div>
        <div class="sidebar-link ${activeTab === 'overview' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'overview'})">
          ${icon('grid', 20)} Overview
        </div>
        <div class="sidebar-link ${activeTab === 'purchases' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'purchases'})">
          ${icon('shoppingCart', 20)} Purchases
          <span class="badge">${purchasedSongs.length}</span>
        </div>
        <div class="sidebar-link ${activeTab === 'library' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'library'})">
          ${icon('music', 20)} My Collection
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Personal</div>
        <div class="sidebar-link ${activeTab === 'settings' ? 'active' : ''}" onclick="window.navigateTo('userDashboard', {dashboardTab: 'settings'})">
          ${icon('settings', 20)} Settings
        </div>
        <div class="sidebar-link" onclick="window.location.href='index.html'">
          ${icon('chevronLeft', 20)} Back to Store
        </div>
      </div>
    `;
    document.getElementById('app').insertBefore(sidebar, container);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); };
    document.getElementById('app').insertBefore(overlay, container);

    // Toggle
    const toggle = document.createElement('button');
    toggle.className = 'mobile-sidebar-toggle';
    toggle.innerHTML = icon('menu', 24);
    toggle.onclick = () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); };
    document.getElementById('app').appendChild(toggle);

    container.classList.add('has-sidebar');

    const wrapper = document.createElement('div');
    wrapper.className = 'page-container';
    container.appendChild(wrapper);

    const tabs = {
      overview: () => renderUserOverview(purchasedSongs),
      purchases: () => renderUserPurchases(purchasesList),
      library: () => renderUserLibrary(purchasedSongs),
      settings: renderUserSettings,
    };

    const renderFn = tabs[activeTab] || tabs.overview;
    wrapper.innerHTML = renderFn();

  } catch (err) {
    console.error('User Dashboard error:', err);
    container.innerHTML = `<div style="text-align:center; padding: 3rem; color:var(--error);">Failed to load dashboard. Please refresh.</div>`;
  }
}
