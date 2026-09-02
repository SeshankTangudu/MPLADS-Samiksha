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
import { ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';

export const MapPage = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedRiskTier, setSelectedRiskTier] = useState('');

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Fetch district location centroids
  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ProjectsAPI.getLocations();
        setLocations(data || []);
      } catch (err) {
        console.error('Failed to load geospatial locations:', err);
        setError(err.message || 'Geospatial centroid layer failed to load.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Extract unique states for filter
  const uniqueStates = Array.from(new Set(locations.map((loc) => loc.state))).filter(Boolean).sort();

  // Initialize Leaflet Map once DOM container is ready
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Leaflet Map centered on India (20.5937 N, 78.9629 E)
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 82.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: true
    });

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    // Create FeatureGroup for markers
    const markersLayer = L.featureGroup().addTo(map);
    markersLayerRef.current = markersLayer;
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

  const handleResetFilters = () => {
    setSelectedState('');
    setSelectedRiskTier('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([22.5, 82.0], 5);
    }
  };

  const filteredCount = locations.filter((loc) => {
    if (selectedState && loc.state !== selectedState) return false;
    if (selectedRiskTier && loc.dominant_risk_level !== selectedRiskTier) return false;
    return true;
  }).length;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-gov-navy" />
            District GIS Intelligence Map
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
          <span className="font-bold">District Centroid Reference Disclosure: </span>
          Map coordinates represent verified administrative district reference centroids (100% matched), NOT granular individual physical project GPS positions. Circle radius is proportional to total allocation volume.
        </div>
      </div>

      {/* Filters & Map Container Grid */}
      <div className="gov-card p-5 space-y-4">
        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by State / UT</label>
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
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Risk Concentration</label>
            <select
              value={selectedRiskTier}
              onChange={(e) => setSelectedRiskTier(e.target.value)}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">All Risk Tiers</option>
              <option value="High">High Risk Concentration (≥ 2 Flagged)</option>
              <option value="Medium">Medium Risk Concentration (1 Flagged)</option>
              <option value="Low">Low Risk (0 Flagged)</option>
            </select>
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
            className="w-full h-[580px] bg-slate-100 z-10"
            aria-label="Interactive India District Centroid Map"
          />

          {/* Interactive Legend Floating Overlay */}
          <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur p-3.5 rounded-lg border border-slate-200 shadow-md text-xs space-y-2 max-w-xs">
            <span className="font-bold text-slate-900 block text-[11px] border-b border-slate-100 pb-1">
              Centroid Risk Density Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700 flex-shrink-0" />
              <span className="text-slate-700">High Risk (≥ 2 flagged allocations)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-700 flex-shrink-0" />
              <span className="text-slate-700">Medium Risk (1 flagged allocation)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-700 flex-shrink-0" />
              <span className="text-slate-700">Low Risk (0 flagged allocations)</span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              Marker radius scales with total allocation count.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
