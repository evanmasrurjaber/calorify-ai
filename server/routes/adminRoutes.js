const express = require('express');
const router = express.Router();
const { getPlatformStats, getAllUsers, deleteUser } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.get('/stats', protect, adminOnly, getPlatformStats);
router.get('/users', protect, adminOnly, getAllUsers);
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;
