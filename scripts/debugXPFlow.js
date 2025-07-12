#!/usr/bin/env node

/**
 * Debug script to check XP flow from worksheets to tower defense coins
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { User, Progress } = require('../src/models');
const { Op } = require('sequelize');

async function debugXPFlow() {
    try {
        console.log('=== XP to Coins Debug Report ===\n');
        
        // Connect to database
        await sequelize.authenticate();
        console.log('✓ Connected to database\n');
        
        // Get all users
        const users = await User.findAll();
        console.log(`Found ${users.length} users\n`);
        
        for (const user of users) {
            console.log(`\n--- User: ${user.username} (ID: ${user.id}) ---`);
            console.log(`Total XP: ${user.xp}`);
            console.log(`Level: ${user.level}`);
            
            // Get all practice activities for this user
            const practiceActivities = await Progress.findAll({
                where: {
                    userId: user.id,
                    activityType: 'practice'
                },
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            
            console.log(`\nPractice Activities (${practiceActivities.length} recent):`);
            
            let totalPracticeXP = 0;
            practiceActivities.forEach(activity => {
                const metadata = activity.metadata || {};
                console.log(`  - Topic: ${activity.topic}`);
                console.log(`    Score: ${activity.score}%`);
                console.log(`    XP Earned: ${activity.xpEarned}`);
                console.log(`    Created: ${activity.createdAt}`);
                if (metadata.incrementalSave) {
                    console.log(`    Type: Incremental Save`);
                    console.log(`    Points: ${metadata.pointsEarned || 'N/A'}`);
                    console.log(`    Exact XP: ${metadata.exactXP || 'N/A'}`);
                }
                console.log('');
                totalPracticeXP += activity.xpEarned || 0;
            });
            
            // Get worksheet completions with score >= 70
            const successfulWorksheets = await Progress.findAll({
                where: {
                    userId: user.id,
                    activityType: 'practice',
                    score: { [Op.gte]: 70 }
                },
                attributes: ['score', 'xpEarned']
            });
            
            const totalWorksheetXP = successfulWorksheets.reduce((total, progress) => {
                return total + (progress.xpEarned || 0);
            }, 0);
            
            const availableCoins = Math.floor(totalWorksheetXP / 5);
            
            console.log(`\nTower Defense Coin Calculation:`);
            console.log(`  Successful worksheets (score >= 70%): ${successfulWorksheets.length}`);
            console.log(`  Total XP from successful worksheets: ${totalWorksheetXP}`);
            console.log(`  Available coins (XP/5): ${availableCoins}`);
            
            // Check for any issues
            if (practiceActivities.length > 0 && availableCoins === 0) {
                console.log(`\n⚠️  ISSUE DETECTED: User has practice activities but no coins!`);
                console.log(`   Possible causes:`);
                console.log(`   - All practice activities have score < 70%`);
                console.log(`   - XP values are not being saved correctly`);
                console.log(`   - xpOverride might not be working as expected`);
            }
            
            // Check for xpOverride usage
            const activitiesWithOverride = practiceActivities.filter(a => 
                a.metadata && (a.metadata.incrementalSave || a.metadata.exactXP)
            );
            
            if (activitiesWithOverride.length > 0) {
                console.log(`\n📊 XP Override Usage:`);
                console.log(`  Activities with xpOverride: ${activitiesWithOverride.length}/${practiceActivities.length}`);
                
                // Check if xpOverride values match xpEarned
                let mismatchCount = 0;
                activitiesWithOverride.forEach(activity => {
                    const expectedXP = activity.metadata.exactXP || activity.metadata.pointsEarned;
                    if (expectedXP && expectedXP !== activity.xpEarned) {
                        mismatchCount++;
                        console.log(`  ⚠️  Mismatch: Expected ${expectedXP} XP, got ${activity.xpEarned}`);
                    }
                });
                
                if (mismatchCount > 0) {
                    console.log(`\n⚠️  Found ${mismatchCount} XP mismatches!`);
                    console.log(`   The xpOverride might not be working correctly.`);
                }
            }
        }
        
        // Summary of potential issues
        console.log('\n\n=== Summary of Findings ===');
        
        // Check if any practice activities exist
        const totalPracticeActivities = await Progress.count({
            where: { activityType: 'practice' }
        });
        
        console.log(`Total practice activities in database: ${totalPracticeActivities}`);
        
        if (totalPracticeActivities === 0) {
            console.log('\n⚠️  No practice activities found in the database!');
            console.log('   Users need to complete worksheets to earn coins.');
        }
        
        // Check score distribution
        const lowScoreActivities = await Progress.count({
            where: {
                activityType: 'practice',
                score: { [Op.lt]: 70 }
            }
        });
        
        const highScoreActivities = await Progress.count({
            where: {
                activityType: 'practice',
                score: { [Op.gte]: 70 }
            }
        });
        
        console.log(`\nScore distribution:`);
        console.log(`  Score < 70%: ${lowScoreActivities} activities (no coins)`);
        console.log(`  Score >= 70%: ${highScoreActivities} activities (earn coins)`);
        
        if (highScoreActivities === 0 && totalPracticeActivities > 0) {
            console.log('\n⚠️  All practice activities have scores below 70%!');
            console.log('   This means no coins will be available.');
        }
        
        // Check for XP = 0 issues
        const zeroXPActivities = await Progress.count({
            where: {
                activityType: 'practice',
                xpEarned: 0
            }
        });
        
        if (zeroXPActivities > 0) {
            console.log(`\n⚠️  Found ${zeroXPActivities} practice activities with 0 XP!`);
            console.log('   This could indicate XP calculation issues.');
        }
        
    } catch (error) {
        console.error('Error running debug script:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the debug script
debugXPFlow();