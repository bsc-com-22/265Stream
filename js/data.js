// =============================================
// 265Stream - Mock Data Store
// =============================================

const ALBUMS_PATH = 'assets/images/albums/';

export const artists = [
  { id: 1, name: 'Nova Eclipse', genre: 'Electronic', bio: 'Pioneering electronic artist blending ambient textures with hard-hitting beats.', followers: 342000, songs: 24, avatar: null, verified: true },
  { id: 2, name: 'Crimson Wave', genre: 'Hip-Hop', bio: 'Underground hip-hop sensation with lyrical depth and innovative production.', followers: 518000, songs: 31, avatar: null, verified: true },
  { id: 3, name: 'Luna Storm', genre: 'Pop', bio: 'Chart-topping pop artist known for catchy hooks and powerful vocals.', followers: 1200000, songs: 18, avatar: null, verified: true },
  { id: 4, name: 'Velvet Shadows', genre: 'R&B', bio: 'Smooth R&B vocalist with soulful melodies and heartfelt lyrics.', followers: 267000, songs: 15, avatar: null, verified: true },
  { id: 5, name: 'Iron Bloom', genre: 'Rock', bio: 'Raw and energetic rock band pushing the boundaries of modern rock.', followers: 189000, songs: 22, avatar: null, verified: false },
  { id: 6, name: 'Midnight Sax', genre: 'Jazz', bio: 'Contemporary jazz artist reimagining the classics with modern flair.', followers: 94000, songs: 12, avatar: null, verified: true },
];

export const songs = [
  { id: 1, title: 'Digital Dreams', artist: artists[0], album: 'Neon Horizons', genre: 'Electronic', price: 1.29, duration: '3:45', plays: 1250000, cover: `${ALBUMS_PATH}album2.png`, releaseDate: '2026-02-15', featured: true, purchased: false },
  { id: 2, title: 'Street Lights', artist: artists[1], album: 'Urban Legends', genre: 'Hip-Hop', price: 1.49, duration: '4:12', plays: 2300000, cover: `${ALBUMS_PATH}album1.png`, releaseDate: '2026-03-01', featured: true, purchased: false },
  { id: 3, title: 'Starfall', artist: artists[2], album: 'Celestial', genre: 'Pop', price: 0.99, duration: '3:28', plays: 5400000, cover: `${ALBUMS_PATH}album3.png`, releaseDate: '2026-01-20', featured: true, purchased: false },
  { id: 4, title: 'Velvet Night', artist: artists[3], album: 'After Hours', genre: 'R&B', price: 1.29, duration: '4:56', plays: 890000, cover: `${ALBUMS_PATH}album4.png`, releaseDate: '2026-02-28', featured: false, purchased: false },
  { id: 5, title: 'Thunder Road', artist: artists[4], album: 'Wildfire', genre: 'Rock', price: 1.49, duration: '5:02', plays: 670000, cover: `${ALBUMS_PATH}album5.png`, releaseDate: '2026-03-05', featured: false, purchased: false },
  { id: 6, title: 'Blue Horizon', artist: artists[5], album: 'Nocturne', genre: 'Jazz', price: 0.99, duration: '6:18', plays: 340000, cover: `${ALBUMS_PATH}album6.png`, releaseDate: '2026-02-10', featured: false, purchased: false },
  { id: 7, title: 'Pulse', artist: artists[0], album: 'Neon Horizons', genre: 'Electronic', price: 1.29, duration: '3:58', plays: 980000, cover: `${ALBUMS_PATH}album2.png`, releaseDate: '2026-02-15', featured: false, purchased: false },
  { id: 8, title: 'Crown', artist: artists[1], album: 'Urban Legends', genre: 'Hip-Hop', price: 1.49, duration: '3:33', plays: 1800000, cover: `${ALBUMS_PATH}album1.png`, releaseDate: '2026-03-01', featured: false, purchased: false },
  { id: 9, title: 'Moonrise', artist: artists[2], album: 'Celestial', genre: 'Pop', price: 0.99, duration: '3:15', plays: 4100000, cover: `${ALBUMS_PATH}album3.png`, releaseDate: '2026-01-20', featured: false, purchased: false },
  { id: 10, title: 'Silk Road', artist: artists[3], album: 'After Hours', genre: 'R&B', price: 1.29, duration: '4:22', plays: 720000, cover: `${ALBUMS_PATH}album4.png`, releaseDate: '2026-02-28', featured: false, purchased: false },
  { id: 11, title: 'Wildfire', artist: artists[4], album: 'Wildfire', genre: 'Rock', price: 1.49, duration: '4:45', plays: 560000, cover: `${ALBUMS_PATH}album5.png`, releaseDate: '2026-03-05', featured: false, purchased: false },
  { id: 12, title: 'Midnight Blues', artist: artists[5], album: 'Nocturne', genre: 'Jazz', price: 0.99, duration: '7:05', plays: 280000, cover: `${ALBUMS_PATH}album6.png`, releaseDate: '2026-02-10', featured: false, purchased: false },
];

export const albums = [
  { id: 1, title: 'Neon Horizons', artist: artists[0], songs: songs.filter(s => s.album === 'Neon Horizons'), price: 9.99, cover: `${ALBUMS_PATH}album2.png`, releaseDate: '2026-02-15', genre: 'Electronic' },
  { id: 2, title: 'Urban Legends', artist: artists[1], songs: songs.filter(s => s.album === 'Urban Legends'), price: 12.99, cover: `${ALBUMS_PATH}album1.png`, releaseDate: '2026-03-01', genre: 'Hip-Hop' },
  { id: 3, title: 'Celestial', artist: artists[2], songs: songs.filter(s => s.album === 'Celestial'), price: 8.99, cover: `${ALBUMS_PATH}album3.png`, releaseDate: '2026-01-20', genre: 'Pop' },
  { id: 4, title: 'After Hours', artist: artists[3], songs: songs.filter(s => s.album === 'After Hours'), price: 9.99, cover: `${ALBUMS_PATH}album4.png`, releaseDate: '2026-02-28', genre: 'R&B' },
  { id: 5, title: 'Wildfire', artist: artists[4], songs: songs.filter(s => s.album === 'Wildfire'), price: 11.99, cover: `${ALBUMS_PATH}album5.png`, releaseDate: '2026-03-05', genre: 'Rock' },
  { id: 6, title: 'Nocturne', artist: artists[5], songs: songs.filter(s => s.album === 'Nocturne'), price: 7.99, cover: `${ALBUMS_PATH}album6.png`, releaseDate: '2026-02-10', genre: 'Jazz' },
];

export const purchases = [
  { id: 1, userId: 1, songId: 3, date: '2026-03-10', price: 0.99, paymentMethod: 'Visa •••• 4242' },
  { id: 2, userId: 1, songId: 1, date: '2026-03-08', price: 1.29, paymentMethod: 'Visa •••• 4242' },
  { id: 3, userId: 2, songId: 2, date: '2026-03-07', price: 1.49, paymentMethod: 'PayPal' },
  { id: 4, userId: 2, songId: 5, date: '2026-03-06', price: 1.49, paymentMethod: 'Mastercard •••• 8888' },
  { id: 5, userId: 3, songId: 3, date: '2026-03-05', price: 0.99, paymentMethod: 'Apple Pay' },
];

export const users = [
  { id: 1, name: 'Alex Johnson', email: 'alex@example.com', role: 'user', joined: '2025-12-01', avatar: 'AJ', purchases: 12, spent: 15.87 },
  { id: 2, name: 'Maria Garcia', email: 'maria@example.com', role: 'user', joined: '2026-01-15', avatar: 'MG', purchases: 8, spent: 10.42 },
  { id: 3, name: 'James Wilson', email: 'james@example.com', role: 'artist', joined: '2025-11-20', avatar: 'JW', purchases: 5, spent: 6.25 },
  { id: 4, name: 'Sarah Chen', email: 'sarah@example.com', role: 'user', joined: '2026-02-10', avatar: 'SC', purchases: 3, spent: 3.77 },
  { id: 5, name: 'David Kim', email: 'david@example.com', role: 'admin', joined: '2025-10-01', avatar: 'DK', purchases: 0, spent: 0 },
];

// State management
export const appState = {
  currentUser: {
    id: 1,
    name: 'Alex Johnson',
    email: 'alex@example.com',
    role: 'user', // 'user', 'artist', 'admin'
    avatar: 'AJ',
  },
  currentView: 'home',
  currentSongId: null,
  isPlaying: false,
  currentTrack: null,
  purchasedSongIds: [1, 3],
  cart: [],
  searchQuery: '',
};

// Helper functions
export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatCurrency(amount) {
  return 'MK ' + new Intl.NumberFormat('en-MW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTimeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
