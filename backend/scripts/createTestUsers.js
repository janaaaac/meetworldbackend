const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/meetworld', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testUsers = [
  {
    username: 'alice_usa',
    email: 'alice@test.com',
    password: 'password123',
    gender: 'Female',
    location: 'United States',
    age: 24,
    bio: 'Love traveling and meeting new people',
    profileCompleted: true
  },
  {
    username: 'bob_usa',
    email: 'bob@test.com',
    password: 'password123',
    gender: 'Male',
    location: 'United States',
    age: 28,
    bio: 'Tech enthusiast and coffee lover',
    profileCompleted: true
  },
  {
    username: 'charlie_uk',
    email: 'charlie@test.com',
    password: 'password123',
    gender: 'Male',
    location: 'United Kingdom',
    age: 26,
    bio: 'Musician and artist from London',
    profileCompleted: true
  },
  {
    username: 'diana_canada',
    email: 'diana@test.com',
    password: 'password123',
    gender: 'Female',
    location: 'Canada',
    age: 22,
    bio: 'Student and outdoor enthusiast',
    profileCompleted: true
  },
  {
    username: 'emma_usa',
    email: 'emma@test.com',
    password: 'password123',
    gender: 'Female',
    location: 'United States',
    age: 25,
    bio: 'Photographer and nature lover',
    profileCompleted: true
  },
  {
    username: 'frank_germany',
    email: 'frank@test.com',
    password: 'password123',
    gender: 'Male',
    location: 'Germany',
    age: 30,
    bio: 'Engineer and sports fan',
    profileCompleted: true
  }
];

async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    // Clear existing test users
    await User.deleteMany({ email: { $in: testUsers.map(u => u.email) } });
    
    // Create new test users
    for (const userData of testUsers) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      
      await user.save();
      console.log(`Created user: ${user.username} (${user.gender}, ${user.location})`);
    }
    
    console.log('All test users created successfully!');
    console.log('\nTest Users:');
    console.log('- alice@test.com (Female, United States)');
    console.log('- bob@test.com (Male, United States)');
    console.log('- charlie@test.com (Male, United Kingdom)');
    console.log('- diana@test.com (Female, Canada)');
    console.log('- emma@test.com (Female, United States)');
    console.log('- frank@test.com (Male, Germany)');
    console.log('\nPassword for all: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();
