import { api } from '../../apiClient.js';
import { appState } from '../../data.js';

export function renderUserSettings() {
    const user = api.getStoredUser() || appState.currentUser;
    const username = user.full_name ? user.full_name.split(' ')[0].toLowerCase() : 'user';

    return `
    <div class="page-header">
      <h1>Account Settings</h1>
      <p>Manage your profile and security</p>
    </div>

    <div class="settings-card">
      <h3>Profile Information</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" type="text" id="setting-fullname" value="${user.full_name || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" value="${user.email || ''}" readonly/>
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input class="form-input" type="text" value="@${username}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" type="tel" placeholder="+1 (555) 000-0000"/>
        </div>
      </div>
      <div class="form-group" style="margin-top: 0.5rem;">
        <label class="form-label">Bio</label>
        <textarea class="form-textarea" placeholder="Tell us about yourself...">Music enthusiast and audiophile.</textarea>
      </div>
      <button class="btn btn-primary mt-2" onclick="window.saveProfile()">Save Changes</button>
    </div>

    <div class="settings-card">
      <h3>Password & Security</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input class="form-input" type="password" placeholder="••••••••"/>
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input class="form-input" type="password" placeholder="••••••••"/>
        </div>
      </div>
      <button class="btn btn-secondary mt-2">Update Password</button>
    </div>

    <div class="settings-card" style="border-color: rgba(239,68,68,0.3);">
      <h3 style="color: var(--danger);">Danger Zone</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      <button class="btn btn-sm" style="background: rgba(239,68,68,0.12); color: var(--danger);">
        Delete Account
      </button>
    </div>
  `;
}
