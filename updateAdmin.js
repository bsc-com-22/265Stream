const fs = require('fs');
let code = fs.readFileSync('js/pages/adminPanel.js', 'utf8');

// 1. Update imports
code = code.replace(
    /import \{ songs, artists, albums, purchases, users, appState, formatNumber, formatCurrency, formatDate, getTimeAgo \} from '\.\.\/data\.js';/,
    "import { appState, formatNumber, formatCurrency, formatDate, getTimeAgo } from '../data.js';\nimport { api } from '../apiClient.js';"
);

// 2. Make renderAdminPanel async and selective fetch
const headerRegex = /export function renderAdminPanel\(container, params = \{\}\) \{\s*const activeTab = params\.adminTab \|\| 'overview';/;
const headerReplacement = `export async function renderAdminPanel(container, params = {}) {
    const activeTab = params.adminTab || 'overview';
    
    container.innerHTML = \`<div style="display:flex; justify-content:center; align-items:center; min-height:50vh; width: 100%;"><p style="color:var(--text-muted); font-size:1.2rem;">Loading Admin Panel...</p></div>\`;
    
    let adminData = { users: [], artists: [], songs: [], purchases: [], dashboard: {} };
    try {
        if (activeTab === 'overview') {
            const dash = await api.getAdminDashboard();
            adminData.dashboard = dash.stats || {};
            adminData.recentActivity = dash.recentActivity || [];
        } else if (activeTab === 'users') {
            const res = await api.getAdminUsers({ limit: 100 });
            adminData.users = res.users || [];
        } else if (activeTab === 'artists') {
            const res = await api.getAdminArtists();
            adminData.artists = res.artists || [];
        } else if (activeTab === 'content') {
            const res = await api.getAdminContent({ limit: 100 });
            adminData.songs = res.songs || [];
        } else if (activeTab === 'purchases') {
            const res = await api.getAdminPurchases({ limit: 100 });
            adminData.purchases = res.purchases || [];
        }
    } catch(err) {
        console.error('Admin API error:', err);
    }
    
    container.innerHTML = '';
`;
code = code.replace(headerRegex, headerReplacement);

// 3. Setup tabs & sidebar replacements
// Replace users/artists/songs lengths in sidebar with "..." or values if available
code = code.replace(/<span class=\"badge\">\$\{users\.length\}<\/span>/, '');
code = code.replace(/<span class=\"badge\">\$\{artists\.length\}<\/span>/, '');
code = code.replace(/<span class=\"badge\">\$\{songs\.length\}<\/span>/, '');

const tabsRegex = /const tabs = \{\s*overview: renderAdminOverview,\s*users: renderUserManagement,\s*artists: renderArtistManagement,\s*content: renderContentModeration,\s*purchases: renderPurchaseRecords,\s*\};\s*const renderFn = tabs\[activeTab\] \|\| renderAdminOverview;\s*container\.innerHTML = \`<div class=\"page-container\">\$\{renderFn\(\)\}<\/div>\`;/;

const tabsReplacement = `const tabs = {
        overview: () => renderAdminOverview(adminData.dashboard, adminData.recentActivity),
        users: () => renderUserManagement(adminData.users),
        artists: () => renderArtistManagement(adminData.artists),
        content: () => renderContentModeration(adminData.songs),
        purchases: () => renderPurchaseRecords(adminData.purchases),
    };

    const renderFn = tabs[activeTab] || tabs.overview;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'page-container';
    wrapper.innerHTML = renderFn();
    container.appendChild(wrapper);`;
code = code.replace(tabsRegex, tabsReplacement);


// 4. Update individual render functions
// Overview
const overviewRegex = /function renderAdminOverview\(\) \{[\s\S]*?const totalRevenue = purchases\.reduce\(\(sum, p\) => sum \+ p\.price, 0\);/;
const overviewReplacement = `function renderAdminOverview(stats = {}, recentActivity = []) {
    const totalRevenue = stats.totalRevenue || 0;`;
code = code.replace(overviewRegex, overviewReplacement);

code = code.replace(/<div class=\"stat-value\">\$\{users\.length\}<\/div>/, '<div class="stat-value">${stats.totalUsers || 0}</div>');
code = code.replace(/<div class=\"stat-value\">\$\{artists\.length\}<\/div>/, '<div class="stat-value">${stats.totalArtists || 0}</div>');
code = code.replace(/<div class=\"stat-value\">\$\{songs\.length\}<\/div>/, '<div class="stat-value">${stats.totalSongs || 0}</div>');

const recentActivityRegex = /\$\{\[[\s\S]*?\]\.map\(item => `([\s\S]*?)`\)\.join\(''\)\}/;
const recentActivityReplacement = `\${recentActivity.slice(0, 5).map(item => {
    let iconName = 'activity'; let color = 'var(--info)';
    if(item.action.includes('user')) { iconName = 'user'; color = 'var(--primary)'; }
    if(item.action.includes('artist')) { iconName = 'mic'; color = 'var(--warning)'; }
    if(item.action.includes('purchase')) { iconName = 'shoppingCart'; color = 'var(--success)'; }
    if(item.action.includes('content')) { iconName = 'music'; color = 'var(--danger)'; }
    return \`
            <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
              <div style="width: 36px; height: 36px; border-radius: var(--radius-full); background: \${color}15; color: \${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                \${icon(iconName, 16)}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 0.85rem; font-weight: 500;">\${item.actor?.full_name || 'System'} \${item.action.replace('.', ' ')}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">\${getTimeAgo(item.created_at)}</div>
              </div>
            </div>
          \`;
    }).join('')}`;
code = code.replace(recentActivityRegex, recentActivityReplacement);


// Users
code = code.replace(/function renderUserManagement\(\) \{/, 'function renderUserManagement(users = []) {');
code = code.replace(/\$\{users\.map\(user => `/g, '${users.map(user => `');
code = code.replace(/\$\{user\.avatar\}/g, '${user.full_name ? user.full_name.substring(0, 2).toUpperCase() : "U"}');
code = code.replace(/\$\{user\.name\}/g, '${user.full_name || user.username || "User"}');
code = code.replace(/\$\{formatDate\(user\.joined\)\}/g, '${formatDate(user.created_at)}');
code = code.replace(/<td>\$\{user\.purchases\}<\/td>/g, '<td>-</td>');
code = code.replace(/<td style=\"font-weight: 600;\">\$\{formatCurrency\(user\.spent\)\}<\/td>/g, '<td style="font-weight: 600;">-</td>');
code = code.replace(/<td><span class=\"badge badge-success\">Active<\/span><\/td>/, '<td><span class="badge ${user.is_active ? \'badge-success\' : \'badge-danger\'}">${user.is_active ? \'Active\' : \'Suspended\'}</span></td>');


// Artists
code = code.replace(/function renderArtistManagement\(\) \{/, 'function renderArtistManagement(artists = []) {');
const artistsLoopRegex = /\$\{artists\.map\(artist => \{([\s\S]*?)const revenue =[\s\S]*?return `([\s\S]*?)`;\s*\}\)\.join\(''\)\}/;
const artistsLoopReplacement = `\${artists.map(artist => {
        const revenue = artist.total_earnings || 0;
        return \`
              <tr>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 36px; height: 36px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary), #FF4444); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
                      \${artist.artist_name ? artist.artist_name.substring(0,2).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <span style="font-weight: 600;">\${artist.artist_name || 'Unknown'}</span>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-primary">Various</span></td>
                <td>-</td>
                <td>\${formatNumber(artist.follower_count || 0)}</td>
                <td>
                  \${artist.verified
                ? \`<span class="badge badge-success">\${icon('check', 10)} Verified</span>\`
                : \`<span class="badge badge-warning">Pending</span>\`
            }
                </td>
                <td style="font-weight: 600; color: var(--success);">\${formatCurrency(parseFloat(revenue))}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" title="View Profile">\${icon('eye', 14)}</button>
                    \${!artist.verified ? \`<button class="btn btn-sm btn-ghost" style="color: var(--success);" title="Verify">\${icon('check', 14)}</button>\` : ''}
                    <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Remove">\${icon('trash', 14)}</button>
                  </div>
                </td>
              </tr>
            \`;
    }).join('')}`;
code = code.replace(artistsLoopRegex, artistsLoopReplacement);

// Content 
code = code.replace(/function renderContentModeration\(\) \{/, 'function renderContentModeration(songs = []) {');
const contentLoopRegex = /\$\{songs\.map\(\(song, i\) => \{([\s\S]*?)const statuses = [\s\S]*?return `([\s\S]*?)`;\s*\}\)\.join\(''\)\}/;
const contentLoopReplacement = `\${songs.map((song, i) => {
        const status = song.status || 'published';
        const statusClass = status === 'published' ? 'badge-success' : status === 'pending_review' ? 'badge-warning' : 'badge-danger';
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
                <td style="font-weight: 500;">\${song.artist?.artist_name || 'Unknown'}</td>
                <td><span class="badge badge-primary">\${song.genre || '-'}</span></td>
                <td>\${formatCurrency(song.price || 0)}</td>
                <td>\${formatDate(song.created_at)}</td>
                <td><span class="badge \${statusClass}">\${status === 'published' ? icon('check', 10) + ' ' : ''}\${status}</span></td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" title="Preview">\${icon('eye', 14)}</button>
                    \${status === 'pending_review' ? \`<button class="btn btn-sm btn-ghost" style="color: var(--success);" title="Approve">\${icon('check', 14)}</button>\` : ''}
                    <button class="btn btn-sm btn-ghost" style="color: var(--danger);" title="Remove">\${icon('trash', 14)}</button>
                  </div>
                </td>
              </tr>
            \`;
    }).join('')}`;
code = code.replace(contentLoopRegex, contentLoopReplacement);

// Purchases
const purchasesRegex = /function renderPurchaseRecords\(\) \{[\s\S]*?const totalRevenue = purchases\.reduce\(\(sum, p\) => sum \+ p\.price, 0\);/;
const purchasesReplacement = `function renderPurchaseRecords(purchases = []) {
    const totalRevenue = purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);`;
code = code.replace(purchasesRegex, purchasesReplacement);

const purchasesLoopRegex = /\$\{purchases\.map\(\(p, i\) => \{([\s\S]*?)const song = [\s\S]*?return `([\s\S]*?)`;\s*\}\)\.join\(''\)\}/;
const purchasesLoopReplacement = `\${purchases.map((p, i) => {
        return \`
              <tr>
                <td style="font-weight: 600; font-family: monospace; font-size: 0.8rem;">TXN-\${p.id.substring(0,6).toUpperCase()}</td>
                <td>
                  <div class="flex items-center gap-1">
                    <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">
                      \${p.buyer?.full_name ? p.buyer.full_name.substring(0,2).toUpperCase() : '??'}
                    </div>
                    <span>\${p.buyer?.full_name || 'Unknown'}</span>
                  </div>
                </td>
                <td>
                  <div class="table-song-cell">
                    <img src="\${p.song?.coverStoragePath || 'assets/images/albums/default.png'}" alt=""/>
                    <div class="song-info">
                      <div class="title">\${p.song?.title || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td>\${p.artist?.artist_name || 'Unknown'}</td>
                <td>\${formatDate(p.created_at)}</td>
                <td style="font-size: 0.8rem;">\${p.payment_method || 'card'}</td>
                <td style="font-weight: 700; color: var(--success);">\${formatCurrency(p.amount || 0)}</td>
                <td><span class="badge \${p.status === 'completed' ? 'badge-success' : 'badge-warning'}">\${icon('check', 10)} \${p.status}</span></td>
              </tr>
            \`;
    }).join('')}`;
code = code.replace(purchasesLoopRegex, purchasesLoopReplacement);

fs.writeFileSync('js/pages/adminPanel.js', code);
