const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { GameSession } = require('../models');
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
        
        // Find or create game session for this user
        let gameSession = await GameSession.findOne({
            where: {
                userId: req.userId,
                gameType: 'tower-defense'
            }
        });
        
        let newXPEarned = 0;
        let lastPlayedAt = null;
        let isFirstTime = false;
        
        if (!gameSession) {
            // First time playing - create session
            gameSession = await GameSession.create({
                userId: req.userId,
                gameType: 'tower-defense',
                lastXPSnapshot: user.xp,
                lastPlayedAt: new Date()
            });
            isFirstTime = true;
            newXPEarned = user.xp; // All XP is "new" for first-time players
        } else {
            // Calculate XP earned since last play
            newXPEarned = Math.max(0, user.xp - gameSession.lastXPSnapshot);
            lastPlayedAt = gameSession.lastPlayedAt;
            
            // DON'T update the snapshot here - only update when coins are actually spent
            // This allows users to accumulate coins if they exit without spending
        }
        
        // Calculate coins: base 100 + 1 coin per 5 XP earned since last play
        const coinsFromNewXP = Math.floor(newXPEarned / 5);
        const availableCoins = 100 + coinsFromNewXP;
        
        // Calculate time since last play
        let timeSinceLastPlay = null;
        if (lastPlayedAt) {
            const hoursSinceLastPlay = Math.floor((Date.now() - new Date(lastPlayedAt).getTime()) / (1000 * 60 * 60));
            if (hoursSinceLastPlay < 1) {
                timeSinceLastPlay = 'Less than an hour ago';
            } else if (hoursSinceLastPlay < 24) {
                timeSinceLastPlay = `${hoursSinceLastPlay} hours ago`;
            } else {
                const days = Math.floor(hoursSinceLastPlay / 24);
                timeSinceLastPlay = `${days} day${days > 1 ? 's' : ''} ago`;
            }
        }
        
        res.json({
            access: true,
            userXP: user.xp,
            userLevel: user.level,
            availableCoins: availableCoins,
            baseCoins: 100,
            coinsFromNewXP: coinsFromNewXP,
            newXPEarned: newXPEarned,
            isFirstTime: isFirstTime,
            lastPlayedAt: lastPlayedAt,
            timeSinceLastPlay: timeSinceLastPlay,
            coinsFormula: 'Base 100 coins + 1 coin per 5 XP earned since last play',
            message: isFirstTime 
                ? 'Welcome to Tower Defense! You get 100 base coins plus coins for all your XP!' 
                : `Welcome back! You earned ${newXPEarned} XP since last play, giving you ${coinsFromNewXP} extra coins!`
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

// Update XP snapshot only when game is lost
router.post('/tower-defense/game-lost', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        
        // Find the game session
        const gameSession = await GameSession.findOne({
            where: {
                userId: req.userId,
                gameType: 'tower-defense'
            }
        });
        
        if (gameSession) {
            // Update the XP snapshot to current XP only when game is lost
            await gameSession.update({
                lastXPSnapshot: user.xp,
                lastPlayedAt: new Date()
            });
            
            console.log(`Game lost - Updated XP snapshot for user ${req.userId} to ${user.xp} XP`);
        }
        
        res.json({
            success: true,
            message: 'XP snapshot updated after game loss',
            currentXP: user.xp
        });
    } catch (error) {
        console.error('Error updating XP snapshot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Record game session (NO XP REWARDS - only tracking for stats)
router.post('/tower-defense/session', auth, async (req, res) => {
    try {
        const { 
            wavesCompleted, 
            enemiesDefeated, 
            timeSpent, 
            finalScore,
            gameLost = false,
            difficulty = 'intermediate' 
        } = req.body;

        // Update XP snapshot ONLY if the game was lost
        if (gameLost) {
            const user = await User.findByPk(req.userId);
            const gameSession = await GameSession.findOne({
                where: {
                    userId: req.userId,
                    gameType: 'tower-defense'
                }
            });
            
            if (gameSession) {
                await gameSession.update({
                    lastXPSnapshot: user.xp,
                    lastPlayedAt: new Date()
                });
                console.log(`Game lost - Updated XP snapshot for user ${req.userId} to ${user.xp} XP`);
            }
        }
        
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