const express = require('express');
const router = express.Router();
const { register, login, completeProfile, updateProfile, getUserProfile, getAllUsers } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.put('/complete-profile', protect, completeProfile);
router.put('/update-profile', protect, updateProfile);
router.get('/profile', protect, getUserProfile);
router.get('/users', protect, getAllUsers);

module.exports = router;
