const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: 'Email already in use' });

    const user = await User.create({ username, email, password });
    res.status(201).json({ 
      _id: user._id, 
      username: user.username, 
      token: generateToken(user._id) 
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ msg: 'Invalid credentials' });

    res.json({ 
      _id: user._id, 
      username: user.username, 
      token: generateToken(user._id),
      profileCompleted: user.profileCompleted || false,
      location: user.location || null,
      age: user.age || null,
      gender: user.gender || null,
      bio: user.bio || null
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Complete Profile
exports.completeProfile = async (req, res) => {
  console.log('Complete profile endpoint hit');
  console.log('Request body:', req.body);
  console.log('User from token:', req.user ? req.user._id : 'No user');
  
  const { age, gender, location, bio } = req.body;
  
  try {
    // Validate required fields
    if (!age || !gender || !location || !bio) {
      console.log('Missing required fields');
      return res.status(400).json({ msg: 'All fields are required' });
    }

    // Validate age
    if (age < 18 || age > 100) {
      console.log('Invalid age:', age);
      return res.status(400).json({ msg: 'Age must be between 18 and 100' });
    }

    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
      console.log('Invalid gender:', gender);
      return res.status(400).json({ msg: 'Invalid gender selection' });
    }

    console.log('Updating user profile for ID:', req.user.id);

    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        age,
        gender,
        location,
        bio,
        profileCompleted: true
      },
      { new: true }
    ).select('-password');

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log('Profile updated successfully:', user);

    res.json({
      msg: 'Profile completed successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        gender: user.gender,
        location: user.location,
        bio: user.bio,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (err) {
    console.error('Error completing profile:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update User Profile (separate from complete profile)
exports.updateProfile = async (req, res) => {
  console.log('Update profile endpoint hit');
  console.log('Request body:', req.body);
  console.log('User from token:', req.user ? req.user._id : 'No user');
  
  const { age, gender, location, bio } = req.body;
  
  try {
    // Validate required fields
    if (!age || !gender || !location || !bio) {
      console.log('Missing required fields');
      return res.status(400).json({ msg: 'All fields are required' });
    }

    // Validate age
    if (age < 18 || age > 100) {
      console.log('Invalid age:', age);
      return res.status(400).json({ msg: 'Age must be between 18 and 100' });
    }

    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
      console.log('Invalid gender:', gender);
      return res.status(400).json({ msg: 'Invalid gender selection' });
    }

    console.log('Updating user profile for ID:', req.user.id);

    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        age,
        gender,
        location,
        bio,
        profileCompleted: true
      },
      { new: true }
    ).select('-password');

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log('Profile updated successfully:', user);

    res.json({
      msg: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        gender: user.gender,
        location: user.location,
        bio: user.bio,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        gender: user.gender,
        location: user.location,
        bio: user.bio,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get All Users (for matching)
exports.getAllUsers = async (req, res) => {
  try {
    // Get all users except the current user, only those with completed profiles
    const users = await User.find({
      _id: { $ne: req.user.id },
      profileCompleted: true
    }).select('-password -email');
    
    res.json({
      users: users.map(user => ({
        _id: user._id,
        username: user.username,
        age: user.age,
        gender: user.gender,
        location: user.location,
        bio: user.bio,
        isActive: Math.random() > 0.5 // Random active status for demo
      }))
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
