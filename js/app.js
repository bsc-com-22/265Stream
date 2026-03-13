// =============================================
// 265Stream - Main Application
// =============================================
import { songs, artists, albums, purchases, users, appState, formatNumber, formatCurrency, formatDate, getTimeAgo } from './data.js';
import { icon, icons } from './icons.js';
import { renderHomePage } from './pages/home.js';
import { renderSongDetail } from './pages/songDetail.js';
import { renderUserDashboard } from './pages/userDashboard.js';
import { renderArtistDashboard } from './pages/artistDashboard.js';
import { renderAdminPanel } from './pages/adminPanel.js';
import { renderAuthPage } from './pages/auth.js';
import { api } from './apiClient.js';

// ---------- Router ----------
const routes = {
  home: renderHomePage,
  songDetail: renderSongDetail,
  userDashboard: renderUserDashboard,
  artistDashboard: renderArtistDashboard,
  admin: renderAdminPanel,
  login: renderAuthPage,
  register: () => renderAuthPage('register'),
};

export function navigate(view, params = {}) {
  appState.currentView = view;
  Object.assign(appState, params);

  const app = document.getElementById('app');
  const mainContent = document.getElementById('main-content');

  // Clear existing sidebar
  const existingSidebar = document.querySelector('.sidebar');
  if (existingSidebar) existingSidebar.remove();
  const existingOverlay = document.querySelector('.sidebar-overlay');
  if (existingOverlay) existingOverlay.remove();
  const existingToggle = document.querySelector('.mobile-sidebar-toggle');
  if (existingToggle) existingToggle.remove();

  // If auth pages, hide navbar entirely
  if (view === 'login' || view === 'register') {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'none';
    const player = document.querySelector('.mini-player');
    if (player) player.classList.remove('visible');
    mainContent.className = 'main-content';
    mainContent.style.paddingTop = '0';
  } else {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = '';
    mainContent.className = 'main-content';
    mainContent.style.paddingTop = '';
  }

  // Remove sidebar class
  mainContent.classList.remove('has-sidebar');

  // Render the page
  if (routes[view]) {
    routes[view](mainContent, params);
  }

  // Navbar scroll effect toggle
  renderNavbar();

  // Scroll to top
  window.scrollTo({ top: 0 });
}

// ---------- Toast System ----------
export function showToast(type, title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconName = type === 'success' ? 'check' : type === 'error' ? 'x' : 'info';

  toast.innerHTML = `
    <div class="toast-icon">${icon(iconName, 18)}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------- Audio Management ----------
const audioPlayer = new Audio();
let playProgressInterval;
let previewTimeout;

export async function playSong(song) {
  appState.currentTrack = song;
  appState.isPlaying = true;

  const player = document.querySelector('.mini-player');
  if (!player) return;
  player.classList.add('visible');

  // Set UI info
  player.querySelector('.track-title').textContent = song.title;
  player.querySelector('.track-artist').textContent = song.artist?.name || song.artist_name || 'Unknown';
  player.querySelector('.player-track img').src = song.coverUrl || song.cover || 'assets/images/albums/album1.png';

  const playBtn = player.querySelector('.play-main');
  if (playBtn) playBtn.innerHTML = icon('pause', 18);

  // Set audio source
  try {
    let streamUrl = song.audioUrl;

    if (!streamUrl) {
      const data = await api.getStreamUrl(song.id);
      streamUrl = data.streamUrl;
    }

    if (!streamUrl) {
      throw new Error('No stream URL available');
    }

    audioPlayer.src = streamUrl;
    audioPlayer.load();
    await audioPlayer.play();
  } catch (err) {
    console.error('Audio play error:', err);
    showToast('error', 'Playback Error', 'Could not play song. Please check your connection and try again.');
    appState.isPlaying = false;
    if (playBtn) playBtn.innerHTML = icon('play', 18);
  }

  // Track preview status
  const isPurchased = appState.purchasedSongIds.includes(song.id);
  const previewLabel = player.querySelector('.player-preview-label');
  if (previewLabel) previewLabel.style.display = isPurchased ? 'none' : 'block';

  // Preview logic: Pause after 30 seconds if not owned
  clearTimeout(previewTimeout);
  if (!isPurchased && !song.is_free) {
    previewTimeout = setTimeout(() => {
      audioPlayer.pause();
      appState.isPlaying = false;
      const playBtn = document.querySelector('.mini-player .play-main');
      if (playBtn) playBtn.innerHTML = icon('play', 18);
      showToast('info', 'Preview Ended', 'Buy the full song to keep listening!');
    }, 30000);
  }

  // Add has-player class to main content
  document.getElementById('main-content').classList.add('has-player');

  // Start progress tracking
  startProgressTracking();
}

function startProgressTracking() {
  const player = document.querySelector('.mini-player');
  if (!player) return;
  const bar = player.querySelector('.player-progress .bar .fill');
  const currentTimeDisplay = player.querySelector('.player-progress .time:first-child');
  const durationDisplay = player.querySelector('.player-progress .time:last-child');

  clearInterval(playProgressInterval);
  playProgressInterval = setInterval(() => {
    if (!audioPlayer.paused && audioPlayer.duration) {
      const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      if (bar) bar.style.width = `${percent}%`;
      if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
      if (durationDisplay) durationDisplay.textContent = formatTime(audioPlayer.duration);
    }
  }, 500);
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

export function togglePlay() {
  if (audioPlayer.paused) {
    audioPlayer.play();
    appState.isPlaying = true;
  } else {
    audioPlayer.pause();
    appState.isPlaying = false;
  }
  const playBtn = document.querySelector('.mini-player .play-main');
  if (playBtn) playBtn.innerHTML = icon(appState.isPlaying ? 'pause' : 'play', 18);
}

export function updateVolume(value) {
  audioPlayer.volume = value / 100;
  const volFill = document.querySelector('.volume-bar .vol-fill');
  if (volFill) volFill.style.width = `${value}%`;
}

// ---------- Purchase ----------
export async function purchaseSong(songId) {
  try {
    await api.purchaseSong(songId);
    appState.purchasedSongIds.push(songId);
    showToast('success', 'Purchase Complete!', `Song has been added to your library.`);
    navigate(appState.currentView, { currentSongId: appState.currentSongId });
  } catch (e) {
    showToast('error', 'Purchase failed', e.message || 'Unable to process purchase.');
  }
}

// ---------- Navbar & UI ----------
function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const isAuthenticated = api.isAuthenticated();
  const user = api.getStoredUser() || appState.currentUser;

  let userSection = '';

  if (isAuthenticated && user) {
    const initials = user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U';
    userSection = `
      <div class="user-avatar" id="user-avatar-btn" onclick="window.toggleUserDropdown()">
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); color: var(--text); border-radius: 50%; font-weight: bold; font-size: 0.9rem;">
          ${initials}
        </div>
        <div class="user-dropdown" id="user-dropdown">
          <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); margin-bottom: 0.25rem;">
            <div style="font-weight: 600; font-size: 0.875rem;">${user.full_name || user.username || 'User'}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${user.email}</div>
          </div>
          <div class="dropdown-item" onclick="window.location.href='dashboard.html'">
            ${icon('user', 18)} My Dashboard
          </div>
          <div class="dropdown-item" onclick="window.location.href='dashboard.html?tab=purchases'">
            ${icon('shoppingCart', 18)} My Purchases
          </div>
          ${user.role === 'artist' || user.role === 'admin' ? `
            <div class="dropdown-item" onclick="window.location.href='artist.html'">
              ${icon('mic', 18)} Artist Studio
            </div>
          ` : ''}
          ${user.role === 'admin' ? `
            <div class="dropdown-item" onclick="window.location.href='admin.html'">
              ${icon('shield', 18)} Admin Panel
            </div>
          ` : ''}
          <div class="dropdown-divider"></div>
          <div class="dropdown-item" onclick="window.location.href='dashboard.html?tab=settings'">
            ${icon('settings', 18)} Settings
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item danger" onclick="window.logout()">
            ${icon('logOut', 18)} Sign Out
          </div>
        </div>
      </div>
    `;
  } else {
    userSection = `
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" onclick="window.location.href='index.html?view=login'">Log In</button>
        <button class="btn btn-primary" onclick="window.location.href='index.html?view=register'">Sign Up</button>
      </div>
    `;
  }

  navbar.innerHTML = `
    <div class="navbar-brand" onclick="window.location.href='index.html'" style="cursor:pointer">
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" stroke="#FF0000" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="#FF0000"/>
        <path d="M16 4 A12 12 0 0 1 28 16" stroke="#FF0000" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M16 28 A12 12 0 0 1 4 16" stroke="#FF0000" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
      <span class="brand-text">265Stream</span>
    </div>

    <div class="navbar-search">
      <span class="search-icon">${icon('search', 18)}</span>
      <input type="text" id="search-input" placeholder="Search songs, artists, albums..." autocomplete="off"/>
    </div>

    <div class="navbar-links">
      <a class="nav-link ${appState.currentView === 'home' ? 'active' : ''}" onclick="window.location.href='index.html'">
        ${icon('home', 16)} Home
      </a>
      <a class="nav-link" onclick="window.location.href='index.html?view=home&browse=true'">
        ${icon('disc', 16)} Browse
      </a>
      <a class="nav-link" onclick="window.location.href='index.html?view=home&artists=true'">
        ${icon('mic', 16)} Artists
      </a>
    </div>

    <div class="navbar-user">
      ${userSection}
    </div>
  `;

  // Re-attach search listener
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = appState.searchQuery;
    searchInput.oninput = (e) => {
      appState.searchQuery = e.target.value;
      if (appState.currentView === 'home') navigate('home');
    };
  }
}

function renderMiniPlayer() {
  const player = document.getElementById('mini-player');
  if (!player) return;
  player.innerHTML = `
    <div class="player-track">
      <img src="assets/images/albums/album1.png" alt="Album art"/>
      <div class="track-info">
        <div class="track-title">No track playing</div>
        <div class="track-artist">-</div>
        <div class="player-preview-label" style="display:none; font-size:0.65rem; color:var(--primary); font-weight:700; text-transform:uppercase; margin-top:2px;">
          ${icon('info', 10)} Playing Preview
        </div>
      </div>
    </div>
    <div class="player-controls">
      <div class="player-buttons">
        <button title="Shuffle">${icon('shuffle', 16)}</button>
        <button title="Previous">${icon('skipBack', 18)}</button>
        <button class="play-main" onclick="window.togglePlayback()" title="Play">${icon('play', 18)}</button>
        <button title="Next">${icon('skipForward', 18)}</button>
        <button title="Repeat">${icon('repeat', 16)}</button>
      </div>
      <div class="player-progress">
        <span class="time">0:00</span>
        <div class="bar"><div class="fill" style="width:0%"></div></div>
        <span class="time">0:00</span>
      </div>
    </div>
    <div class="player-extra">
      <button title="Like">${icon('heart', 16)}</button>
      <div class="volume-control" style="display:flex; align-items:center; gap:8px;">
        ${icon('volume2', 16)}
        <div class="volume-bar" style="width:80px; height:4px; background:var(--border); border-radius:2px; cursor:pointer;" onclick="window.handleVolumeClick(event)">
          <div class="vol-fill" style="width:80%; height:100%; background:var(--primary); border-radius:2px;"></div>
        </div>
      </div>
    </div>
  `;
}

function renderToastContainer() {
  // Container is in index.html
}

// ---------- Initialize ----------
function init() {
  renderNavbar();
  renderMiniPlayer();
  renderToastContainer();

  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  const tabParam = urlParams.get('tab');

  const path = window.location.pathname;
  if (path.includes('admin.html')) {
    navigate('admin', { adminTab: tabParam || 'overview' });
  } else if (path.includes('artist.html')) {
    navigate('artistDashboard', { artistTab: tabParam || 'overview' });
  } else if (path.includes('dashboard.html')) {
    navigate('userDashboard', { dashboardTab: tabParam || 'overview' });
  } else if (viewParam) {
    navigate(viewParam);
  } else {
    navigate('home');
  }

  // Audio event listeners
  audioPlayer.onended = () => {
    appState.isPlaying = false;
    const playBtn = document.querySelector('.mini-player .play-main');
    if (playBtn) playBtn.innerHTML = icon('play', 18);
    clearInterval(playProgressInterval);
    clearTimeout(previewTimeout);
  };

  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
  });
}

// ---------- Global Exports ----------
window.navigateTo = (view, params) => navigate(view, params);
window.togglePlayback = togglePlay;
window.handleVolumeClick = (e) => {
  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
  updateVolume(percent);
};
window.playSongById = async (id) => {
  try {
    const song = await api.getSong(id);
    if (song) await playSong(song);
  } catch (e) {
    showToast('error', 'Error', 'Could not load song for playback');
  }
};
window.purchaseSongById = (id) => purchaseSong(id);
window.logout = async () => {
  await api.logout();
  window.location.href = 'index.html';
};
window.toggleUserDropdown = () => {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.toggle('show');
};

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('user-dropdown');
  const avatar = document.getElementById('user-avatar-btn');
  if (dropdown && avatar && !avatar.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

document.addEventListener('DOMContentLoaded', init);
