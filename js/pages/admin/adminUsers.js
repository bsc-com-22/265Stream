import { formatDate } from '../../data.js';
import { api } from '../../apiClient.js';
import { icon } from '../../icons.js';

export function renderUserManagement(users = []) {
    return `
    <div class="page-header">
      <div class="flex justify-between items-center">
        <div>
          <h1>User Management</h1>
          <p>Manage registered users and system access</p>
        </div>
        <div class="flex gap-1">
          <div class="search-input-wrapper">
            ${icon('search', 16)}
            <input type="text" placeholder="Search users..." class="form-input" id="user-search">
          </div>
          <button class="btn btn-primary" onclick="window.addUser()">
            ${icon('plus', 18)} Add User
          </button>
        </div>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="user-table-body">
          ${users.map(user => renderUserRow(user)).join('')}
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

function renderUserRow(user) {
    return `
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
  `;
}
