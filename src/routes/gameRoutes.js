const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { Op } = require('sequelize');

// Middleware to check if user has minimum XP to play games
const checkMinimumXP = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.userId);
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
        const user = await User.findByPk(req.userId);
        const { Progress } = require('../models');
        
        // Calculate coins based on worksheet completions only
        // Each completed practice/worksheet gives coins based on score
        const worksheetProgress = await Progress.findAll({
            where: {
                userId: req.userId,
                activityType: 'practice',
                score: { [Op.gte]: 70 } // Only count successful completions
            },
            attributes: ['score', 'xpEarned']
        });
        
        // Calculate total coins from XP earned in worksheets
        // Players get 1 coin for every 5 XP earned from worksheets
        const totalWorksheetXP = worksheetProgress.reduce((total, progress) => {
            return total + (progress.xpEarned || 0);
        }, 0);
        
        const availableCoins = Math.floor(totalWorksheetXP / 5);
        
        res.json({
            access: true,
            userXP: user.xp,
            userLevel: user.level,
            availableCoins: availableCoins,
            worksheetsCompleted: worksheetProgress.length,
            totalWorksheetXP: totalWorksheetXP,
            coinsFormula: '1 coin per 5 XP from worksheets',
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

// Record game session (NO XP REWARDS - only tracking for stats)
router.post('/tower-defense/session', auth, async (req, res) => {
    try {
        const { 
            wavesCompleted, 
            enemiesDefeated, 
            timeSpent, 
            finalScore,
            difficulty = 'intermediate' 
        } = req.body;

        // Just acknowledge the game session without awarding XP
        // Games don't give XP or coins - only worksheets do
        
        res.json({
            success: true,
            message: 'Game session recorded',
            xpEarned: 0, // No XP from games
            coinsEarned: 0, // No coins from games
            note: 'Complete math worksheets to earn coins for the game!'
        });
    } catch (error) {
        console.error('Error recording game session:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;