// API Helper Functions
const API_BASE = '/api';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '/auth.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    async getProfile() {
        return apiRequest('/auth/profile');
    },
    
    async updateProfile(data) {
        return apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async changePassword(currentPassword, newPassword) {
        return apiRequest('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }
};

// Progress API
const progressAPI = {
    async recordActivity(activityData) {
        return apiRequest('/progress/activity', {
            method: 'POST',
            body: JSON.stringify(activityData)
        });
    },
    
    async getUserStats(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        return apiRequest(`/progress/stats?${params}`);
    },
    
    async getDetailedProgress(options = {}) {
        const params = new URLSearchParams();
        Object.keys(options).forEach(key => {
            if (options[key]) params.append(key, options[key]);
        });
        
        return apiRequest(`/progress/detailed?${params}`);
    },
    
    async getLeaderboard(period = 'all', limit = 10) {
        return apiRequest(`/progress/leaderboard?period=${period}&limit=${limit}`);
    }
};

// Lessons API
const lessonsAPI = {
    async getAllLessons(filters = {}) {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });
        
        return apiRequest(`/lessons?${params}`);
    },
    
    async getLessonById(id) {
        return apiRequest(`/lessons/${id}`);
    },
    
    async getLessonsByTopic(topic, difficulty) {
        const params = difficulty ? `?difficulty=${difficulty}` : '';
        return apiRequest(`/lessons/topic/${topic}${params}`);
    },
    
    async getLessonPath(topic) {
        return apiRequest(`/lessons/topic/${topic}/path`);
    },
    
    async completeLesson(id, data) {
        return apiRequest(`/lessons/${id}/complete`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async getRecommendedLessons(limit = 5) {
        return apiRequest(`/lessons/recommendations?limit=${limit}`);
    },
    
    async getLessonTopics() {
        return apiRequest('/lessons/topics');
    },
    
    async getRevisionMaterials(topic) {
        return apiRequest(`/lessons/revisions/${topic}`);
    },
    
    async getExampleProblems(topic) {
        return apiRequest(`/lessons/examples/${topic}`);
    }
};

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatXP(xp) {
    if (xp >= 1000) {
        return `${(xp / 1000).toFixed(1)}k`;
    }
    return xp.toString();
}

// Export for use in other scripts
window.API = {
    auth: authAPI,
    progress: progressAPI,
    lessons: lessonsAPI,
    utils: {
        formatDate,
        formatTime,
        formatXP,
        isAuthenticated,
        getAuthToken
    }
};