require('dotenv').config();
const mongoose = require('mongoose');
const { User, Lesson, Progress } = require('../src/models');
const connectDB = require('../src/config/database');

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
        await User.deleteMany({});
        await Lesson.deleteMany({});
        await Progress.deleteMany({});
        
        // Create sample lessons
        console.log('📚 Creating lessons...');
        const lessons = await Lesson.insertMany(sampleLessons);
        console.log(`✅ Created ${lessons.length} lessons`);
        
        // Set prerequisites
        console.log('🔗 Setting prerequisites...');
        
        // Algebra prerequisites
        const algebraBasics = await Lesson.findOne({ title: "Introduction to Variables" });
        const donutAlgebra = await Lesson.findOne({ title: "Donut Algebra - Combining Like Terms" });
        const algebraBalance = await Lesson.findOne({ title: "Algebra Balance - Solving Equations" });
        const advancedAlgebra = await Lesson.findOne({ title: "Advanced Equation Solving" });
        
        if (donutAlgebra && algebraBasics) {
            donutAlgebra.prerequisites = [algebraBasics._id];
            await donutAlgebra.save();
        }
        
        if (algebraBalance && donutAlgebra) {
            algebraBalance.prerequisites = [donutAlgebra._id];
            await algebraBalance.save();
        }
        
        if (advancedAlgebra && algebraBalance) {
            advancedAlgebra.prerequisites = [algebraBalance._id];
            await advancedAlgebra.save();
        }
        
        // Multiplication prerequisites
        const multiBasics = await Lesson.findOne({ title: "Multiplication Basics" });
        const times1to5 = await Lesson.findOne({ title: "Times Tables 1-5" });
        const times6to10 = await Lesson.findOne({ title: "Times Tables 6-10" });
        
        if (times1to5 && multiBasics) {
            times1to5.prerequisites = [multiBasics._id];
            await times1to5.save();
        }
        
        if (times6to10 && times1to5) {
            times6to10.prerequisites = [times1to5._id];
            await times6to10.save();
        }
        
        // Fractions prerequisites
        const fracBasics = await Lesson.findOne({ title: "Introduction to Fractions" });
        const fracAdd = await Lesson.findOne({ title: "Adding Fractions" });
        const fracMulti = await Lesson.findOne({ title: "Multiplying Fractions" });
        
        if (fracAdd && fracBasics) {
            fracAdd.prerequisites = [fracBasics._id];
            await fracAdd.save();
        }
        
        if (fracMulti && fracBasics) {
            fracMulti.prerequisites = [fracBasics._id];
            await fracMulti.save();
        }
        
        console.log('✅ Prerequisites set');
        
        // Create sample user
        console.log('👤 Creating sample user...');
        const sampleUser = new User({
            username: 'demo_student',
            email: 'demo@zeyadmath.com',
            password: 'demo123'
        });
        
        await sampleUser.save();
        console.log('✅ Sample user created:');
        console.log('   Email: demo@zeyadmath.com');
        console.log('   Password: demo123');
        
        console.log('\n✨ Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Run seed
seedDatabase();