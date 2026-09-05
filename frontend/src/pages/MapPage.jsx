import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Layers, 
  ShieldAlert, 
  Filter, 
  RotateCcw, 
  Info,
  Compass,
  AlertCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AnalyticsAPI, ComplaintsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import { useLanguage } from '../i18n/LanguageContext';

export const MapPage = () => {
  const { t } = useLanguage();
  const [locations, setLocations] = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);
  const [showCitizenReportsLayer, setShowCitizenReportsLayer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedRiskTier, setSelectedRiskTier] = useState('');

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const citizenLayerRef = useRef(null);

  // Fetch district location centroids and citizen reports
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [locData, reportsRes] = await Promise.all([
          AnalyticsAPI.getLocations(),
          ComplaintsAPI.getComplaints({ limit: 100 }).catch(() => ({ items: [] }))
        ]);
        setLocations(locData || []);
        const gpsReports = (reportsRes?.items || []).filter(
          r => r.evidence && r.evidence.latitude !== null && r.evidence.longitude !== null
        );
        setCitizenReports(gpsReports);
      } catch (err) {
        console.error('Failed to load geospatial locations:', err);
        setError(err.message || 'Geospatial centroid layer failed to load.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extract unique states for filter
  const uniqueStates = Array.from(new Set(locations.map((loc) => loc.state))).filter(Boolean).sort();

  // Initialize Leaflet Map once DOM container is ready
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Define India / South Asia geographic bounds
    const southWest = L.latLng(5.0, 60.0);
    const northEast = L.latLng(38.0, 100.0);
    const bounds = L.latLngBounds(southWest, northEast);

    // Create Leaflet Map centered on India (22.0 N, 78.9 E)
    const map = L.map(mapContainerRef.current, {
      center: [22.0, 78.9],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      maxBounds: bounds,
      maxBoundsViscosity: 0.8,
      attributionControl: true
    });

    // Add CartoDB Voyager English Tile Layer (Clean cartography with English labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Create FeatureGroups
    const markersLayer = L.featureGroup().addTo(map);
    const citizenLayer = L.featureGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    citizenLayerRef.current = citizenLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when locations or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // Filter locations
    const filtered = locations.filter((loc) => {
      if (selectedState && loc.state !== selectedState) return false;
      if (selectedRiskTier && loc.dominant_risk_level !== selectedRiskTier) return false;
      return true;
    });

    filtered.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const isHigh = loc.dominant_risk_level === 'High' || loc.flagged_allocations >= 2;
      const isMedium = loc.dominant_risk_level === 'Medium' || loc.flagged_allocations === 1;

      const color = isHigh ? '#DC2626' : isMedium ? '#D97706' : '#2563EB';
      const fillColor = isHigh ? '#EF4444' : isMedium ? '#F59E0B' : '#3B82F6';
      const radius = Math.min(22, Math.max(7, Math.sqrt(loc.total_allocations || 1) * 4));

      const circle = L.circleMarker([loc.latitude, loc.longitude], {
        radius: radius,
        fillColor: fillColor,
        color: color,
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.6,
      });

      // Custom Accessible Popup
      const popupContent = `
        <div style="font-family: Inter, sans-serif; font-size: 12px; line-height: 1.4; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #1E293B; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px;">
            ${loc.district_name}
          </div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">State: <strong>${loc.state}</strong></div>
          <div style="color: #334155; margin-bottom: 2px;">Total Allocations: <strong>${loc.total_allocations}</strong></div>
          <div style="color: #334155; margin-bottom: 2px;">Reported Spent: <strong>₹${loc.total_expenditure_crore.toFixed(2)} Cr</strong></div>
          <div style="color: ${isHigh ? '#DC2626' : isMedium ? '#D97706' : '#16A34A'}; font-weight: 600; margin-top: 4px;">
            Flagged Allocations: ${loc.flagged_allocations} (${loc.dominant_risk_level} Risk)
          </div>
          <div style="font-size: 9px; color: #94A3B8; margin-top: 6px; border-top: 1px dashed #CBD5E1; padding-top: 4px;">
            *District centroid reference only
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      circle.on('click', () => {
        setSelectedDistrictId(loc.district_id);
      });
      markersLayer.addLayer(circle);
    });

    // Auto-fit bounds if filtering by state and has markers
    if (selectedState && filtered.length > 0 && mapInstanceRef.current) {
      try {
        const bounds = markersLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
        }
      } catch (e) {
        console.warn('Bounds fitting error:', e);
      }
    }
  }, [locations, selectedState, selectedRiskTier]);

  // Render Citizen Report GPS observations layer
  useEffect(() => {
    if (!mapInstanceRef.current || !citizenLayerRef.current) return;
    const citizenLayer = citizenLayerRef.current;
    citizenLayer.clearLayers();

    if (!showCitizenReportsLayer) return;

    citizenReports.forEach((r) => {
      const lat = r.evidence?.latitude;
      const lon = r.evidence?.longitude;
      if (lat === null || lat === undefined || lon === null || lon === undefined) return;

      // Filter by state if selected
      if (selectedState && r.state && r.state.toLowerCase() !== selectedState.toLowerCase()) return;

      const marker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: '#8B5CF6',
        color: '#6D28D9',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; font-size: 12px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 800; font-size: 12px; color: #6D28D9; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>📍 Citizen Observation</span>
            <span style="font-family: monospace; font-size: 10px; color: #475569;">${r.complaint_id}</span>
          </div>
          <div style="color: #1E293B; font-weight: 700; font-size: 12px; margin-bottom: 3px;">
            ${r.category_label || r.category}
          </div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 3px;">
            Submitted: ${new Date(r.submitted_at).toLocaleDateString()}
          </div>
          ${r.evidence?.has_photo ? `
            <div style="color: #059669; font-size: 11px; font-weight: 600; margin-bottom: 3px;">
              📷 Photograph Evidence Attached
            </div>
          ` : ''}
          ${r.linked_allocation_id ? `
            <div style="color: #1E293B; font-size: 11px; margin-top: 4px;">
              Linked Record: <strong>${r.linked_allocation_id}</strong>
            </div>
          ` : ''}
          <div style="font-size: 9px; color: #7C3AED; margin-top: 6px; border-top: 1px dashed #DDD6FE; padding-top: 4px; font-weight: 500;">
            *Citizen GPS coordinate. Distinct from district administrative centroid.
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      citizenLayer.addLayer(marker);
    });
  }, [citizenReports, showCitizenReportsLayer, selectedState]);

  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [districtDetail, setDistrictDetail] = useState(null);
  const [districtLoading, setDistrictLoading] = useState(false);

  // Fetch deep district details when selected
  useEffect(() => {
    if (!selectedDistrictId) {
      setDistrictDetail(null);
      return;
    }

    const fetchDistrictDetail = async () => {
      setDistrictLoading(true);
      try {
        const res = await AnalyticsAPI.getDistrictAnalytics(selectedDistrictId);
        setDistrictDetail(res);
      } catch (err) {
        console.error('Failed to load district detail:', err);
      } finally {
        setDistrictLoading(false);
      }
    };

    fetchDistrictDetail();
  }, [selectedDistrictId]);

  const handleResetFilters = () => {
    setSelectedState('');
    setSelectedRiskTier('');
    setSelectedDistrictId(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([22.5, 82.0], 5);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (selectedState && loc.state !== selectedState) return false;
    if (selectedRiskTier && loc.dominant_risk_level !== selectedRiskTier) return false;
    return true;
  });

  const filteredCount = filteredLocations.length;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-gov-navy" />
            District GIS Intelligence Map & Risk Profiles (Phase 2.2)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Geospatial centroid mapping of 1,675 parliamentary allocations across <strong>{locations.length}</strong> administrative districts
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
          Showing <strong>{filteredCount}</strong> mapped district centroids
        </div>
      </div>

      {/* Geospatial Clarification Banner */}
      <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-blue-900 flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">{t('common.disclaimer', 'District Centroid Reference Disclosure:')} </span>
          Map coordinates represent verified administrative district reference centroids (100% matched), NOT granular individual physical project GPS positions. Click any district pin to inspect its full empirical risk profile.
        </div>
      </div>

      {/* Filters & Map Container Grid */}
      <div className="gov-card p-5 space-y-4">
        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('map.filter_state', 'Filter by State / UT')}</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">All States & UTs ({uniqueStates.length})</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('map.filter_risk', 'Filter by Risk Concentration')}</label>
            <select
              value={selectedRiskTier}
              onChange={(e) => setSelectedRiskTier(e.target.value)}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">{t('common.all', 'All Risk Tiers')}</option>
              <option value="High">High Risk Concentration (≥ 2 Flagged)</option>
              <option value="Medium">{t('map.medium_risk_desc', 'Medium Risk Concentration (1 Flagged)')}</option>
              <option value="Low">{t('map.low_risk_desc', 'Low Risk (0 Flagged)')}</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-1.5 text-xs text-purple-900 font-bold cursor-pointer select-none bg-purple-50 p-2 rounded border border-purple-200">
              <input
                type="checkbox"
                checked={showCitizenReportsLayer}
                onChange={(e) => setShowCitizenReportsLayer(e.target.checked)}
                className="rounded border-purple-400 text-purple-600 focus:ring-purple-500"
              />
              <span>📍 Show Citizen GPS ({citizenReports.length})</span>
            </label>
          </div>

          <div className="flex justify-end pt-4 sm:pt-0">
            <button
              onClick={handleResetFilters}
              className="gov-btn-secondary text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Map View
            </button>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="relative rounded-lg overflow-hidden border border-slate-200">
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
              <LoadingState message="Rendering Leaflet geospatial layers and district markers..." />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-sm font-semibold text-slate-800">{error}</p>
            </div>
          )}

          <div 
            ref={mapContainerRef} 
            className="w-full h-[540px] bg-slate-100 z-10"
            aria-label="Interactive India District Centroid Map"
          />

          {/* Interactive Legend Floating Overlay */}
          <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur p-3.5 rounded-lg border border-slate-200 shadow-md text-xs space-y-2 max-w-xs">
            <span className="font-bold text-slate-900 block text-[11px] border-b border-slate-100 pb-1">
              Map Layers &amp; Centroid Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700 flex-shrink-0" />
              <span className="text-slate-700">District: High Risk (≥ 2 flagged)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-700 flex-shrink-0" />
              <span className="text-slate-700">District: Medium Risk (1 flagged)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-700 flex-shrink-0" />
              <span className="text-slate-700">District: Low Risk (0 flagged)</span>
            </div>
            {showCitizenReportsLayer && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-purple-800 flex-shrink-0" />
                <span className="text-purple-900 font-bold">📍 Citizen Observation (GPS)</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              *District centroid is an administrative reference point, distinct from citizen GPS pins.
            </p>
          </div>
        </div>
      </div>

      {/* {t('map.district_profile_title', 'District Risk Profile')} Section (P1-2) */}
      <div className="gov-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gov-navy" />
              {t('map.district_profile_title', 'District Risk Profile')} & Aggregate Intelligence (P1-2)
            </h3>
            <p className="text-xs text-slate-500">
              Summarizes authentic allocation-level Model A scores and review signals across administrative districts
            </p>
          </div>

          <div className="w-full sm:w-80">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select District to Inspect Profile</label>
            <select
              value={selectedDistrictId || ''}
              onChange={(e) => setSelectedDistrictId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="">-- Choose a District ({filteredLocations.length} available) --</option>
              {filteredLocations.map((loc) => (
                <option key={loc.district_id} value={loc.district_id}>
                  {loc.district_name} ({loc.state}) — {loc.flagged_allocations} flagged / {loc.total_allocations} total
                </option>
              ))}
            </select>
          </div>
        </div>

        {districtLoading && (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading comprehensive district risk profile...
          </div>
        )}

        {districtDetail && !districtLoading && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* District Header Overview */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-900">{districtDetail.district_name}</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {districtDetail.state}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Administrative Centroid: <strong>{(districtDetail.latitude ?? 0).toFixed(4)}° N, {(districtDetail.longitude ?? 0).toFixed(4)}° E</strong> (Reference point only)
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded bg-blue-100 text-blue-900 border border-blue-200">
                  {districtDetail.total_allocations || 0} Total Allocations
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded bg-red-100 text-red-900 border border-red-200">
                  {districtDetail.high_risk_count || 0} High-Risk Review Priorities
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200">
                  {districtDetail.high_risk_percentage ?? 0}% High-Risk Concentration
                </span>
              </div>
            </div>

            {/* Core Financial & Aggregate Risk Metrics */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                District-Level Aggregate Financial &amp; Risk Metrics
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 block text-[11px]">{t('map.total_sanctioned', 'Total Sanctioned')}</span>
                  <span className="font-bold text-slate-900 text-sm">₹{(districtDetail.total_sanctioned_crore ?? 0).toFixed(2)} Cr</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 block text-[11px]">{t('map.reported_spent', 'Reported Spent')}</span>
                  <span className="font-bold text-slate-900 text-sm">₹{(districtDetail.total_expenditure_crore ?? 0).toFixed(2)} Cr</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 block text-[11px]">{t('map.unspent_balance', 'Unspent Balance')}</span>
                  <span className="font-bold text-slate-900 text-sm">₹{(districtDetail.total_unspent_crore ?? 0).toFixed(2)} Cr</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 block text-[11px]">{t('map.utilization_proxy', 'Utilization Proxy')}</span>
                  <span className="font-bold text-gov-navy text-sm">{(districtDetail.avg_utilization ?? 0).toFixed(1)}%</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 block text-[11px]">Avg Risk Score</span>
                  <span className="font-bold text-slate-900 text-sm">{(districtDetail.avg_risk_score ?? 0).toFixed(1)} / 100</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-slate-500 block text-[11px]">{t('map.high_risk_share', 'High-Risk Share')}</span>
                  <span className="font-bold text-red-600 text-sm">{districtDetail.high_risk_percentage ?? 0}%</span>
                </div>
              </div>
            </div>

            {/* Risk Distribution & 5-Dimension Signal Composition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Risk Distribution */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs border-b border-slate-200 pb-1.5">
                  Model A Risk Tier Distribution in District
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 block">Low Risk (&lt;25)</span>
                    <span className="text-base font-bold text-slate-900">{districtDetail.risk_distribution?.Low || 0}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-amber-700 block">Medium (25–49.9)</span>
                    <span className="text-base font-bold text-slate-900">{districtDetail.risk_distribution?.Medium || 0}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-red-700 block">High (≥50)</span>
                    <span className="text-base font-bold text-slate-900">{districtDetail.risk_distribution?.High || 0}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Tier assignment strictly reflects allocation-level Model A scores.
                </p>
              </div>

              {/* Signal Composition */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs border-b border-slate-200 pb-1.5">
                  Analytical Review Signal Composition (Flags)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Financial Outliers</span>
                    <span className="font-bold text-red-600 text-sm">{districtDetail.financial_flags_count}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Timeline Stagnation</span>
                    <span className="font-bold text-amber-600 text-sm">{districtDetail.timeline_flags_count}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Pending Compliance</span>
                    <span className="font-bold text-blue-600 text-sm">{districtDetail.data_quality_flags_count}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Geographic Density</span>
                    <span className="font-bold text-slate-700 text-sm">{districtDetail.geographic_flags_count || 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Duplicate Review</span>
                    <span className="font-bold text-slate-700 text-sm">{districtDetail.duplicate_flags_count || 0}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Review signals represent analytical indicators requiring human verification.
                </p>
              </div>
            </div>

            {/* {t('map.sector_breakdown', 'Civic Sector Breakdown')} Table */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1.5">
                Civic Sector Composition &amp; Expenditure Breakdown
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 text-left font-bold">Civic Sector</th>
                      <th className="p-2 text-center font-bold">Allocations</th>
                      <th className="p-2 text-right font-bold">Avg Expenditure</th>
                      <th className="p-2 text-center font-bold">Avg Risk Score</th>
                      <th className="p-2 text-center font-bold">High-Risk Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {districtDetail.top_categories.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2 font-semibold text-slate-800">{c.category}</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">{c.count}</td>
                        <td className="p-2 text-right font-mono text-slate-700">₹{c.avg_expenditure?.toFixed(2) || '0.00'} Cr</td>
                        <td className="p-2 text-center font-mono font-semibold text-gov-navy">{c.avg_risk_score?.toFixed(1) || '0.0'}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.high_risk_count > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.high_risk_count || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Priority Flagged Allocations for Investigation Navigation */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-900">
                  Priority Allocations for Investigation in {districtDetail.district_name} ({districtDetail.flagged_projects?.length || 0})
                </span>
                <span className="text-[11px] text-slate-500">
                  Click allocation ID for deep analytical workspace
                </span>
              </div>

              {districtDetail.flagged_projects?.length === 0 ? (
                <p className="text-slate-500 italic py-2">No High/Critical-risk allocations in this district.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-200 rounded bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-2 text-left font-bold">Record ID</th>
                        <th className="p-2 text-left font-bold">MP / Constituency</th>
                        <th className="p-2 text-left font-bold">Category</th>
                        <th className="p-2 text-right font-bold">Sanctioned</th>
                        <th className="p-2 text-right font-bold">{t('map.reported_spent', 'Reported Spent')}</th>
                        <th className="p-2 text-center font-bold">Risk Score</th>
                        <th className="p-2 text-center font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {districtDetail.flagged_projects?.map((fp) => (
                        <tr key={fp.id} className="hover:bg-slate-50/80">
                          <td className="p-2 font-mono font-bold text-gov-navy">{fp.source_record_id}</td>
                          <td className="p-2 text-slate-800">
                            <span className="font-semibold block">{fp.mp_name}</span>
                            <span className="text-[10px] text-slate-500">{fp.constituency} ({fp.lok_sabha_term}LS)</span>
                          </td>
                          <td className="p-2 text-slate-600">{fp.category}</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{(fp.sanctioned_cost ?? 0).toFixed(2)} Cr</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{(fp.expenditure ?? 0).toFixed(2)} Cr</td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              {fp.total_score} ({fp.risk_level})
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <a
                              href={`/projects/${fp.source_record_id}`}
                              className="text-xs text-gov-navy hover:text-gov-navyLight font-semibold underline"
                            >
                              Investigate →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Centroid & Responsible AI Disclaimers */}
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-gov-navy" />
                Data Integrity &amp; Responsible AI Disclaimers
              </p>
              <p className="leading-relaxed">
                *{districtDetail.disclaimer}
              </p>
              <p className="text-[11px] text-slate-500">
                Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
