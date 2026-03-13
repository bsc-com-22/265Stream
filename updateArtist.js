const fs = require('fs');
let code = fs.readFileSync('js/pages/artistDashboard.js', 'utf8');

// 1. Update imports
code = code.replace(
    /import \{ songs, artists, purchases, users, appState, formatNumber, formatCurrency, formatDate, getTimeAgo \} from '\.\.\/data\.js';/,
    "import { appState, formatNumber, formatCurrency, formatDate, getTimeAgo } from '../data.js';\nimport { api } from '../apiClient.js';"
);

// 2. Make renderArtistDashboard async and fetch data
const headerRegex = /export function renderArtistDashboard\(container, params = \{\}\) \{\s*const activeTab = params\.artistTab \|\| 'overview';/;
const headerReplacement = `export async function renderArtistDashboard(container, params = {}) {
    const activeTab = params.artistTab || 'overview';
    
    container.innerHTML = \`<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading Artist Studio...</p></div>\`;

    let artistSongs = [];
    let artistSales = [];
    let salesSummary = { totalSales: 0, totalRevenue: 0 };
    const user = api.getStoredUser() || appState.currentUser;

    try {
        const [songsRes, salesRes] = await Promise.all([
            api.getArtistSongs(),
            api.getArtistSales()
        ]);
        artistSongs = songsRes.songs || [];
        artistSales = salesRes.sales || [];
        salesSummary = salesRes.summary || { totalSales: 0, totalRevenue: 0 };
    } catch(err) {
        console.error('Artist fetch error:', err);
    }
    
    container.innerHTML = '';
`;
code = code.replace(headerRegex, headerReplacement);

// 3. Update tabs rendering object to pass parameters
const tabsRegex = /const tabs = \{\s*overview: renderArtistOverview,\s*upload: renderUpload,\s*songs: renderMySongs,\s*sales: renderSales,\s*analytics: renderAnalytics,\s*\};\s*const renderFn = tabs\[activeTab\] \|\| renderArtistOverview;\s*container\.innerHTML = \`<div class=\"page-container\">\$\{renderFn\(\)\}<\/div>\`;/;

const tabsReplacement = `const tabs = {
        overview: () => renderArtistOverview(user, artistSongs, artistSales, salesSummary),
        upload: () => renderUpload(user),
        songs: () => renderMySongs(user, artistSongs),
        sales: () => renderSales(user, artistSales, salesSummary),
        analytics: () => renderAnalytics(user, artistSongs, artistSales),
    };

    const renderFn = tabs[activeTab] || tabs.overview;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'page-container';
    wrapper.innerHTML = renderFn();
    container.appendChild(wrapper);`;
code = code.replace(tabsRegex, tabsReplacement);

// 4. In sidebar, replace appState user info with variable user
code = code.replace(/\$\{appState\.currentUser\.avatar\}/g, '${user.full_name ? user.full_name.substring(0,2).toUpperCase() : "A"}');
code = code.replace(/\$\{appState\.currentUser\.name\}/g, '${user.full_name || user.username || "Artist"}');

// 5. renderArtistOverview function definition and usage
code = code.replace(/function renderArtistOverview\(\) \{/, 'function renderArtistOverview(user, artistSongs, artistSales, salesSummary) {\n    const totalStreams = artistSongs.reduce((a, s) => a + (s.play_count || s.plays || 0), 0);');
code = code.replace(/<div class=\"stat-value\">12<\/div>/, '<div class="stat-value">${artistSongs.length}</div>');
code = code.replace(/<div class=\"stat-value\">\$2,847<\/div>/, '<div class="stat-value">${formatCurrency(parseFloat(salesSummary.totalRevenue || 0))}</div>');
code = code.replace(/<div class=\"stat-value\">1,245<\/div>/, '<div class="stat-value">${salesSummary.totalSales || 0}</div>');
code = code.replace(/<div class=\"stat-value\">\$\{formatNumber\(8940000\)\}<\/div>/, '<div class="stat-value">${formatNumber(totalStreams)}</div>');

// Recent Sales mapping -> use artistSales
const recentSalesRegex = /\$\{purchases\.slice\(0, 5\)\.map\(p => \{(.+?)\}\)\.join\(''\)\}/s;
const recentSalesReplacement = `\${artistSales.slice(0, 5).map(p => {
        return \`
              <tr>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700;">
                      \${p.buyer?.name ? p.buyer.name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <span>\${p.buyer?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div class="table-song-cell">
                    <img src="\${p.song?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
                    <div class="song-info">
                      <div class="title">\${p.song?.title || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td>\${getTimeAgo(p.createdAt)}</td>
                <td style="font-weight: 700; color: var(--success);">\${formatCurrency(p.amount)}</td>
              </tr>
            \`;
    }).join('')}`;
code = code.replace(recentSalesRegex, recentSalesReplacement);

// 6. renderUpload -> update
code = code.replace(/function renderUpload\(\) \{/, 'function renderUpload(user) {');

// 7. renderMySongs -> update to map over artistSongs
const mySongsRegex = /function renderMySongs\(\) \{[\s\S]*?\$\{songs\.map\(song => \{([\s\S]*?)\}\)\.join\(''\)\}/;
const mySongsReplacement = `function renderMySongs(user, artistSongs) {
    return \`
    <div class="page-header">
      <div class="flex justify-between items-center">
        <div>
          <h1>My Songs</h1>
          <p>Manage your published tracks</p>
        </div>
        <button class="btn btn-primary" onclick="window.navigateTo('artistDashboard', {artistTab: 'upload'})">
          \${icon('plus', 18)} Upload New Song
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
          \${artistSongs.length > 0 ? artistSongs.map(song => {
        return \`
              <tr>
                <td>
                  <div class="table-song-cell">
                    <img src="\${song.coverUrl || 'assets/images/albums/default.png'}" alt="\${song.title}"/>
                    <div class="song-info">
                      <div class="title">\${song.title}</div>
                      <div class="artist">\${song.album_name || 'Single'}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-primary">\${song.genre || 'N/A'}</span></td>
                <td style="font-weight: 600;">\${formatCurrency(parseFloat(song.price) || 0)}</td>
                <td>\${formatNumber(song.play_count || 0)}</td>
                <td>\${formatNumber(song.purchase_count || 0)}</td>
                <td><span class="badge \${song.status === 'published' ? 'badge-success' : 'badge-warning'}">\${song.status || 'Draft'}</span></td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" title="Edit">\${icon('edit', 14)}</button>
                    <button class="btn btn-sm btn-ghost" title="Analytics">\${icon('barChart', 14)}</button>
                    <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Delete" onclick="window.deleteSong('\${song.id}')">\${icon('trash', 14)}</button>
                  </div>
                </td>
              </tr>
            \`;
    }).join('') : '<tr><td colspan="7" class="text-center" style="padding:2rem;">No songs uploaded yet</td></tr>'}
\``;
code = code.replace(mySongsRegex, mySongsReplacement);

// 8. renderSales -> update
const salesRegex = /function renderSales\(\) \{[\s\S]*?<div class=\"stat-value\">\$2,847\.35<\/div>[\s\S]*?<div class=\"stat-value\">1,245<\/div>[\s\S]*?\$\{purchases\.map\(\(p, i\) => \{([\s\S]*?)\}\)\.join\(''\)\}/;
const salesReplacement = `function renderSales(user, artistSales, salesSummary) {
    return \`
    <div class="page-header">
      <h1>Sales Dashboard</h1>
      <p>Track your revenue and buyer activity</p>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">\${icon('dollarSign', 22)}</div>
        <div class="stat-value">\${formatCurrency(parseFloat(salesSummary.totalRevenue) || 0)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">\${icon('shoppingCart', 22)}</div>
        <div class="stat-value">\${salesSummary.totalSales || 0}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">\${icon('trendingUp', 22)}</div>
        <div class="stat-value">\${salesSummary.totalSales > 0 ? formatCurrency(parseFloat(salesSummary.totalRevenue) / salesSummary.totalSales) : '$0.00'}</div>
        <div class="stat-label">Avg. Order Value</div>
      </div>
    </div>

    <div class="section-header mt-3">
      <h2>All Sales</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Buyer</th>
            <th>Song</th>
            <th>Date</th>
            <th>Payment</th>
            <th>Earnings</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          \${artistSales.length > 0 ? artistSales.map((p, i) => {
        return \`
              <tr>
                <td style="font-weight: 600;">#\${String(1000 + i).padStart(4, '0')}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">
                      \${p.buyer?.name ? p.buyer.name.substring(0,2).toUpperCase() : '??'}
                    </div>
                    <span>\${p.buyer?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div class="table-song-cell">
                    <img src="\${p.song?.coverUrl || 'assets/images/albums/default.png'}" alt=""/>
                    <div class="song-info">
                      <div class="title">\${p.song?.title || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td>\${formatDate(p.createdAt)}</td>
                <td style="font-size: 0.8rem;">\${p.paymentMethod}</td>
                <td style="font-weight: 700; color: var(--success);">\${formatCurrency(p.artistEarnings)}</td>
                <td><span class="badge badge-success">\${icon('check', 10)} \${p.status}</span></td>
              </tr>
            \`;
    }).join('') : '<tr><td colspan="7" class="text-center" style="padding:2rem;">No sales yet</td></tr>'}\``;
code = code.replace(salesRegex, salesReplacement);

// 9. renderAnalytics -> update
const analyticsRegex = /function renderAnalytics\(\) \{[\s\S]*?<div class=\"stat-value\">12<\/div>[\s\S]*?<div class=\"stat-value\">1,245<\/div>[\s\S]*?<div class=\"stat-value\">\$2,847<\/div>[\s\S]*?\$\{\[\.\.\.songs\]\.sort\(\(a, b\) => b\.plays - a\.plays\)\.slice\(0, 8\)\.map\(\(song, i\) => \{([\s\S]*?)\}\)\.join\(''\)\}/;
const analyticsReplacement = `function renderAnalytics(user, artistSongs, artistSales) {
    const totalStreams = artistSongs.reduce((a, s) => a + (s.play_count || 0), 0);
    const totalRevenue = artistSales.reduce((a, s) => a + parseFloat(s.artistEarnings || 0), 0);

    return \`
    <div class="page-header">
      <h1>Analytics</h1>
      <p>Deep insights into your music performance</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-accent: var(--primary);">
        <div class="stat-icon">\${icon('music', 22)}</div>
        <div class="stat-value">\${artistSongs.length}</div>
        <div class="stat-label">Total Songs</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--success);">
        <div class="stat-icon" style="background: rgba(34,197,94,0.12); color: var(--success);">\${icon('shoppingCart', 22)}</div>
        <div class="stat-value">\${artistSales.length}</div>
        <div class="stat-label">Total Sales</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--info);">
        <div class="stat-icon" style="background: rgba(59,130,246,0.12); color: var(--info);">\${icon('dollarSign', 22)}</div>
        <div class="stat-value">\${formatCurrency(totalRevenue)}</div>
        <div class="stat-label">Total Earnings</div>
      </div>
      <div class="stat-card" style="--stat-accent: var(--warning);">
        <div class="stat-icon" style="background: rgba(245,158,11,0.12); color: var(--warning);">\${icon('users', 22)}</div>
        <div class="stat-value">\${formatNumber(user.follower_count || 0)}</div>
        <div class="stat-label">Followers</div>
      </div>
    </div>

    <!-- Performance chart -->
    <div class="settings-card mb-3">
      <h3>Streaming Performance</h3>
      <div style="display: flex; align-items: flex-end; gap: 8px; height: 200px; padding-top: 1rem;">
        \${generateBarChart()}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; padding: 0 4px;">
        \${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m =>
        \`<span style="font-size: 0.65rem; color: var(--text-muted); flex: 1; text-align: center;">\${m}</span>\`
    ).join('')}
      </div>
    </div>

    <!-- Top Songs -->
    <div class="section-header mt-3">
      <h2>Top Performing Songs</h2>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Song</th>
            <th>Plays</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
          \${[...artistSongs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 8).map((song, i) => {
        return \`
              <tr>
                <td style="font-weight: 700; color: \${i < 3 ? 'var(--primary)' : 'var(--text-muted)'};">\${i + 1}</td>
                <td>
                  <div class="table-song-cell">
                    <img src="\${song.coverUrl || 'assets/images/albums/default.png'}" alt="\${song.title}"/>
                    <div class="song-info">
                      <div class="title">\${song.title}</div>
                      <div class="artist">\${song.album_name || 'Single'}</div>
                    </div>
                  </div>
                </td>
                <td>\${formatNumber(song.play_count || 0)}</td>
                <td>\${formatNumber(song.purchase_count || 0)}</td>
              </tr>
            \`;
    }).join('')}\``;

code = code.replace(analyticsRegex, analyticsReplacement);

if (!code.includes('window.deleteSong')) {
    code += `\nwindow.deleteSong = async function(id) {\n  if(confirm('Are you sure you want to delete this song?')) {\n    try {\n      await api.deleteSong(id);\n      import('../app.js').then(m => { m.showToast('success', 'Deleted', 'Song deleted successfully'); m.navigate('artistDashboard', {artistTab: 'songs'}); });\n    } catch(e) {\n      import('../app.js').then(m => m.showToast('error', 'Error', 'Failed to delete song'));\n    }\n  }\n};\n`;
}

fs.writeFileSync('js/pages/artistDashboard.js', code);
