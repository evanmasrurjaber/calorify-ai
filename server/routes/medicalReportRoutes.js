const express = require('express');
const router = express.Router();
const { uploadReport, getReports, deleteReport } = require('../controllers/medicalReportController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// @route  POST /api/medical-reports/upload (multipart: 'report_pdf')
router.post('/upload', protect, upload.single('report_pdf'), uploadReport);

// @route  GET /api/medical-reports (fetch user's reports)
router.get('/', protect, getReports);

// @route  DELETE /api/medical-reports/:id (delete a specific report)
router.delete('/:id', protect, deleteReport);

module.exports = router;
