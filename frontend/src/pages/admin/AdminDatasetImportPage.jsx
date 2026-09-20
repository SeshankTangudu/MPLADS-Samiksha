import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  Server, 
  Database, 
  Layers, 
  ShieldCheck, 
  Table
} from 'lucide-react';
import { AdminAPI } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

export const AdminDatasetImportPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [term, setTerm] = useState(18);
  const [sourceName, setSourceName] = useState('18th Lok Sabha Recommended Works');
  const [datasetVersion, setDatasetVersion] = useState('1.0.0');

  const [step, setStep] = useState(1); // 1: Upload, 2: Validating, 3: Validation Report & Preview, 4: Ingesting, 5: Success
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  const sample18thTemplate = `source_record_id,mp_name,house,lok_sabha_term,state,district,constituency,category,description,sanction_date,completion_date,sanctioned_cost,expenditure,status,pending_reason
MPLADS-18LS-001,Narendra Modi,Lok Sabha,18,Uttar Pradesh,Varanasi,Varanasi,Drinking Water,Solar Powered Community RO Filtration Unit,2024-07-15,,0.45,0.00,In Progress,
MPLADS-18LS-002,Tejasvi Surya,Lok Sabha,18,Karnataka,Bengaluru Urban,Bangalore South,Education,Digital Smart Classrooms in 10 Government High Schools,2024-08-01,,1.20,0.40,In Progress,
MPLADS-18LS-003,Shashi Tharoor,Lok Sabha,18,Kerala,Thiruvananthapuram,Thiruvananthapuram,Health & Sanitation,Oxygen Generation Plant at Taluk Hospital,2024-06-20,2024-09-10,0.85,0.82,Completed,
MPLADS-18LS-004,Gopal Shetty,Lok Sabha,18,Maharashtra,Mumbai Suburban,Mumbai North,Infrastructure & Public Amenities,Modern Foot Over Bridge with Wheelchair Ramp,2024-07-05,,2.10,0.00,In Progress,Technical design vetting underway
MPLADS-18LS-005,Sudip Bandyopadhyay,Lok Sabha,18,West Bengal,Kolkata,Kolkata Uttar,Sanitation,Automated Solid Waste Compactor Station,2024-08-12,,0.75,0.20,In Progress,`;

  const handleDownloadSample = () => {
    const blob = new Blob([sample18thTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mplads_18th_lok_sabha_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      setError('Please choose a valid CSV or JSON dataset file to upload.');
      return;
    }

    try {
      setStep(2);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('term', term);
      formData.append('source_name', sourceName);

      const res = await AdminAPI.validateDataset(formData);
      setValidationResult(res);
      setStep(3);
    } catch (err) {
      console.error('Validation failed:', err);
      setError(err.message || 'Dataset validation service encountered an unexpected error.');
      setStep(1);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) return;

    try {
      setStep(4);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('term', term);
      formData.append('source_name', sourceName);
      formData.append('dataset_version', datasetVersion);

      const res = await AdminAPI.importDataset(formData);
      setImportResult(res);
      setStep(5);
    } catch (err) {
      console.error('Ingestion failed:', err);
      setError(err.message || 'Dataset ingestion pipeline failed.');
      setStep(3);
    }
  };

  return (
    <div className="py-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-700 border border-purple-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Platform Data Pipeline</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dataset Ingestion & Schema Validation
        </h1>
        <p className="text-xs text-slate-600">
          Upload and validate official parliamentary fund datasets for 15th, 16th, 17th, and 18th Lok Sabha sessions.
        </p>
      </div>

      {/* Step Wizard Progress Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
          step === 1 ? 'bg-purple-50 border-purple-300 text-purple-900' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
          <span>Upload Dataset</span>
        </div>
        <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
          step === 3 ? 'bg-purple-50 border-purple-300 text-purple-900' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
          <span>Validation & Preview</span>
        </div>
        <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
          step === 5 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
          <span>Ingestion Complete</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload Form */}
      {step === 1 && (
        <div className="gov-card p-6 bg-white space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload Dataset File</h2>
              <p className="text-xs text-slate-500">Supports comma-separated (.csv) and JSON (.json) files up to 50 MB.</p>
            </div>
            <button
              onClick={handleDownloadSample}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download 18th LS Sample CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Parliamentary Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={18}>18th Lok Sabha (2024–Present)</option>
                <option value={17}>17th Lok Sabha (2019–2024)</option>
                <option value={16}>16th Lok Sabha (2014–2019)</option>
                <option value={15}>15th Lok Sabha (2009–2014)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Source Repository Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. eSAKSHI Official Export"
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dataset Version Tag</label>
              <input
                type="text"
                value={datasetVersion}
                onChange={(e) => setDatasetVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Drag & Drop / File Input Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              id="dataset-file-input"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="dataset-file-input" className="cursor-pointer space-y-3 block">
              <UploadCloud className="w-10 h-10 text-purple-600 mx-auto" />
              <div>
                <span className="text-xs font-bold text-purple-700 hover:underline">Click to browse file</span>
                <span className="text-xs text-slate-500"> or drag and drop dataset file here</span>
              </div>
              {file ? (
                <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-xs font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">CSV or JSON format containing parliamentary allocations</p>
              )}
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleValidate}
              disabled={!file}
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <span>Validate Dataset & Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Validating Loading State */}
      {step === 2 && (
        <div className="gov-card p-12 bg-white text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">Validating Dataset Structure & Data Types...</h2>
          <p className="text-xs text-slate-500">Checking column mappings, mandatory fields, numeric constraints, and database duplicate identifiers.</p>
        </div>
      )}

      {/* STEP 3: Validation Report & Preview */}
      {step === 3 && validationResult && (
        <div className="gov-card p-6 bg-white space-y-6">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${validationResult.valid_rows > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <h2 className="text-sm font-bold text-slate-900">Validation Summary Report</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{validationResult.summary_message}</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Change File
            </button>
          </div>

          {/* Validation Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">Total Rows</div>
              <div className="text-lg font-bold text-slate-900">{validationResult.total_rows.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-700 font-semibold">Valid Rows</div>
              <div className="text-lg font-bold text-emerald-800">{validationResult.valid_rows.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs text-red-700 font-semibold">Rejected Rows</div>
              <div className="text-lg font-bold text-red-800">{validationResult.rejected_rows.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-700 font-semibold">Duplicates</div>
              <div className="text-lg font-bold text-amber-800">{validationResult.duplicate_rows.toLocaleString()}</div>
            </div>
          </div>

          {/* Detected Schema Column Mapping */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-purple-600" />
              <span>Detected Schema Column Mapping</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
              {Object.entries(validationResult.column_mapping).map(([std, raw]) => (
                <div key={std} className="truncate">
                  <span className="text-purple-700 font-semibold">{std}</span>: <span className="text-slate-600">{raw}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          {validationResult.preview_records && validationResult.preview_records.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800">Preview Valid Records (First 5 Rows)</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700 text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left">Record ID</th>
                      <th className="px-3 py-2 text-left">MP Name</th>
                      <th className="px-3 py-2 text-left">Constituency</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-right">Sanctioned (₹ Cr)</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {validationResult.preview_records.map((r) => (
                      <tr key={r.source_record_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-purple-700">{r.source_record_id}</td>
                        <td className="px-3 py-2">{r.mp_name}</td>
                        <td className="px-3 py-2">{r.constituency || r.district}</td>
                        <td className="px-3 py-2">{r.category}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.sanctioned_cost}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Errors List if any */}
          {validationResult.validation_errors && validationResult.validation_errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Rejected Rows & Validation Errors ({validationResult.validation_errors.length})</span>
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-red-50 p-3 rounded-lg border border-red-200 text-[11px] text-red-800 font-mono">
                {validationResult.validation_errors.map((err, idx) => (
                  <div key={idx}>
                    Row {err.row_number}: <span className="font-bold">{err.error_type}</span> on field '<span className="underline">{err.field}</span>' - {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Back to Upload
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={validationResult.valid_rows === 0}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <span>Confirm & Ingest {validationResult.valid_rows.toLocaleString()} Records</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Ingesting Pipeline Executing */}
      {step === 4 && (
        <div className="gov-card p-12 bg-white text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">Executing Ingestion Pipeline...</h2>
          <p className="text-xs text-slate-500">
            Inserting allocation records, calculating deterministic baseline ML risk scores, updating MP and district rollups, and creating provenance logs.
          </p>
        </div>
      )}

      {/* STEP 5: Success & Result Summary */}
      {step === 5 && importResult && (
        <div className="gov-card p-8 bg-white text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Dataset Successfully Ingested</h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">{importResult.message}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500">Import ID</div>
              <div className="font-mono font-bold text-slate-900 text-[11px] truncate">{importResult.import_id}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500">Processed Rows</div>
              <div className="font-bold text-emerald-700">{importResult.processed_rows.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500">Lok Sabha Term</div>
              <div className="font-bold text-slate-900">{importResult.lok_sabha_term}th LS</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500">Duration</div>
              <div className="font-bold text-slate-900">{importResult.duration_seconds}s</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <Link
              to="/admin/datasets/history"
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              View Ingestion History
            </Link>
            <Link
              to="/projects"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
            >
              Explore Master Allocations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatasetImportPage;
