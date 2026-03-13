const fs = require('fs');
let code = fs.readFileSync('js/pages/songDetail.js', 'utf8');

// 1. Update imports
code = code.replace(
    /import \{ songs, appState, formatNumber, formatCurrency, formatDate \} from '\.\.\/data\.js';/,
    "import { appState, formatNumber, formatCurrency, formatDate } from '../data.js';\nimport { api } from '../apiClient.js';"
);


// 2. Change renderSongDetail to async
const headerRegex = /export function renderSongDetail\(container, params = \{\}\) \{[\s\S]*?const relatedSongs = songs\.filter\(s => s\.artist\.id === song\.artist\.id && s\.id !== song\.id\);/;
const headerReplacement = `export async function renderSongDetail(container, params = {}) {
    const songId = params.currentSongId || appState.currentSongId;
    
    container.innerHTML = \`<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading song...</p></div>\`;

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
        container.innerHTML = \`
      <div class="page-container">
        <div class="empty-state">
          \${icon('music', 64)}
          <h3>Song Not Found</h3>
          <p>The song you're looking for doesn't exist.</p>
          <button class="btn btn-primary" onclick="window.navigateTo('home')">Go Home</button>
        </div>
      </div>
    \`;
        return;
    }

    const isPurchased = song.purchased || appState.purchasedSongIds.includes(song.id);`;

code = code.replace(headerRegex, headerReplacement);

// 3. Update song variables
code = code.replace(/\$\{song\.cover\}/g, '${song.coverUrl || "assets/images/albums/default.png"}');
code = code.replace(/\$\{song\.title\}/g, '${song.title || "Unknown"}');
code = code.replace(/\$\{song\.artist\.name\}/g, '${song.artist?.artist_name || "Unknown"}');
code = code.replace(/\$\{song\.artist\.verified\}/g, '${song.artist?.verified}');
code = code.replace(/\$\{song\.album\}/g, '${song.album_name || "Single"}');
code = code.replace(/\$\{song\.duration\}/g, '${song.duration || "3:45"}');
code = code.replace(/\$\{formatNumber\(song\.plays\)\}/g, '${formatNumber(song.play_count || 0)}');
code = code.replace(/\$\{formatDate\(song\.releaseDate\)\}/g, '${formatDate(song.created_at)}');
code = code.replace(/\$\{formatCurrency\(song\.price\)\}/g, '${formatCurrency(parseFloat(song.price) || 0)}');
code = code.replace(/\$\{song\.genre\}/g, '${song.genre || "Unknown"}');

// 4. Update related card render parameter usage inside renderRelatedCard
const relatedCardRegex = /function renderRelatedCard\(song\) \{[\s\S]*?return `([\s\S]*?)`;\s*\}/;
const relatedCardReplacement = `function renderRelatedCard(song) {
    const isPurchased = song.purchased || appState.purchasedSongIds.includes(song.id);
    return \`
    <div class="music-card" onclick="window.navigateTo('songDetail', {currentSongId: '\${song.id}'})">
      <div class="card-artwork">
        <img src="\${song.coverUrl || 'assets/images/albums/default.png'}" alt="\${song.title}" loading="lazy"/>
        <div class="play-overlay">
          <div class="play-btn-circle" onclick="event.stopPropagation(); window.playSongById('\${song.id}')">
            \${icon('play', 22)}
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">\${song.title}</div>
        <div class="card-artist">\${song.artist?.artist_name || 'Unknown'}</div>
      </div>
      <div class="card-meta">
        <span class="card-price">\${formatCurrency(parseFloat(song.price) || 0)}</span>
        \${isPurchased
            ? \`<span class="badge badge-success">\${icon('check', 10)} Owned</span>\`
            : \`<button class="card-buy" onclick="event.stopPropagation(); window.purchaseSongById('\${song.id}')">Buy</button>\`
        }
      </div>
    </div>
  \`;
}`;
code = code.replace(relatedCardRegex, relatedCardReplacement);

fs.writeFileSync('js/pages/songDetail.js', code);
