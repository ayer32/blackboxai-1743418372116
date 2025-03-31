// API Base URL
const API_URL = 'http://localhost:5000/api';

// Authentication Functions
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store user data and token
        localStorage.setItem('user', JSON.stringify(data.data));
        localStorage.setItem('token', data.token);

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function register(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password }),
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store user data and token
        localStorage.setItem('user', JSON.stringify(data.data));
        localStorage.setItem('token', data.token);

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function logout() {
    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Logout failed');
        }

        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');
    const loginError = document.querySelector('#loginError');
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');

    // Update UI based on authentication status
    function updateAuthUI() {
        const user = getCurrentUser();
        if (user) {
            loginBtn.textContent = 'Logout';
            loginBtn.onclick = handleLogout;
        } else {
            loginBtn.textContent = 'Login';
            loginBtn.onclick = () => loginModal.classList.remove('hidden');
        }
    }

    // Handle login form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        loginError.classList.add('hidden');

        const email = loginForm.querySelector('[type="email"]').value;
        const password = loginForm.querySelector('[type="password"]').value;

        try {
            await login(email, password);
            loginModal.classList.add('hidden');
            updateAuthUI();
            window.location.reload();
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    });

    // Handle logout
    async function handleLogout() {
        try {
            await logout();
            updateAuthUI();
            window.location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Close modal when clicking outside
    loginModal?.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });

    // Initialize UI
    updateAuthUI();
});

// Export functions for use in other files
window.auth = {
    login,
    register,
    logout,
    isAuthenticated,
    getCurrentUser
};