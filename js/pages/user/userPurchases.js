import { formatCurrency, formatDate } from '../../data.js';
import { icon } from '../../icons.js';
import { api } from '../../apiClient.js';

export function renderUserPurchases(purchasesList = []) {
    return `
    <div class="page-header">
      <h1>My Purchases</h1>
      <p>Your complete transaction history</p>
    </div>

    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Song</th>
            <th>Genre</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${purchasesList.length > 0 ? purchasesList.map(p => renderPurchaseRow(p)).join('') : `
            <tr>
              <td colspan="6">
                <div class="empty-state" style="padding: 3rem;">
                  ${icon('shoppingCart', 48)}
                  <h3>No purchases yet</h3>
                  <p>Start exploring and buy music you love</p>
                </div>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function renderPurchaseRow(p) {
    return `
    <tr>
      <td>
        <div class="table-song-cell">
          <img src="${p.song?.coverUrl || p.album?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
          <div class="song-info">
            <div class="title">${p.song?.title || p.album?.title || 'Unknown'}</div>
            <div class="artist">${p.artist?.name || 'Unknown Artist'}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-primary">${p.song?.genre || 'N/A'}</span></td>
      <td>${p.song?.duration || '-'}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${formatCurrency(p.amount)}</td>
      <td><span class="badge badge-success">${icon('check', 10)} Purchased</span></td>
      <td>
        <div class="flex gap-1">
          ${p.song ? `
          <button class="btn btn-sm btn-primary" onclick="window.playSongById('${p.song.id}')" title="Play Now">
            ${icon('play', 14)} Play
          </button>
          <button class="btn btn-sm btn-secondary" title="Download High Quality">
            ${icon('download', 14)} Download
          </button>` : ''}
        </div>
      </td>
    </tr>
  `;
}
