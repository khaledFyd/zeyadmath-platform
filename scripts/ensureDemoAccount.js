require('dotenv').config();
const { User, sequelize } = require('../src/models');
const { connectDB } = require('../src/config/database');

async function ensureDemoAccount() {
    try {
        await connectDB();
        console.log('🔍 Checking for demo account...');
        
        // Check if demo account exists
        let demoUser = await User.findOne({ 
            where: { email: 'demo@zeyadmath.com' } 
        });
        
        if (demoUser) {
            console.log('✅ Demo account already exists');
            // Update password in case it was changed
            demoUser.password = 'demo123';
            await demoUser.save();
            console.log('🔄 Demo account password reset to: demo123');
        } else {
            // Create demo account
            console.log('👤 Creating demo account...');
            demoUser = await User.create({
                username: 'demo_student',
                email: 'demo@zeyadmath.com',
                password: 'demo123',
                xp: 100,
                level: 2
            });
            console.log('✅ Demo account created:');
            console.log('   Email: demo@zeyadmath.com');
            console.log('   Password: demo123');
        }
        
        console.log('\n✨ Demo account ready!');
        
    } catch (error) {
        console.error('❌ Error ensuring demo account:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Run the script
ensureDemoAccount();