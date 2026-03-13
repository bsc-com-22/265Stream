// =============================================
// 265Stream - Song Detail Page
// =============================================
import { appState, formatNumber, formatCurrency, formatDate } from '../data.js';
import { api } from '../apiClient.js';
import { icon } from '../icons.js';

export async function renderSongDetail(container, params = {}) {
    const songId = params.currentSongId || appState.currentSongId;
    
    container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading song...</p></div>`;

    let song = null;
    let relatedSongs = [];
    try {
        song = await api.getSong(songId);
        if (song && song.artist_id) {
            const relatedRes = await api.getSongs({ artist_id: song.artist_id, limit: 5 });
            relatedSongs = (relatedRes.data || []).filter(s => s.id !== song.id);
        }
    } catch(err) {
        console.error('Error fetching song detail:', err);
    }

    if (!song) {
        container.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          ${icon('music', 64)}
          <h3>Song Not Found</h3>
          <p>The song you're looking for doesn't exist.</p>
          <button class="btn btn-primary" onclick="window.navigateTo('home')">Go Home</button>
        </div>
      </div>
    `;
        return;
    }

    const isPurchased = song.purchased || appState.purchasedSongIds.includes(song.id);

    container.innerHTML = `
    <div class="song-detail">
      <!-- Back button -->
      <button class="btn btn-ghost mb-3" onclick="window.navigateTo('home')" style="margin-left: -0.5rem;">
        ${icon('chevronLeft', 18)} Back to Browse
      </button>

      <!-- Header -->
      <div class="song-detail-header">
        <div class="song-detail-artwork">
          <img src="${song.coverUrl || "assets/images/albums/default.png"}" alt="${song.title || "Unknown"}"/>
        </div>
        <div class="song-detail-info">
          <span class="song-type">${icon('music', 14)} Single</span>
          <h1 class="song-title">${song.title || "Unknown"}</h1>
          <p class="song-artist-link" onclick="event.stopPropagation();">
            ${song.artist?.artist_name || "Unknown"}
            ${song.artist.verified ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6" style="display:inline;vertical-align:middle;margin-left:4px"><path d="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41-1.41Z"/></svg>` : ''}
          </p>
          <div class="song-meta-row">
            <span>${icon('disc', 14)} ${song.album_name || "Single"}</span>
            <span>${icon('clock', 14)} ${song.duration || "3:45"}</span>
            <span>${icon('headphones', 14)} ${formatNumber(song.play_count || 0)} plays</span>
            <span>${icon('calendar', 14)} ${formatDate(song.created_at)}</span>
          </div>
          <div class="song-price-tag">${formatCurrency(parseFloat(song.price) || 0)}</div>
          <div class="song-detail-actions">
            <button class="btn btn-primary btn-lg" onclick="window.playSongById(${song.id})">
              ${icon('play', 20)} Play Preview
            </button>
            ${isPurchased
            ? `
                <button class="btn btn-success btn-lg">
                  ${icon('check', 20)} Purchased
                </button>
                <button class="btn btn-secondary btn-lg" onclick="window.showToastMsg('info', 'Download Started', 'Your song is downloading...')">
                  ${icon('download', 20)} Download
                </button>
              `
            : `
                <button class="btn btn-secondary btn-lg" onclick="window.purchaseSongById(${song.id})">
                  ${icon('shoppingCart', 20)} Buy Now
                </button>
              `
        }
            <button class="btn btn-ghost btn-icon" title="Add to Favorites">
              ${icon('heart', 20)}
            </button>
          </div>
        </div>
      </div>

      <!-- Audio Preview Player -->
      <div class="audio-preview">
        <div class="preview-label">Audio Preview</div>
        <div class="audio-player">
          <button class="play-pause-btn" onclick="window.playSongById(${song.id})">
            ${icon('play', 22)}
          </button>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="time-display">
              <span>0:00</span>
              <span>${song.duration || "3:45"}</span>
            </div>
          </div>
          <div class="volume-control">
            ${icon('volume2', 18)}
            <div class="volume-slider">
              <div class="volume-fill"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Song Details Card -->
      <div class="settings-card mb-3">
        <h3>Track Information</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Genre</div>
            <div style="font-weight: 600;">${song.genre || "Unknown"}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Album</div>
            <div style="font-weight: 600;">${song.album_name || "Single"}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Duration</div>
            <div style="font-weight: 600;">${song.duration || "3:45"}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Release Date</div>
            <div style="font-weight: 600;">${formatDate(song.created_at)}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Total Plays</div>
            <div style="font-weight: 600;">${formatNumber(song.play_count || 0)}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Price</div>
            <div style="font-weight: 600; color: var(--primary);">${formatCurrency(parseFloat(song.price) || 0)}</div>
          </div>
        </div>
      </div>

      <!-- More from Artist -->
      ${relatedSongs.length > 0 ? `
        <section class="content-section mt-3">
          <div class="section-header">
            <h2>More from ${song.artist?.artist_name || "Unknown"}</h2>
          </div>
          <div class="card-grid">
            ${relatedSongs.map(s => renderRelatedCard(s)).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;

    // Expose toast for download button
    window.showToastMsg = (type, title, msg) => {
        import('../app.js').then(m => m.showToast(type, title, msg));
    };

    // Simulate progress bar animation
    animatePreviewProgress();
}

function renderRelatedCard(song) {
    const isPurchased = song.purchased || appState.purchasedSongIds.includes(song.id);
    return `
    <div class="music-card" onclick="window.navigateTo('songDetail', {currentSongId: '${song.id}'})">
      <div class="card-artwork">
        <img src="${song.coverUrl || 'assets/images/albums/default.png'}" alt="${song.title}" loading="lazy"/>
        <div class="play-overlay">
          <div class="play-btn-circle" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
            ${icon('play', 22)}
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${song.title}</div>
        <div class="card-artist">${song.artist?.artist_name || 'Unknown'}</div>
      </div>
      <div class="card-meta">
        <span class="card-price">${formatCurrency(parseFloat(song.price) || 0)}</span>
        ${isPurchased
            ? `<span class="badge badge-success">${icon('check', 10)} Owned</span>`
            : `<button class="card-buy" onclick="event.stopPropagation(); window.purchaseSongById('${song.id}')">Buy</button>`
        }
      </div>
    </div>
  `;
}

function animatePreviewProgress() {
    const fill = document.querySelector('.audio-preview .progress-fill');
    if (!fill) return;

    let width = 0;
    let playing = false;

    const playBtn = document.querySelector('.audio-preview .play-pause-btn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            playing = !playing;
            playBtn.innerHTML = icon(playing ? 'pause' : 'play', 22);

            if (playing) {
                const interval = setInterval(() => {
                    if (!playing || width >= 100) {
                        clearInterval(interval);
                        if (width >= 100) {
                            width = 0;
                            playing = false;
                            playBtn.innerHTML = icon('play', 22);
                        }
                        return;
                    }
                    width += 0.5;
                    fill.style.width = width + '%';
                }, 100);
            }
        });
    }
}
