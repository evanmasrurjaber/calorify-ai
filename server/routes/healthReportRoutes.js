const express = require('express');
const router = express.Router();
const {
  getMonthlyReport,
  downloadMonthlyReportPDF,
  getReportHistory,
} = require('../controllers/healthReportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/monthly', protect, getMonthlyReport);
router.get('/monthly/pdf', protect, downloadMonthlyReportPDF);
router.get('/history', protect, getReportHistory);

module.exports = router;
