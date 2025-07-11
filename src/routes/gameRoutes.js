const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Middleware to check if user has minimum XP to play games
const checkMinimumXP = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user has at least 100 XP
        if (user.xp < 100) {
            return res.status(403).json({ 
                message: 'You need at least 100 XP to play this game',
                currentXP: user.xp,
                requiredXP: 100,
                xpNeeded: 100 - user.xp
            });
        }

        // Attach user XP to request for use in game
        req.userXP = user.xp;
        req.userLevel = user.level;
        next();
    } catch (error) {
        console.error('Error checking XP:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get game access with XP validation
router.get('/tower-defense/access', auth, checkMinimumXP, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        // Calculate how much XP can be used as game coins
        // Users can use their XP above 100 as coins (keeping minimum 100 XP)
        const availableCoins = Math.max(0, user.xp - 100);
        
        res.json({
            access: true,
            userXP: user.xp,
            userLevel: user.level,
            availableCoins: availableCoins,
            message: 'Access granted to tower defense game'
        });
    } catch (error) {
        console.error('Error getting game access:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve the tower defense game (only if user has enough XP)
router.get('/tower-defense', auth, checkMinimumXP, (req, res) => {
    res.sendFile('tower-defense-xp.html', { 
        root: './src/games/',
        headers: {
            'X-User-XP': req.userXP,
            'X-User-Level': req.userLevel,
            'X-Available-Coins': Math.max(0, req.userXP - 100)
        }
    });
});

// Record game session and award XP
router.post('/tower-defense/session', auth, async (req, res) => {
    try {
        const { 
            wavesCompleted, 
            enemiesDefeated, 
            timeSpent, 
            finalScore,
            difficulty = 'intermediate' 
        } = req.body;

        // Import progress controller to reuse XP calculation logic
        const progressController = require('../controllers/progressController');
        
        // Create activity data for XP calculation
        const activityData = {
            activityType: 'practice',
            topic: 'tower-defense',
            score: finalScore,
            timeSpent: timeSpent,
            difficulty: difficulty,
            metadata: {
                wavesCompleted,
                enemiesDefeated,
                gameType: 'tower-defense'
            }
        };

        // Use existing progress recording logic
        req.body = activityData;
        progressController.recordActivity(req, res);
    } catch (error) {
        console.error('Error recording game session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;