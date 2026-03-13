// =============================================
// 265Stream - Home Page
// =============================================
import { appState, formatNumber, formatCurrency } from '../data.js';
import { icon } from '../icons.js';
import { api } from '../apiClient.js';

export async function renderHomePage(container) {
  container.innerHTML = `
      <div class="page-container" style="display:flex; justify-content:center; align-items:center; min-height:50vh;">
        <p style="color:var(--text-muted); font-size:1.2rem;">Loading...</p>
      </div>
    `;

  try {
    const [songsData, artistsData, albumsData] = await Promise.all([
      api.getSongs({ limit: 50 }),
      api.getArtists(),
      api.getAlbums()
    ]);

    const songs = songsData.songs || [];
    const artists = artistsData.artists || [];
    const albums = albumsData.albums || [];
    const filteredSongs = appState.searchQuery
      ? songs.filter(s =>
        s.title.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
        (s.artist && s.artist.name.toLowerCase().includes(appState.searchQuery.toLowerCase())) ||
        (s.genre && s.genre.toLowerCase().includes(appState.searchQuery.toLowerCase()))
      )
      : songs;

    const featuredSongs = songs.length > 0 ? songs.slice(0, 3) : [];
    const trendingSongs = [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 6);
    const newReleases = [...songs].sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 6);

    container.innerHTML = `
    <div class="page-container" style="max-width: 1600px;">
      ${appState.searchQuery ? renderSearchResults(filteredSongs) : `
        ${renderHeroCarousel(featuredSongs)}

        <!-- Featured Artists -->
        <section class="content-section" id="section-artists">
          <div class="section-header">
            <h2>${icon('award', 22)} Featured Artists</h2>
            <span class="see-all">See All ${icon('chevronRight', 16)}</span>
          </div>
          <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
            ${artists.map(a => renderArtistCard(a)).join('')}
          </div>
        </section>

        <!-- Trending Songs -->
        <section class="content-section" id="section-trending">
          <div class="section-header">
            <h2>${icon('fire', 22)} Trending Now</h2>
            <span class="see-all">See All ${icon('chevronRight', 16)}</span>
          </div>
          <div class="card-grid">
            ${trendingSongs.map(s => renderMusicCard(s)).join('')}
          </div>
        </section>

        <!-- New Releases -->
        <section class="content-section" id="section-new">
          <div class="section-header">
            <h2>${icon('disc', 22)} New Releases</h2>
            <span class="see-all">See All ${icon('chevronRight', 16)}</span>
          </div>
          <div class="card-grid">
            ${newReleases.map(s => renderMusicCard(s)).join('')}
          </div>
        </section>

        <!-- Popular Albums -->
        <section class="content-section" id="section-albums">
          <div class="section-header">
            <h2>${icon('headphones', 22)} Popular Albums</h2>
            <span class="see-all">See All ${icon('chevronRight', 16)}</span>
          </div>
          <div class="card-grid large">
            ${albums.map(a => renderAlbumCard(a)).join('')}
          </div>
        </section>
      `}
    </div>
  `;

    // Hero carousel auto-play
    initHeroCarousel();
  } catch (err) {
    console.error('Home page load error:', err);
    container.innerHTML = `<div class="page-container"><p style="color:var(--error); text-align:center; padding: 2rem;">Failed to load content. Please try again later.</p></div>`;
  }
}

function renderSearchResults(results) {
  if (results.length === 0) {
    return `
      <div class="empty-state" style = "margin-top: 3rem;" >
        ${icon('search', 64)}
        <h3>No results found</h3>
        <p>Try searching for something else</p>
      </div>
      `;
  }

  return `
      <div class="content-section" style = "margin-top: 1rem;" >
      <div class="section-header">
        <h2>Search Results <span style="color: var(--text-muted); font-weight: 400; font-size: 1rem;">(${results.length})</span></h2>
      </div>
      <div class="card-grid">
        ${results.map(s => renderMusicCard(s)).join('')}
      </div>
    </div>
      `;
}

function renderHeroCarousel(featuredSongs) {
  return `
      <div class="hero-section" >
      <div class="hero-carousel" id="hero-carousel">
        ${featuredSongs.map((song, i) => `
          <div class="hero-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
            <div class="hero-slide-bg" style="background-image: url('${song.cover}')"></div>
            <div class="hero-slide-content">
              <div class="hero-artwork">
                <img src="${song.cover}" alt="${song.title}"/>
              </div>
              <div class="hero-info">
                <span class="label">${icon('star', 12)} Featured</span>
                <h1>${song.title}</h1>
                <p class="artist">${song.artist ? song.artist.name : 'Unknown Artist'} ${song.albumName ? `· ${song.albumName}` : ''}</p>
                <div class="hero-actions">
                  <button class="btn btn-primary btn-lg" onclick="window.playSongById('${song.id}')">
                    ${icon('play', 20)} Play Now
                  </button>
                  ${song.purchased || appState.purchasedSongIds.includes(song.id) || song.isFree
      ? `<button class="btn btn-success btn-lg">${icon('check', 20)} Owned</button>`
      : `<button class="btn btn-secondary btn-lg" onclick="window.purchaseSongById('${song.id}')">
                        ${icon('shoppingCart', 20)} Buy ${formatCurrency(song.price || 0)}
                      </button>`
    }
                  <button class="btn btn-ghost btn-lg" onclick="window.navigateTo('songDetail', {currentSongId: '${song.id}'})">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="hero-dots" id="hero-dots">
        ${featuredSongs.map((_, i) => `
          <div class="hero-dot ${i === 0 ? 'active' : ''}" data-dot="${i}" onclick="window.goToSlide(${i})"></div>
        `).join('')}
      </div>
    </div>
      `;
}

function renderMusicCard(song) {
  const isPurchased = song.purchased || appState.purchasedSongIds.includes(song.id) || song.isFree;
  return `
      <div class="music-card" id = "music-card-${song.id}" >
      <div class="card-artwork" onclick="window.navigateTo('songDetail', {currentSongId: '${song.id}'})">
        <img src="${song.coverUrl || 'assets/images/albums/album1.png'}" alt="${song.title}" loading="lazy"/>
        <div class="play-overlay">
          <div class="play-btn-circle" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
            ${icon('play', 22)}
          </div>
        </div>
      </div>
      <div class="card-info" onclick="window.navigateTo('songDetail', {currentSongId: '${song.id}'})">
        <div class="card-title">${song.title}</div>
        <div class="card-artist">${song.artist ? song.artist.name : 'Unknown'}</div>
      </div>
      <div class="card-meta">
        <span class="card-price">${song.isFree ? 'Free' : formatCurrency(song.price || 0)}</span>
        ${isPurchased
      ? `<button class="card-buy" style="background: var(--success);" onclick="event.stopPropagation(); window.playSongById('${song.id}')">
              ${icon('play', 12)} Play
            </button>`
      : `<button class="card-buy" onclick="event.stopPropagation(); window.purchaseSongById('${song.id}')">
              ${icon('shoppingCart', 12)} Buy
            </button>`
    }
      </div>
    </div>
      `;
}

function renderAlbumCard(album) {
  return `
      <div class="music-card" >
      <div class="card-artwork">
        <img src="${album.coverUrl || 'assets/images/albums/album3.png'}" alt="${album.title}" loading="lazy"/>
        <div class="play-overlay">
          <div class="play-btn-circle">
            ${icon('play', 22)}
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${album.title}</div>
        <div class="card-artist">${album.artist ? album.artist.artist_name : 'Unknown'} · ${album.songCount || 0} songs</div>
      </div>
      <div class="card-meta">
        <span class="card-price">${formatCurrency(album.price)}</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${album.genre}</span>
      </div>
    </div>
      `;
}

function renderArtistCard(artist) {
  const artistName = artist.artist_name || artist.name || 'Unknown';
  const initials = artistName.split(' ').map(n => n[0]).join('').substring(0, 2) || 'A';
  const colors = ['#FF0000', '#FF4444', '#CC0000', '#FF6666', '#990000', '#FF2222'];
  // Quick hash to pick color
  let hash = 0;
  const idStr = String(artist.id);
  for (let i = 0; i < idStr.length; i++) { hash = idStr.charCodeAt(i) + ((hash << 5) - hash); }
  const color = colors[Math.abs(hash) % colors.length];

  return `
      <div class="artist-card" >
      <div class="artist-avatar" style="background: linear-gradient(135deg, ${color}, ${color}88);">
        ${artist.user && artist.user.avatar_url
      ? `<img src="${artist.user.avatar_url}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
      : `<span style="font-size: 2rem; font-weight: 800; color: white;">${initials.toUpperCase()}</span>`}
      </div>
      <div class="artist-name">
        ${artistName}
        ${artist.verified ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="#3B82F6" style="display:inline;vertical-align:middle;margin-left:4px"><path d="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41-1.41Z"/></svg>` : ''}
      </div>
      <div class="artist-genre">${artist.genre || 'Various'}</div>
      <div class="artist-songs-count">
        ${icon('music', 12)} ${formatNumber(artist.follower_count || 0)} followers
      </div>
    </div>
      `;
}

// Hero Carousel Logic
function initHeroCarousel() {
  let currentSlide = 0;
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');

  if (slides.length === 0) return;

  window.goToSlide = (index) => {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
  };

  // Auto-advance
  setInterval(() => {
    const next = (currentSlide + 1) % slides.length;
    window.goToSlide(next);
  }, 6000);
}
