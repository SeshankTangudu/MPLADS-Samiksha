import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Landmark, 
  Building, 
  MapPin, 
  ShieldAlert, 
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { AnalyticsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';

export const AnalyticsPage = () => {
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catData, distData] = await Promise.all([
          AnalyticsAPI.getByCategory(),
          AnalyticsAPI.getByDistrict(),
        ]);
        setCategories(catData || []);
        setDistricts(distData || []);
      } catch (err) {
        console.error('Failed to load sector analytics:', err);
        setError(err.message || 'Failed to fetch analytics dataset.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Aggregating civic sector analytics and district risk densities..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600 space-y-2">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <p className="font-semibold text-sm">{error}</p>
      </div>
    );
  }

  // Format category financial comparison data for Recharts
  const categoryFinancialChartData = categories.map((cat) => ({
    name: cat.category.replace(' & ', ' &\n'),
    sanctioned: cat.total_sanctioned_crore,
    expenditure: cat.total_expenditure_crore,
    utilization: cat.avg_utilization,
    allocations: cat.total_allocations,
    flagged: cat.flagged_count,
    flagged_pct: cat.flagged_percentage,
  }));

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gov-navy" />
            Civic Sector & District Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comparative analysis of fund allocation, financial utilization proxies, and risk concentrations across civic categories and administrative districts
          </p>
        </div>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.category} className="gov-card p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Civic Sector</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{cat.category}</h3>
              </div>
              <Building className="w-5 h-5 text-gov-navy opacity-80" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Total Allocations</span>
                <span className="text-base font-bold text-slate-900">{cat.total_allocations.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reported Spent</span>
                <span className="text-base font-bold text-gov-navy">₹{cat.total_expenditure_crore.toLocaleString()} Cr</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Financial Utilization Proxy</span>
                <span className="text-gov-navy">{cat.avg_utilization.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gov-navy h-2 rounded-full"
                  style={{ width: `${Math.min(100, cat.avg_utilization)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 text-slate-600">
              <span>Review Signal Density:</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {cat.flagged_count} flagged ({cat.flagged_percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Budget vs Expenditure Comparison */}
        <div className="gov-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Financial Sanctioned vs Reported Spent (₹ Cr)</h3>
              <p className="text-xs text-slate-500">Aggregate approved works budget compared to cumulative reported expenditure</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryFinancialChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} unit=" Cr" />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString()} Cr`, '']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="sanctioned" name="Sanctioned Budget (₹ Cr)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenditure" name="Reported Spent (₹ Cr)" fill="#1B3A5C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Risk Density Comparison */}
        <div className="gov-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Analytical Review Signal Density by Sector</h3>
              <p className="text-xs text-slate-500">Percentage of allocations exhibiting elevated statistical review indicators</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryFinancialChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} unit="%" domain={[0, 15]} />
                <Tooltip
                  formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="flagged_pct" name="Flagged Allocation Rate (%)" fill="#D97706" radius={[4, 4, 0, 0]}>
                  {categoryFinancialChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#B45309' : '#D97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Administrative Districts Table */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gov-navy" />
              Administrative District Portfolio Rankings
            </h3>
            <p className="text-xs text-slate-500">
              Ranked by total allocation volume and risk concentration density (Top 20 Districts)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>District</th>
                <th>State / UT</th>
                <th className="text-right">Total Allocations</th>
                <th className="text-right">Reported Expenditure</th>
                <th className="text-center">Flagged Allocations</th>
                <th className="text-center">Dominant Risk Density</th>
              </tr>
            </thead>
            <tbody>
              {districts.slice(0, 20).map((d) => (
                <tr key={d.district_id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-semibold text-slate-900">{d.district_name}</td>
                  <td className="text-slate-600">{d.state}</td>
                  <td className="text-right font-medium text-slate-800">{d.total_allocations}</td>
                  <td className="text-right font-bold text-gov-navy">₹{d.total_expenditure_crore.toFixed(2)} Cr</td>
                  <td className="text-center font-semibold text-amber-800">
                    {d.flagged_allocations > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900">
                        {d.flagged_allocations}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`gov-badge ${d.dominant_risk_level === 'High' ? 'gov-badge-high' : d.dominant_risk_level === 'Medium' ? 'gov-badge-medium' : 'gov-badge-low'}`}>
                      {d.dominant_risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
