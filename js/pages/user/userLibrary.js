import { icon } from '../../icons.js';

export function renderUserLibrary(purchasedSongs = []) {
    return `
    <div class="page-header">
      <h1>My Library</h1>
      <p>Your collection of owned music</p>
    </div>

    ${purchasedSongs.length > 0 ? `
      <div class="card-grid large">
        ${purchasedSongs.map(s => renderLibraryCard(s)).join('')}
      </div>
    ` : `
      <div class="empty-state">
        ${icon('music', 64)}
        <h3>Your library is empty</h3>
        <p>Purchase songs to build your collection</p>
        <button class="btn btn-primary" onclick="window.navigateTo('home')">Browse Music</button>
      </div>
    `}
  `;
}

function renderLibraryCard(s) {
    return `
    <div class="music-card" onclick="window.navigateTo('songDetail', {currentSongId: '${s.id}'})">
      <div class="card-artwork">
        <img src="${s.coverUrl || 'assets/images/albums/default.png'}" alt="${s.title}" loading="lazy"/>
        <div class="play-overlay">
          <div class="play-btn-circle" onclick="event.stopPropagation(); window.playSongById('${s.id}')">
            ${icon('play', 22)}
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${s.title}</div>
      </div>
      <div class="card-meta">
        <span class="badge badge-success">${icon('check', 10)} Owned</span>
        <button class="card-buy" style="background: var(--bg-elevated);" onclick="event.stopPropagation(); window.playSongById('${s.id}')" title="Play Now">
          ${icon('play', 12)}
        </button>
      </div>
    </div>
  `;
}
