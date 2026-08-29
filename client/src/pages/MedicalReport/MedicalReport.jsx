import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Activity,
  Droplets,
  Heart,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck,
  FileImage,
  Info,
  X,
  Plus,
  ArrowRight,
} from 'lucide-react';
import BgShader from '../../components/BgShader';
import {
  uploadMedicalReport,
  getMedicalReports,
  deleteMedicalReport,
} from '../../services/medicalReportService';

// ─── HbA1c Badge helper ───────────────────────────────────────────────────────
function getHbA1cBadge(val) {
  if (val == null) return null;
  if (val < 5.7) {
    return { label: 'Normal (<5.7%)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (val <= 6.4) {
    return { label: 'Prediabetic (5.7–6.4%)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'Diabetic (>6.5%)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
}

// ─── Format file size helper ──────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function MedicalReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedMarkers, setExpandedMarkers] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fileInputRef = useRef(null);

  // ─── Fetch existing reports ─────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await getMedicalReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ─── File selection & drag-and-drop ─────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    setError('');
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid PDF, JPEG, or PNG file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // ─── Upload & AI Parse ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError('');
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('report_pdf', selectedFile);

      const { data } = await uploadMedicalReport(formData);

      if (data.report) {
        setReports((prev) => [data.report, ...prev]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSuccessMsg('Medical report parsed & saved! Future diet plans will automatically adapt.');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to parse report. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete Report ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await deleteMedicalReport(id);
      setReports((prev) => prev.filter((r) => r._id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError('Failed to delete report.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleMarkers = (id) => {
    setExpandedMarkers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative min-h-screen">
      <BgShader />

      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/80 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#006c49] uppercase tracking-widest bg-[#10B981]/10 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                <FileCheck size={14} />
                Medical Records & AI Extraction
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Smart Medical Report Parser
            </h1>
            <p className="text-sm text-[#565e74] font-medium mt-1">
              Upload physical lab tests, CBC, lipid profiles, or diagnostic PDFs. AI extracts clinical markers to tailor your meal plans.
            </p>
          </div>

          <Link
            to="/diet-plan"
            className="self-start md:self-auto inline-flex items-center gap-2 text-xs font-bold text-[#006c49] hover:text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 px-4 py-2.5 rounded-xl border border-[#10B981]/20 transition-all active:scale-95"
          >
            <Sparkles size={14} />
            Generate Diet Plan →
          </Link>
        </div>

        {/* ── Info Banner: How It Works ── */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200/70 rounded-2xl backdrop-blur-sm flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#006c49] flex items-center justify-center shrink-0 mt-0.5">
            <Info size={18} />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-[#0F172A]">
              Continuous Nutrition Personalization
            </p>
            <p className="text-[#565e74] leading-relaxed">
              When you generate a Diet Plan, our system combines your verified HbA1c, diagnoses (e.g. Diabetes, Hypertension), and allergies to automatically adjust macro ratios, GI index, and ingredients.
            </p>
          </div>
        </div>

        {/* ── Success Alert ── */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 text-sm font-medium animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-[#10B981] shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Error Alert ── */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-sm font-medium animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Upload Area Card ── */}
        <div className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
              <Upload size={18} className="text-[#10B981]" />
              Upload New Report
            </h2>
            <span className="text-[11px] font-semibold text-[#565e74]">
              PDF, JPEG, or PNG up to 10 MB
            </span>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
              dragActive
                ? 'border-[#10B981] bg-[#10B981]/5 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50/40'
                : 'border-[#cbd5e1] hover:border-[#10B981]/60 hover:bg-[#f8f9ff]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#006c49] flex items-center justify-center mx-auto shadow-xs">
                  {selectedFile.type === 'application/pdf' ? <FileText size={28} /> : <FileImage size={28} />}
                </div>
                <div>
                  <p className="font-bold text-[#0F172A] text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-[#565e74] mt-0.5">{formatBytes(selectedFile.size)}</p>
                </div>
                <span className="inline-block text-xs font-semibold text-[#006c49] bg-emerald-100/70 px-3 py-1 rounded-full">
                  Click to replace file
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mx-auto">
                  <Upload size={26} />
                </div>
                <div>
                  <p className="font-bold text-[#0F172A] text-sm">
                    Drag & drop your lab report here, or <span className="text-[#10B981] underline">browse</span>
                  </p>
                  <p className="text-xs text-[#565e74] mt-1">
                    Supports blood tests, diagnostic summaries, prescriptions, and lab printouts
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          {selectedFile && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={uploading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#e1e2e8] text-xs font-bold text-[#565e74] hover:bg-[#f8f9ff] transition-all disabled:opacity-50"
              >
                Clear Selection
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="w-full sm:w-auto bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md shadow-[#10B981]/20 flex items-center justify-center gap-2 text-sm disabled:opacity-60 active:scale-95"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Analyzing with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Extract & Save Medical Report</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Uploaded Reports Section ── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
              <FileCheck size={20} className="text-[#10B981]" />
              Saved Medical Reports ({reports.length})
            </h2>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/90 border border-[#e1e2e8] rounded-3xl p-6 h-48" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && reports.length === 0 && (
            <div className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-10 sm:p-12 text-center shadow-xs space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mx-auto">
                <FileText size={32} />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                  No Medical Reports Uploaded Yet
                </h3>
                <p className="text-sm text-[#565e74]">
                  Upload a PDF or scan of your blood test or prescription above to automatically integrate your health requirements into your diet plans.
                </p>
              </div>
            </div>
          )}

          {/* Report Cards */}
          {!loading && reports.length > 0 && (
            <div className="space-y-6">
              {reports.map((report, idx) => {
                const pd = report.parsedData || {};
                const hba1cBadge = getHbA1cBadge(pd.hba1c);
                const markers = pd.bloodMarkers || {};
                const isMarkersOpen = !!expandedMarkers[report._id];
                const dateStr = new Date(report.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                // Key blood markers list
                const coreMarkersList = [
                  { label: 'Fasting Glucose', value: markers.fastingGlucose, unit: 'mg/dL' },
                  { label: 'Post-Meal Glucose', value: markers.postMealGlucose, unit: 'mg/dL' },
                  { label: 'Total Cholesterol', value: markers.totalCholesterol, unit: 'mg/dL' },
                  { label: 'LDL Cholesterol', value: markers.ldl, unit: 'mg/dL' },
                  { label: 'HDL Cholesterol', value: markers.hdl, unit: 'mg/dL' },
                  { label: 'Triglycerides', value: markers.triglycerides, unit: 'mg/dL' },
                  {
                    label: 'Blood Pressure',
                    value:
                      markers.systolicBP && markers.diastolicBP
                        ? `${markers.systolicBP}/${markers.diastolicBP}`
                        : markers.systolicBP || markers.diastolicBP || null,
                    unit: 'mmHg',
                  },
                  { label: 'Hemoglobin', value: markers.hemoglobin, unit: 'g/dL' },
                  { label: 'Creatinine', value: markers.creatinine, unit: 'mg/dL' },
                  { label: 'SGPT / ALT', value: markers.sgptAlt, unit: 'U/L' },
                  { label: 'Uric Acid', value: markers.uricAcid, unit: 'mg/dL' },
                ].filter((m) => m.value != null);

                const otherMarkers = Array.isArray(markers.otherMarkers) ? markers.otherMarkers : [];

                return (
                  <div
                    key={report._id}
                    className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xs border border-[#e1e2e8] p-6 sm:p-7 space-y-6 transition-all hover:shadow-md animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e1e2e8]/70">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#10B981]/10 text-[#006c49] flex items-center justify-center shrink-0">
                          {report.fileType === 'image' ? <FileImage size={22} /> : <FileText size={22} />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-[#0F172A] text-base leading-tight">
                            {report.fileName || 'Diagnostic Report'}
                          </h3>
                          <div className="flex items-center gap-2.5 text-xs text-[#565e74] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {dateStr}
                            </span>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-bold tracking-wider text-[#006c49] bg-[#10B981]/10 px-2 py-0.2 rounded-md">
                              {report.fileType === 'image' ? 'Scan' : 'PDF'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete button / confirm */}
                      {confirmDeleteId === report._id ? (
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleDelete(report._id)}
                            disabled={deletingId === report._id}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all disabled:opacity-50"
                          >
                            {deletingId === report._id ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 rounded-xl border border-[#e1e2e8] text-xs font-bold text-[#565e74] hover:bg-[#f8f9ff]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(report._id)}
                          className="self-end sm:self-auto p-2 text-[#565e74] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Report"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>

                    {/* AI Clinical Summary */}
                    {pd.summary && (
                      <div className="p-4 bg-gradient-to-r from-[#f8f9ff] to-emerald-50/40 rounded-2xl border border-emerald-100/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#006c49]">
                          <Sparkles size={14} />
                          <span>AI Clinical Summary</span>
                        </div>
                        <p className="text-xs text-[#0F172A] leading-relaxed font-medium">
                          {pd.summary}
                        </p>
                      </div>
                    )}

                    {/* Highlights Grid (Diagnoses, HbA1c, Allergies) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Diagnoses */}
                      <div className="bg-[#f8f9ff] border border-[#e1e2e8]/70 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#565e74]">
                          <Activity size={15} className="text-[#10B981]" />
                          <span>Diagnoses & Conditions</span>
                        </div>
                        {pd.diagnoses?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {pd.diagnoses.map((d, i) => (
                              <span
                                key={i}
                                className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-xl"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#565e74] italic">None identified</p>
                        )}
                      </div>

                      {/* HbA1c */}
                      <div className="bg-[#f8f9ff] border border-[#e1e2e8]/70 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#565e74]">
                          <Droplets size={15} className="text-[#005ac2]" />
                          <span>HbA1c Blood Level</span>
                        </div>
                        {pd.hba1c != null ? (
                          <div className="space-y-1">
                            <span className="text-xl font-black text-[#0F172A]">
                              {pd.hba1c}%
                            </span>
                            {hba1cBadge && (
                              <div>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${hba1cBadge.color}`}>
                                  {hba1cBadge.label}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#565e74] italic">Not tested in this report</p>
                        )}
                      </div>

                      {/* Allergies */}
                      <div className="bg-[#f8f9ff] border border-[#e1e2e8]/70 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#565e74]">
                          <ShieldAlert size={15} className="text-rose-500" />
                          <span>Medical Allergies</span>
                        </div>
                        {pd.allergies?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {pd.allergies.map((a, i) => (
                              <span
                                key={i}
                                className="text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200/80 px-2.5 py-1 rounded-xl"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#565e74] italic">None reported</p>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Blood Markers & Lab Tests */}
                    {(coreMarkersList.length > 0 || otherMarkers.length > 0) && (
                      <div className="border-t border-[#e1e2e8]/70 pt-4">
                        <button
                          onClick={() => toggleMarkers(report._id)}
                          className="w-full flex items-center justify-between text-xs font-bold text-[#006c49] hover:text-[#10B981] p-2 hover:bg-[#f8f9ff] rounded-xl transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Activity size={14} />
                            {isMarkersOpen ? 'Hide Detailed Lab Markers' : `View All Lab Markers (${coreMarkersList.length + otherMarkers.length})`}
                          </span>
                          {isMarkersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {isMarkersOpen && (
                          <div className="mt-3 space-y-4 animate-fade-in-up">
                            {/* Core Markers Grid */}
                            {coreMarkersList.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {coreMarkersList.map((m, i) => (
                                  <div
                                    key={i}
                                    className="bg-white border border-[#e1e2e8] rounded-xl p-3 space-y-1 shadow-xs"
                                  >
                                    <p className="text-[11px] font-semibold text-[#565e74] leading-tight">
                                      {m.label}
                                    </p>
                                    <p className="text-sm font-black text-[#0F172A]">
                                      {m.value}{' '}
                                      <span className="text-[10px] font-medium text-[#565e74]">
                                        {m.unit}
                                      </span>
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Additional Markers Table */}
                            {otherMarkers.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <p className="text-xs font-bold text-[#0F172A]">Other Detected Tests</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {otherMarkers.map((om, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between p-2.5 bg-white border border-[#e1e2e8] rounded-xl text-xs"
                                    >
                                      <span className="font-semibold text-[#0F172A]">{om.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#565e74]">
                                          {om.value} {om.unit || ''}
                                        </span>
                                        {om.status && (
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                              om.status.toLowerCase().includes('high') ||
                                              om.status.toLowerCase().includes('abnormal')
                                                ? 'bg-rose-100 text-rose-800'
                                                : om.status.toLowerCase().includes('low')
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                          >
                                            {om.status}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
