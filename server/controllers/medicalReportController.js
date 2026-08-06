// TODO: Implement medical report PDF parsing via Gemini API
// Member responsibility: Evan Masrur Jaber

const MedicalReport = require('../models/MedicalReport');

// @route POST /api/medical-reports/upload
const uploadReport = async (req, res) => {
  try {
    // TODO: Receive PDF buffer from multer, send to Gemini API,
    //       parse structured JSON (diagnoses, HbA1c, allergies), save to DB
    res.status(501).json({ message: 'uploadReport not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/medical-reports
const getReports = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadReport, getReports };
