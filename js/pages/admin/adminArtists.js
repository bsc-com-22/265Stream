import { formatNumber, formatCurrency } from '../../data.js';
import { icon } from '../../icons.js';

export function renderArtistManagement(artists = []) {
    return `
    <div class="page-header">
      <div class="flex justify-between items-center">
        <div>
          <h1>Artist Management</h1>
          <p>Review applications and manage verified artists</p>
        </div>
        <div class="flex gap-1">
          <div class="search-input-wrapper">
            ${icon('search', 16)}
            <input type="text" placeholder="Search artists..." class="form-input" id="artist-search">
          </div>
          <button class="btn btn-primary">
            ${icon('plus', 18)} Add Artist
          </button>
        </div>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Artist</th>
            <th>Genre</th>
            <th>Followers</th>
            <th>Verify Status</th>
            <th>Revenue</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${artists.map(artist => renderArtistRow(artist)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderArtistRow(artist) {
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
            <div style="font-size: 0.7rem; color: var(--text-muted);">${artist.status}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-primary">Various</span></td>
      <td>${formatNumber(artist.follower_count || 0)}</td>
      <td>
        ${artist.verified
            ? `<span class="badge badge-success">${icon('check', 10)} Verified</span>`
            : `<span class="badge badge-warning">Standard</span>`
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
}
