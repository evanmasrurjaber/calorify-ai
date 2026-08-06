const mongoose = require('mongoose');

const medicalReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String },
    fileUrl: { type: String },
    parsedData: {
      diagnoses: [{ type: String }],
      hba1c: { type: Number },
      allergies: [{ type: String }],
      rawExtract: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalReport', medicalReportSchema);
