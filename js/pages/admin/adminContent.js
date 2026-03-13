import { formatDate, formatCurrency } from '../../data.js';
import { icon } from '../../icons.js';

export function renderContentModeration(songs = []) {
    return `
    <div class="page-header">
      <h1>Content Moderation</h1>
      <p>Review and moderate music uploads</p>
    </div>

    <div class="tabs">
      <div class="tab active">All Songs</div>
      <div class="tab">Pending Review</div>
      <div class="tab">Flagged</div>
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
          ${songs.map(song => renderContentRow(song)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderContentRow(song) {
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
}
