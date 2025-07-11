// API base URL
const API_BASE = '/api';

// Switch between login and register tabs
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[1].classList.add('active');
    }
    
    // Clear errors
    document.querySelectorAll('.error').forEach(e => {
        e.style.display = 'none';
        e.textContent = '';
    });
}

// Show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide all errors
function hideErrors() {
    document.querySelectorAll('.error').forEach(e => {
        e.style.display = 'none';
        e.textContent = '';
    });
}

// Show success message
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    successElement.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 5000);
}

// Save auth token
function saveAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideErrors();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginBtn');
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Logging in...';
    
    try {
        console.log('Attempting login with:', { email });
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            saveAuthToken(data.token);
            showSuccess('Login successful! Redirecting...');
            
            // Store user data
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            if (data.errors) {
                data.errors.forEach(error => {
                    if (error.param === 'email') {
                        showError('loginEmailError', error.msg);
                    } else if (error.param === 'password') {
                        showError('loginPasswordError', error.msg);
                    }
                });
            } else {
                showError('loginError', data.error || 'Login failed');
            }
        }
    } catch (error) {
        showError('loginError', 'Network error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

// Handle registration
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideErrors();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const submitBtn = document.getElementById('registerBtn');
    
    // Validate username
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        showError('registerUsernameError', 'Username must be 3-30 characters and contain only letters, numbers, and underscores');
        return;
    }
    
    // Validate password
    if (password.length < 6) {
        showError('registerPasswordError', 'Password must be at least 6 characters long');
        return;
    }
    
    if (!/\d/.test(password)) {
        showError('registerPasswordError', 'Password must contain at least one number');
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Creating account...';
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            saveAuthToken(data.token);
            showSuccess('Account created successfully! Redirecting...');
            
            // Store user data
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            if (data.errors) {
                data.errors.forEach(error => {
                    if (error.param === 'username') {
                        showError('registerUsernameError', error.msg);
                    } else if (error.param === 'email') {
                        showError('registerEmailError', error.msg);
                    } else if (error.param === 'password') {
                        showError('registerPasswordError', error.msg);
                    }
                });
            } else {
                showError('registerError', data.error || 'Registration failed');
            }
        }
    } catch (error) {
        showError('registerError', 'Network error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Optionally verify token is still valid
        window.location.href = '/dashboard.html';
    }
});