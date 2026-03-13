import { formatCurrency, formatNumber } from '../../data.js';
import { icon } from '../../icons.js';

export function renderArtistSongs(user, artistSongs) {
    return `
    <div class="page-header">
      <div class="flex justify-between items-center">
        <div>
          <h1>My Songs</h1>
          <p>Manage your published tracks and performance</p>
        </div>
        <button class="btn btn-primary" onclick="window.navigateTo('artistDashboard', {artistTab: 'upload'})">
          ${icon('plus', 18)} Upload New Track
        </button>
      </div>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Song</th>
            <th>Genre</th>
            <th>Price</th>
            <th>Plays</th>
            <th>Sales</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${artistSongs.length > 0 ? artistSongs.map(song => renderSongRow(song)).join('') : '<tr><td colspan="7" style="padding:3rem; text-align:center;">No songs uploaded yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderSongRow(song) {
    return `
    <tr>
      <td>
        <div class="table-song-cell">
          <img src="${song.coverUrl || 'assets/images/albums/default.png'}" alt="${song.title}"/>
          <div class="song-info">
            <div class="title" style="font-size: 0.9rem;">${song.title}</div>
            <div class="artist">${song.album_name || 'Single'}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-primary">${song.genre || 'N/A'}</span></td>
      <td style="font-weight: 600;">${formatCurrency(parseFloat(song.price) || 0)}</td>
      <td>${formatNumber(song.play_count || 0)}</td>
      <td>${formatNumber(song.purchase_count || 0)}</td>
      <td><span class="badge ${song.status === 'published' ? 'badge-success' : 'badge-warning'}">${song.status || 'Draft'}</span></td>
      <td>
        <div class="flex gap-1">
          <button class="btn btn-sm btn-ghost" title="Edit Music">${icon('edit', 14)}</button>
          <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Delete Permanently" onclick="window.deleteSong('${song.id}')">${icon('trash', 14)}</button>
        </div>
      </td>
    </tr>
  `;
}
