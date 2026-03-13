// =============================================
// 265Stream - Frontend API Client
// Connects the frontend UI to the backend API
// =============================================

const API_BASE_URL = 'http://127.0.0.1:4000/api';

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.accessToken = localStorage.getItem('265stream_token') || null;
    }

    // ---------- Internal helpers ----------

    getHeaders(contentType = 'application/json') {
        const headers = {};
        if (contentType) headers['Content-Type'] = contentType;
        if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
        return headers;
    }

    async request(method, endpoint, body = null, isFormData = false) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: isFormData
                ? { Authorization: this.accessToken ? `Bearer ${this.accessToken}` : undefined }
                : this.getHeaders(),
        };

        if (body) {
            options.body = isFormData ? body : JSON.stringify(body);
        }

        try {
            console.log(`[API Request] ${method} ${url}`);
            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                throw { status: response.status, ...data };
            }

            return data;
        } catch (error) {
            if (error.status === 401) {
                this.clearSession();
                // Redirect to login if needed
                if (typeof window !== 'undefined' && window.navigateTo) {
                    window.navigateTo('login');
                }
            }
            throw error;
        }
    }

    // ---------- Session management ----------

    setSession(accessToken, refreshToken) {
        this.accessToken = accessToken;
        localStorage.setItem('265stream_token', accessToken);
        if (refreshToken) localStorage.setItem('265stream_refresh', refreshToken);
    }

    clearSession() {
        this.accessToken = null;
        localStorage.removeItem('265stream_token');
        localStorage.removeItem('265stream_refresh');
        localStorage.removeItem('265stream_user');
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    getStoredUser() {
        const user = localStorage.getItem('265stream_user');
        return user ? JSON.parse(user) : null;
    }

    storeUser(user) {
        localStorage.setItem('265stream_user', JSON.stringify(user));
    }

    // ---------- Auth endpoints ----------

    async register({ email, password, fullName, username, role }) {
        const data = await this.request('POST', '/auth/register', {
            email, password, fullName, username, role,
        });
        return data;
    }

    async login({ email, password }) {
        const data = await this.request('POST', '/auth/login', { email, password });
        if (data.session) {
            this.setSession(data.session.access_token, data.session.refresh_token);
            this.storeUser(data.user);
        }
        return data;
    }

    async logout() {
        try {
            await this.request('POST', '/auth/logout');
        } catch {
            // Logout even if API fails
        }
        this.clearSession();
    }

    async getProfile() {
        return this.request('GET', '/auth/me');
    }

    async updateProfile(updates) {
        return this.request('PUT', '/auth/profile', updates);
    }

    async resendVerification() {
        return this.request('POST', '/auth/resend-verification');
    }

    // ---------- Music endpoints ----------

    async getSongs({ page, limit, genre, search, sort, artist_id } = {}) {
        const params = new URLSearchParams();
        if (page) params.set('page', page);
        if (limit) params.set('limit', limit);
        if (genre) params.set('genre', genre);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);
        if (artist_id) params.set('artist_id', artist_id);
        return this.request('GET', `/music/songs?${params}`);
    }

    async getSong(id) {
        return this.request('GET', `/music/songs/${id}`);
    }

    async getStreamUrl(songId) {
        return this.request('GET', `/music/songs/${songId}/stream`);
    }

    async getDownloadUrl(songId) {
        return this.request('GET', `/music/songs/${songId}/download`);
    }

    async uploadSong(formData) {
        return this.request('POST', '/music/songs/upload', formData, true);
    }

    async updateSong(id, updates) {
        return this.request('PUT', `/music/songs/${id}`, updates);
    }

    async deleteSong(id) {
        return this.request('DELETE', `/music/songs/${id}`);
    }

    async getArtistSongs() {
        return this.request('GET', '/music/artist/songs');
    }

    async getAlbums() {
        return this.request('GET', '/music/albums');
    }

    async getArtists() {
        return this.request('GET', '/music/artists');
    }

    // ---------- Purchase endpoints ----------

    async purchaseSong(songId, paymentInfo = {}) {
        return this.request('POST', `/purchases/song/${songId}`, paymentInfo);
    }

    async purchaseAlbum(albumId, paymentInfo = {}) {
        return this.request('POST', `/purchases/album/${albumId}`, paymentInfo);
    }

    async getPurchaseHistory({ page, limit } = {}) {
        const params = new URLSearchParams();
        if (page) params.set('page', page);
        if (limit) params.set('limit', limit);
        return this.request('GET', `/purchases?${params}`);
    }

    async getArtistSales() {
        return this.request('GET', '/purchases/artist');
    }

    // ---------- Admin endpoints ----------

    async getAdminDashboard() {
        return this.request('GET', '/admin/dashboard');
    }

    async getAdminUsers({ page, limit, role, search, status } = {}) {
        const params = new URLSearchParams();
        if (page) params.set('page', page);
        if (limit) params.set('limit', limit);
        if (role) params.set('role', role);
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        return this.request('GET', `/admin/users?${params}`);
    }

    async changeUserRole(userId, role) {
        return this.request('PUT', `/admin/users/${userId}/role`, { role });
    }

    async suspendUser(userId, suspended, reason) {
        return this.request('PUT', `/admin/users/${userId}/suspend`, { suspended, reason });
    }

    async getAdminArtists({ status, search } = {}) {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        return this.request('GET', `/admin/artists?${params}`);
    }

    async approveArtist(artistId, approved) {
        return this.request('PUT', `/admin/artists/${artistId}/approve`, { approved });
    }

    async verifyArtist(artistId, verified) {
        return this.request('PUT', `/admin/artists/${artistId}/verify`, { verified });
    }

    async getAdminContent({ status, page, limit } = {}) {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (page) params.set('page', page);
        if (limit) params.set('limit', limit);
        return this.request('GET', `/admin/content?${params}`);
    }

    async moderateContent(songId, status, notes) {
        return this.request('PUT', `/admin/content/${songId}/moderate`, { status, notes });
    }

    async getAdminPurchases({ page, limit, status } = {}) {
        const params = new URLSearchParams();
        if (page) params.set('page', page);
        if (limit) params.set('limit', limit);
        if (status) params.set('status', status);
        return this.request('GET', `/admin/purchases?${params}`);
    }

    async refundPurchase(purchaseId, reason) {
        return this.request('POST', `/purchases/${purchaseId}/refund`, { reason });
    }

    async getPlatformSettings() {
        return this.request('GET', '/admin/settings');
    }

    async updatePlatformSetting(key, value) {
        return this.request('PUT', `/admin/settings/${key}`, { value });
    }

    async getActivityLogs({ page, limit, action } = {}) {
        return this.request('GET', `/admin/activity-logs?page=${page || 1}&limit=${limit || 50}`);
    }

    async getAnalytics() {
        return this.request('GET', '/admin/analytics');
    }
}

// Export singleton instance
export const api = new ApiClient();
