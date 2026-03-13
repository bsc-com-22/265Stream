// =============================================
// 265Stream - Auth Pages (Login / Register)
// =============================================
import { icon } from '../icons.js';
import { api } from '../apiClient.js';
import { showToast, navigate } from '../app.js';

export function renderAuthPage(container, mode = 'login') {
  // Handle when called with container as first arg
  if (typeof container === 'string') {
    mode = container;
    container = document.getElementById('main-content');
  }

  const isLogin = mode !== 'register';

  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">
            <span class="text-gradient" style="font-size: 1.8rem; font-weight: 900;">265Stream</span>
          </div>
          <p>${isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account and start listening.'}</p>
        </div>

        <form id="auth-form">
          ${!isLogin ? `
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input class="form-input" type="text" id="fullname" placeholder="John Doe" required/>
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="email" placeholder="you@example.com" required/>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" id="password" placeholder="••••••••" required/>
          </div>

          ${!isLogin ? `
            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input class="form-input" type="password" id="confirmPassword" placeholder="••••••••" required/>
            </div>
            <div class="form-group">
              <label class="form-label">I am a</label>
              <select class="form-select" id="role">
                <option value="listener">Music Listener</option>
                <option value="artist">Artist / Producer</option>
              </select>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" style="accent-color: var(--primary);">
                Remember me
              </label>
              <a href="#" style="font-size: 0.8rem; color: var(--primary); font-weight: 500;">Forgot password?</a>
            </div>
          `}

          <button class="btn btn-primary w-full btn-lg" type="submit" id="auth-submit-btn" style="margin-top: 0.5rem;">
            ${isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <div style="position: relative; text-align: center; margin: 1.5rem 0;">
            <span style="font-size: 0.8rem; color: var(--text-muted); background: var(--bg-secondary); padding: 0 0.75rem; position: relative; z-index: 1;">or continue with</span>
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--border);"></div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <button class="btn btn-secondary w-full" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button class="btn btn-secondary w-full" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              GitHub
            </button>
          </div>
        </form>

        <div class="auth-footer">
          ${isLogin
      ? `Don't have an account? <a href="#" onclick="window.navigateTo('register')">Sign up</a>`
      : `Already have an account? <a href="#" onclick="window.navigateTo('login')">Sign in</a>`
    }
        </div>
      </div>
    </div>
  `;

  // Attach form handler
  const form = document.getElementById('auth-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('auth-submit-btn');
      const originalText = submitBtn.textContent;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Please wait...';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (isLogin) {
          // Handle Login
          await api.login({ email, password });
          showToast('success', 'Welcome Back', 'Successfully signed in!');
          navigate('home');
        } else {
          // Handle Register
          const fullName = document.getElementById('fullname').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          const role = document.getElementById('role').value;

          if (password !== confirmPassword) {
            showToast('error', 'Error', 'Passwords do not match');
            throw new Error('Passwords do not match');
          }

          // Generate a quick username
          const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

          await api.register({ email, password, fullName, username, role });
          showToast('success', 'Account Created', 'Please check your email to verify your account, or sign in if verified.');
          navigate('login');
        }

      } catch (error) {
        console.error('Auth error:', error);
        const message = error.message || error.error || 'Something went wrong';
        showToast('error', isLogin ? 'Sign In Failed' : 'Registration Failed', message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}
