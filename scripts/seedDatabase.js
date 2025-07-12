require('dotenv').config();
const { User, Lesson, Progress, sequelize } = require('../src/models');
const { connectDB } = require('../src/config/database');

// Sample lessons data - Only the 3 available templates
const sampleLessons = [
    {
        title: "🍩 Donut Algebra - Combining Like Terms",
        topic: "algebra",
        difficulty: "beginner",
        description: "Learn to combine like terms using delicious donut metaphors!",
        templatePath: "donut_algebra_tutorial_v2.html",
        xpReward: 15,
        estimatedTime: 20,
        tags: ["like-terms", "interactive", "visual-learning"],
        order: 1
    },
    {
        title: "⚖️ Algebra Balance - Solving Equations",
        topic: "algebra",
        difficulty: "intermediate",
        description: "Master solving equations with an interactive balance scale.",
        templatePath: "algebra-balance-final option 4.html",
        xpReward: 20,
        estimatedTime: 25,
        tags: ["equations", "balance", "interactive"],
        order: 2
    },
    {
        title: "⚖️ Enhanced Algebra Balance - Advanced Equations",
        topic: "algebra",
        difficulty: "advanced",
        description: "Advanced equation solving with complex algebraic expressions.",
        templatePath: "enhanced_algebra_balance_v2.html",
        xpReward: 25,
        estimatedTime: 30,
        tags: ["equations", "advanced", "interactive"],
        order: 3
    }
];

// Seed database
async function seedDatabase() {
    try {
        // Connect to database
        await connectDB();
        
        console.log('🌱 Starting database seed...');
        
        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.destroy({ where: {} });
        await Lesson.destroy({ where: {} });
        await Progress.destroy({ where: {} });
        
        // Create sample lessons
        console.log('📚 Creating lessons...');
        const lessons = await Lesson.bulkCreate(sampleLessons);
        console.log(`✅ Created ${lessons.length} lessons`);
        
        // Set prerequisites
        console.log('🔗 Setting prerequisites...');
        
        // Algebra prerequisites
        const algebraBasics = await Lesson.findOne({ where: { title: "Introduction to Variables" } });
        const donutAlgebra = await Lesson.findOne({ where: { title: "🍩 Donut Algebra - Combining Like Terms" } });
        const algebraBalance = await Lesson.findOne({ where: { title: "⚖️ Algebra Balance - Solving Equations" } });
        const advancedAlgebra = await Lesson.findOne({ where: { title: "Advanced Equation Solving" } });
        
        if (donutAlgebra && algebraBasics) {
            donutAlgebra.prerequisites = [algebraBasics.id];
            await donutAlgebra.save();
        }
        
        if (algebraBalance && donutAlgebra) {
            algebraBalance.prerequisites = [donutAlgebra.id];
            await algebraBalance.save();
        }
        
        if (advancedAlgebra && algebraBalance) {
            advancedAlgebra.prerequisites = [algebraBalance.id];
            await advancedAlgebra.save();
        }
        
        // Multiplication prerequisites
        const multiBasics = await Lesson.findOne({ where: { title: "Multiplication Basics" } });
        const times1to5 = await Lesson.findOne({ where: { title: "Times Tables 1-5" } });
        const times6to10 = await Lesson.findOne({ where: { title: "Times Tables 6-10" } });
        
        if (times1to5 && multiBasics) {
            times1to5.prerequisites = [multiBasics.id];
            await times1to5.save();
        }
        
        if (times6to10 && times1to5) {
            times6to10.prerequisites = [times1to5.id];
            await times6to10.save();
        }
        
        // Fractions prerequisites
        const fracBasics = await Lesson.findOne({ where: { title: "Introduction to Fractions" } });
        const fracAdd = await Lesson.findOne({ where: { title: "Adding Fractions" } });
        const fracMulti = await Lesson.findOne({ where: { title: "Multiplying Fractions" } });
        
        if (fracAdd && fracBasics) {
            fracAdd.prerequisites = [fracBasics.id];
            await fracAdd.save();
        }
        
        if (fracMulti && fracBasics) {
            fracMulti.prerequisites = [fracBasics.id];
            await fracMulti.save();
        }
        
        console.log('✅ Prerequisites set');
        
        // Create sample user
        console.log('👤 Creating sample user...');
        const sampleUser = await User.create({
            username: 'demo_student',
            email: 'demo@zeyadmath.com',
            password: 'demo123'
        });
        console.log('✅ Sample user created:');
        console.log('   Email: demo@zeyadmath.com');
        console.log('   Password: demo123');
        
        console.log('\n✨ Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        // Close database connection
        await sequelize.close();
        process.exit(0);
    }
}

// Run seed
seedDatabase();