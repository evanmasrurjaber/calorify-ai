const MedicalReport = require('../models/MedicalReport');
const User = require('../models/User');
const { generateWithFile, parseJSONResponse } = require('../services/geminiService');
const { optimizeImageForGemini } = require('../utils/imageOptimizer');

const MEDICAL_EXTRACTION_PROMPT = `You are an expert clinical pathologist and medical document AI specialized in laboratory reports and diagnostic records (especially from Bangladeshi / South Asian diagnostic centers like Square, Popular, Labaid, Ibn Sina, etc.).

Analyze the provided medical document (PDF or image). Extract ALL clinical test results, diagnoses, and medical data.

Return ONLY a valid JSON object matching this exact structure, with no markdown code blocks:
{
  "diagnoses": ["Type 2 Diabetes", "Hypertension"],
  "hba1c": 7.2,
  "allergies": ["Penicillin", "Peanuts", "Dust"],
  "bloodMarkers": {
    "fastingGlucose": 126,
    "postMealGlucose": null,
    "totalCholesterol": 215,
    "ldl": 140,
    "hdl": 42,
    "triglycerides": 185,
    "systolicBP": 135,
    "diastolicBP": 85,
    "hemoglobin": 12.4,
    "creatinine": 1.1,
    "sgptAlt": 38,
    "uricAcid": 6.2,
    "otherMarkers": [
      { "name": "TSH", "value": "2.5", "unit": "uIU/mL", "status": "Normal" },
      { "name": "Vitamin D", "value": "18.2", "unit": "ng/mL", "status": "Low" }
    ]
  },
  "summary": "2-3 sentences plain-language clinical summary of the patient's key findings and general nutritional/dietary considerations."
}

Extraction guidelines:
1. diagnoses: List confirmed or suspected medical conditions (e.g. Diabetes, Fatty Liver, Hypertension, Chronic Kidney Disease, Hyperlipidemia, Hypothyroidism, Anemia). If none mentioned, return empty array [].
2. hba1c: Numeric value (e.g. 6.8). If reported as percentage like "6.8%", extract only the number 6.8. If not in the report, return null.
3. allergies: Any noted drug, food, or environmental allergies. If none, return empty array [].
4. bloodMarkers: Extract numeric values where found. Set null for any marker not present in the document.
   - For otherMarkers: include any additional lab tests present with name, value, unit, and status ("Normal", "High", "Low", "Abnormal").
5. summary: A helpful, empathetic summary explaining the main lab findings in simple terms suitable for a nutrition app.
6. If the document is clearly NOT a medical report, return empty arrays for diagnoses/allergies, null for all markers, and summary set to "The uploaded document does not appear to be a recognized medical or lab report."

Return ONLY valid JSON.`;

// ─── POST /api/medical-reports/upload ─────────────────────────────────────────
// Upload a medical report PDF or image scan → Gemini parses it → saves to DB
const uploadReport = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isPro) {
      return res.status(403).json({ message: 'Premium subscription required to upload medical reports.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload a PDF or image.' });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    const fileType = mimetype === 'application/pdf' ? 'pdf' : 'image';

    // Downscale and optimize image before sending to Gemini (PDFs remain untouched)
    const { buffer: processedBuffer, mimeType: processedMimeType } = await optimizeImageForGemini(
      buffer,
      mimetype,
      { maxDimension: 1600, quality: 85 }
    );

    // Call Gemini multimodal with optimized buffer
    const rawResponse = await generateWithFile(
      MEDICAL_EXTRACTION_PROMPT,
      processedBuffer,
      processedMimeType
    );

    const parsed = parseJSONResponse(rawResponse);

    // Clean & normalize HbA1c value
    let hba1cValue = null;
    if (parsed.hba1c != null) {
      const num = parseFloat(String(parsed.hba1c).replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) hba1cValue = num;
    }

    // Clean diagnoses and allergies arrays
    const diagnoses = Array.isArray(parsed.diagnoses)
      ? parsed.diagnoses.filter((d) => typeof d === 'string' && d.trim().length > 0)
      : [];

    const allergies = Array.isArray(parsed.allergies)
      ? parsed.allergies.filter((a) => typeof a === 'string' && a.trim().length > 0)
      : [];

    const bloodMarkers = parsed.bloodMarkers || {};
    const summary = parsed.summary || 'Medical report processed successfully.';

    const report = await MedicalReport.create({
      user: req.user.id,
      fileName: originalname || 'medical_report',
      fileType,
      fileSize: size,
      parsedData: {
        diagnoses,
        hba1c: hba1cValue,
        allergies,
        bloodMarkers,
        summary,
        rawExtract: parsed,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Medical report successfully parsed and saved.',
      report,
    });
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to parse medical report';
    console.error('Medical report upload error:', errorMsg);
    res.status(500).json({ message: errorMsg });
  }
};

// ─── GET /api/medical-reports ─────────────────────────────────────────────────
// Fetch all uploaded reports for the current user, newest first
const getReports = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/medical-reports/:id ──────────────────────────────────────────
// Delete a specific report owned by the user
const deleteReport = async (req, res) => {
  try {
    const report = await MedicalReport.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!report) {
      return res.status(404).json({ message: 'Medical report not found or unauthorized' });
    }

    res.json({ success: true, message: 'Medical report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadReport, getReports, deleteReport };
