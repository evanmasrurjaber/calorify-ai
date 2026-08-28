const express = require('express');
const router = express.Router();
const { uploadReport, getReports } = require('../controllers/medicalReportController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('report_pdf'), uploadReport);
router.get('/', protect, getReports);

module.exports = router;
