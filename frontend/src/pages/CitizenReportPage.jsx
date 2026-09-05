import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowLeft, 
  Building2, 
  FileText, 
  Send, 
  Search, 
  Info,
  Camera,
  MapPin,
  X,
  Compass,
  UploadCloud
} from 'lucide-react';
import { ProjectsAPI, ComplaintsAPI } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

const CATEGORY_OPTIONS = [
  { value: 'WORK_NOT_FOUND', labelKey: 'report.cat_work_not_found', fallback: 'Work Not Found' },
  { value: 'WORK_DELAYED', labelKey: 'report.cat_work_delayed', fallback: 'Work Delayed' },
  { value: 'WORK_INCOMPLETE', labelKey: 'report.cat_work_incomplete', fallback: 'Work Appears Incomplete' },
  { value: 'QUALITY_CONCERN', labelKey: 'report.cat_quality_concern', fallback: 'Quality Concern' },
  { value: 'COST_CONCERN', labelKey: 'report.cat_cost_concern', fallback: 'Cost Concern' },
  { value: 'DUPLICATE_SIMILAR_WORK', labelKey: 'report.cat_duplicate_similar_work', fallback: 'Duplicate / Similar Work' },
  { value: 'UTILIZATION_CONCERN', labelKey: 'report.cat_utilization_concern', fallback: 'Utilization Concern' },
  { value: 'ASSET_NOT_FOUND', labelKey: 'report.cat_asset_not_found', fallback: 'Asset Not Found' },
  { value: 'OTHER', labelKey: 'report.cat_other', fallback: 'Other' },
];

export const CitizenReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const queryParams = new URLSearchParams(location.search);
  const initialAllocationId = queryParams.get('allocation') || '';

  // Form State
  const [allocationId, setAllocationId] = useState(initialAllocationId);
  const [allocationData, setAllocationData] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState(null);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Evidence & Geolocation State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const fileInputRef = useRef(null);

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');

  // Success State
  const [submittedReport, setSubmittedReport] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!allocationId) {
      setAllocationData(null);
      setAllocationError(null);
      return;
    }

    const fetchAllocation = async () => {
      setAllocationLoading(true);
      setAllocationError(null);
      try {
        const res = await ProjectsAPI.getProjectById(allocationId.trim());
        if (res && res.allocation) {
          setAllocationData(res.allocation);
        } else {
          setAllocationData(null);
          setAllocationError(t('report.allocation_not_found', 'The selected allocation could not be linked to this report.'));
        }
      } catch (err) {
        setAllocationData(null);
        setAllocationError(t('report.allocation_not_found', 'The selected allocation could not be linked to this report.'));
      } finally {
        setAllocationLoading(false);
      }
    };

    fetchAllocation();
  }, [allocationId]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(t('report.photo_too_large', 'Image exceeds maximum limit of 5 MB.'));
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError(t('report.photo_invalid_type', 'Please select a valid image file (JPEG, PNG, or WebP).'));
      return;
    }

    setPhotoError(null);
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }

    setLocationStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAccuracy(position.coords.accuracy ? Math.round(position.coords.accuracy) : null);
        setLocationStatus('captured');
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleClearLocation = () => {
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setLocationStatus('idle');
  };

  const trimmedDesc = description.trim();
  const descLength = trimmedDesc.length;
  const isDescValid = descLength >= 20 && description.length <= 4000;
  const isFormValid = category && isDescValid && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', trimmedDesc);
    const linkedAlloc = allocationData ? allocationData.source_record_id : (allocationId.trim() || '');
    if (linkedAlloc) formData.append('linked_allocation_id', linkedAlloc);
    if (photoFile) formData.append('photo', photoFile);
    if (latitude !== null && longitude !== null) {
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      if (accuracy !== null) formData.append('location_accuracy_meters', accuracy.toString());
    }

    try {
      const response = await ComplaintsAPI.submitComplaint(formData);
      setSubmittedReport(response);
    } catch (err) {
      setSubmitError(err.message || t('report.submit_failed', 'Failed to submit discrepancy report. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (submittedReport?.complaint_id) {
      navigator.clipboard.writeText(submittedReport.complaint_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (submittedReport) {
    const hasPhoto = Boolean(submittedReport.evidence || submittedReport.evidence_public_safe?.has_photo);
    const hasGps = Boolean(submittedReport.evidence?.has_gps || submittedReport.evidence_public_safe?.has_gps);

    return (
      <div className="py-8 max-w-2xl mx-auto space-y-6">
        <div className="gov-card p-8 text-center space-y-6 border-emerald-300 shadow-md bg-white">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('report.success_title', 'Report Submitted')}</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">{t('report.success_sub', 'Your discrepancy report has been submitted for review.')}</p>
          </div>
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 space-y-2 max-w-md mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('report.id_label', 'Your Unique Report ID')}</span>
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl font-mono font-black text-gov-navy tracking-wide">{submittedReport.complaint_id}</span>
              <button onClick={handleCopyId} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-sm cursor-pointer" title={t('report.copy_id', 'Copy Report ID')}>
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">{t('report.id_helper', 'Please save this ID to track your report status at any time.')}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{t('report.summary_status', 'Current Status')}:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{submittedReport.status_label || submittedReport.status}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{t('report.summary_category', 'Category')}:</span>
              <span className="font-bold text-slate-900">{submittedReport.category_label || submittedReport.category}</span>
            </div>
            {submittedReport.linked_allocation_id && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t('report.summary_allocation', 'Linked Allocation')}:</span>
                <span className="font-mono font-bold text-gov-navy">{submittedReport.linked_allocation_id}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{t('report.summary_photo', 'Photo Evidence')}:</span>
              <span className={`font-semibold ${hasPhoto ? 'text-emerald-700' : 'text-slate-600'}`}>
                {hasPhoto ? t('common.attached', 'Attached') : t('common.not_attached', 'Not Attached')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">{t('report.summary_location', 'GPS Location')}:</span>
              <span className={`font-semibold ${hasGps ? 'text-emerald-700' : 'text-slate-600'}`}>
                {hasGps ? t('common.captured', 'Captured') : t('common.not_provided', 'Not Provided')}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">{t('report.summary_submitted_at', 'Submitted Date')}:</span>
              <span className="text-slate-700 font-medium">{new Date(submittedReport.submitted_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to={initialAllocationId ? `/projects/${initialAllocationId}` : '/projects'} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-navy hover:underline">
          <ArrowLeft className="w-4 h-4" />
          {initialAllocationId ? t('report.back_to_allocation', 'Back to Allocation') : t('report.back_to_explore', 'Back to Explore Allocations')}
        </Link>
        <Link to="/reports/track" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-navy hover:underline">
          <Search className="w-3.5 h-3.5" />
          <span>{t('report.track_existing', 'Track Existing Report')}</span>
        </Link>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gov-navy/10 text-gov-navy">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('report.page_title', 'Citizen Discrepancy & Observation Report')}
          </h1>
        </div>
        <p className="text-xs text-slate-600">
          {t('report.page_subtitle', 'Submit on-ground observations or record discrepancies about parliamentary fund allocations for administrative review.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="gov-card p-6 space-y-6 bg-white shadow-sm border border-slate-200">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>{t('report.field_allocation_label', 'Parliamentary Allocation Reference')}</span>
            {allocationData && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {t('report.allocation_verified', 'Published Record')}
              </span>
            )}
          </label>
          {allocationLoading && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 animate-pulse">
              {t('report.loading_allocation', 'Loading allocation reference...')}
            </div>
          )}
          {allocationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{allocationError}</span>
            </div>
          )}
          {!allocationData && (
            <input
              type="text"
              placeholder={t('report.allocation_input_placeholder', 'Enter Allocation / Source Record ID (e.g. LS16_0408) or leave empty for general observation')}
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-gov-navy/20"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>{t('report.field_category_label', 'Observation Category')} *</span>
            <span className="text-[11px] text-slate-400 font-normal">{t('report.required', 'Required')}</span>
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full text-xs font-medium px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-gov-navy/20">
            <option value="">{t('report.select_category_prompt', '-- Select observation category --')}</option>
            {CATEGORY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{t(opt.labelKey, opt.fallback)}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('report.field_description_label', 'Describe what you observed')} *</label>
            <span className={`text-[11px] font-mono ${descLength < 20 ? 'text-amber-600' : 'text-emerald-700'}`}>{descLength} / 4000</span>
          </div>
          <textarea rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('report.description_placeholder', 'Please provide specific information...')} className="w-full text-xs p-3.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-gov-navy/20" />
        </div>

        <div className="pt-2 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-gov-navy" />
              <span>{t('report.optional_evidence_title', 'Optional Photographic Evidence')}</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/70">
              <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" id="photo-upload-input" />
              {photoPreview ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-40 bg-black/5 flex items-center justify-center">
                    <img src={photoPreview} alt="Evidence Preview" className="max-h-36 object-contain" />
                    <button type="button" onClick={handleRemovePhoto} className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <label htmlFor="photo-upload-input" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-semibold cursor-pointer shadow-sm">
                    <UploadCloud className="w-3.5 h-3.5 text-gov-navy" />
                    <span>{t('report.btn_choose_photo', 'Attach Photo')}</span>
                  </label>
                </div>
              )}
            </div>
            <div className="p-3.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gov-navy" /> {t('report.gps_location', 'GPS Location')}</span>
                {locationStatus === 'captured' ? (
                  <div className="p-2 bg-white rounded border border-slate-200 text-[11px] font-mono">
                    <div>Lat: {latitude?.toFixed(5)}</div>
                    <div>Lon: {longitude?.toFixed(5)}</div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">{t('report.location_helper', 'Optionally capture your current GPS coordinates.')}</p>
                )}
              </div>
              <button type="button" onClick={handleCaptureLocation} disabled={locationStatus === 'capturing'} className="w-full py-2 px-3 mt-3 rounded-md bg-white border border-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                <Compass className="w-3.5 h-3.5 text-gov-navy" />
                {locationStatus === 'capturing' ? t('report.capturing_location', 'Capturing...') : t('report.btn_use_location', 'Use My Current Location')}
              </button>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-medium">{t('report.submission_notice', 'A report is an allegation, not a finding.')}</p>
          <button type="submit" disabled={!isFormValid || submitting} className={`px-6 py-2.5 rounded-lg text-xs font-bold shadow-md ${isFormValid && !submitting ? 'bg-gov-navy text-white' : 'bg-slate-200 text-slate-400'}`}>
            {submitting ? t('report.submitting', 'Submitting...') : t('report.btn_submit', 'Submit Report')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CitizenReportPage;
