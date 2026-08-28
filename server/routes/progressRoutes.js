const express = require('express');
const router = express.Router();
const { logProgress, getProgress } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, logProgress);
router.get('/', protect, getProgress);

module.exports = router;
