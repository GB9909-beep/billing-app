// ==================== Auth (Frontend) ====================
// Handles login form and session checks

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');

  // If we're on the login page
  if (loginForm) {
    // Check if already logged in
    checkAuth();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          window.location.href = '/dashboard';
        } else {
          showError(data.error || 'Login failed. Please try again.');
        }
      } catch (error) {
        showError('Connection error. Please try again.');
      } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '🔐 Sign In';
      }
    });
  }

  function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.add('show');
    setTimeout(() => loginError.classList.remove('show'), 4000);
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        // Already logged in, redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (e) {
      // Not logged in, stay on login page
    }
  }
});
