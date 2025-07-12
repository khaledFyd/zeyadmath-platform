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
    
    // Add error styling to input
    const inputId = elementId.replace('Error', '');
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.add('error-input');
        input.classList.remove('success-input');
    }
}

// Show success on input
function showSuccess(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.add('success-input');
        input.classList.remove('error-input');
    }
    
    // Hide any associated error
    const errorId = inputId + 'Error';
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Hide all errors
function hideErrors() {
    document.querySelectorAll('.error').forEach(e => {
        e.style.display = 'none';
        e.textContent = '';
    });
    
    // Remove all input styling
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error-input', 'success-input');
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
    
    const emailOrUsername = document.getElementById('loginEmailOrUsername').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginBtn');
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Logging in...';
    
    try {
        console.log('Attempting login with:', { emailOrUsername });
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emailOrUsername, password })
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
            if (data.fieldErrors) {
                // Handle field-specific errors
                if (data.fieldErrors.emailOrUsername) {
                    showError('loginEmailOrUsernameError', data.fieldErrors.emailOrUsername);
                }
                if (data.fieldErrors.password) {
                    showError('loginPasswordError', data.fieldErrors.password);
                }
            } else if (data.errors) {
                // Handle validation errors
                data.errors.forEach(error => {
                    if (error.path === 'emailOrUsername' || error.param === 'emailOrUsername') {
                        showError('loginEmailOrUsernameError', error.msg);
                    } else if (error.path === 'password' || error.param === 'password') {
                        showError('loginPasswordError', error.msg);
                    }
                });
            } else {
                showError('loginError', data.error || data.message || 'Login failed');
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
    if (username.length < 3) {
        showError('registerUsernameError', 'Username too short. Try something like: john_doe, student123, or math_lover');
        return;
    }
    
    if (username.length > 30) {
        showError('registerUsernameError', 'Username too long. Keep it under 30 characters');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('registerUsernameError', 'Invalid characters! Only use letters, numbers, and underscores. Example: john_doe ✓, john.doe ✗');
        return;
    }
    
    // Validate email
    if (!email.includes('@') || !email.includes('.')) {
        showError('registerEmailError', 'Please enter a valid email address. Example: student@example.com');
        return;
    }
    
    // Validate password
    if (password.length < 6) {
        showError('registerPasswordError', 'Password too short! Make it at least 6 characters. Example: math123, secure456');
        return;
    }
    
    if (!/\d/.test(password)) {
        showError('registerPasswordError', 'Add at least one number to your password. Example: password1 ✓, password ✗');
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
            if (data.fieldErrors) {
                // Handle field-specific errors
                if (data.fieldErrors.username) {
                    showError('registerUsernameError', data.fieldErrors.username);
                }
                if (data.fieldErrors.email) {
                    showError('registerEmailError', data.fieldErrors.email);
                }
                if (data.fieldErrors.password) {
                    showError('registerPasswordError', data.fieldErrors.password);
                }
            } else if (data.errors) {
                // Handle validation errors
                data.errors.forEach(error => {
                    if (error.path === 'username' || error.param === 'username') {
                        showError('registerUsernameError', error.msg);
                    } else if (error.path === 'email' || error.param === 'email') {
                        showError('registerEmailError', error.msg);
                    } else if (error.path === 'password' || error.param === 'password') {
                        showError('registerPasswordError', error.msg);
                    }
                });
            } else {
                showError('registerError', data.error || data.message || 'Registration failed');
            }
        }
    } catch (error) {
        showError('registerError', 'Network error. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Real-time validation for login form
document.getElementById('loginEmailOrUsername').addEventListener('blur', function() {
    const value = this.value.trim();
    if (!value) {
        showError('loginEmailOrUsernameError', 'Please enter your email or username. Example: demo@zeyadmath.com or demo_student');
    } else {
        showSuccess('loginEmailOrUsername');
    }
});

document.getElementById('loginPassword').addEventListener('blur', function() {
    const value = this.value;
    if (!value) {
        showError('loginPasswordError', 'Password is required');
    } else {
        showSuccess('loginPassword');
    }
});

// Real-time validation for registration form
document.getElementById('registerUsername').addEventListener('input', function() {
    const value = this.value;
    
    if (value.length > 0 && value.length < 3) {
        showError('registerUsernameError', 'Too short! Need at least 3 characters');
    } else if (value.length > 30) {
        showError('registerUsernameError', 'Too long! Maximum 30 characters');
    } else if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
        showError('registerUsernameError', 'Only letters, numbers, and underscores allowed');
    } else if (value.length >= 3) {
        showSuccess('registerUsername');
    }
});

document.getElementById('registerEmail').addEventListener('blur', function() {
    const value = this.value;
    if (value && (!value.includes('@') || !value.includes('.'))) {
        showError('registerEmailError', 'Please enter a valid email. Example: student@example.com');
    } else if (value) {
        showSuccess('registerEmail');
    }
});

document.getElementById('registerPassword').addEventListener('input', function() {
    const value = this.value;
    
    if (value.length > 0 && value.length < 6) {
        showError('registerPasswordError', `${value.length}/6 characters - keep going!`);
    } else if (value.length >= 6 && !/\d/.test(value)) {
        showError('registerPasswordError', 'Almost there! Just add a number');
    } else if (value.length >= 6 && /\d/.test(value)) {
        showSuccess('registerPassword');
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