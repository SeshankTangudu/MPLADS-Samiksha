import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, AlertCircle, ShieldAlert, Layers } from 'lucide-react';

export const DashboardPage = () => {
  // Category Breakdown Data from verified dataset & cohort baselines
  const categoryData = [
    { name: 'Infrastructure & Public Amenities', allocations: 569, expenditure: 10450.2, sanctioned: 11840.0, utilization: 88.26 },
    { name: 'Community Development', allocations: 557, expenditure: 4247.1, sanctioned: 6088.5, utilization: 69.76 },
    { name: 'Rural & Urban Development', allocations: 549, expenditure: 6926.95, sanctioned: 6895.0, utilization: 100.46 }
  ];

  // Risk Tier Distribution (Aligned with Frozen Contract §2.1)
  const riskDistribution = [
    { name: 'Low (0–24)', count: 1220, color: '#16a34a' },
    { name: 'Medium (25–49)', count: 380, color: '#eab308' },
    { name: 'High (50–74)', count: 65, color: '#f97316' },
    { name: 'Critical (75–100)', count: 10, color: '#dc2626' }
  ];

  // Term-wise Comparison (15th, 16th, 17th Lok Sabha)
  const termData = [
    { term: '15th LS (2009–14)', allocations: 549, expenditure: 6927.0, sanctioned: 6895.0 },
    { term: '16th LS (2014–19)', allocations: 569, expenditure: 10450.2, sanctioned: 11840.0 },
    { term: '17th LS (2019–24)', allocations: 557, expenditure: 4247.1, sanctioned: 6088.5 }
  ];

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gov-navy" />
            Analytics Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Macro financial distribution, risk profile breakdown, and cross-term comparisons across 1,675 allocations
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
          <Layers className="w-4 h-4 text-gov-navy" />
          <span>Data Snapshot: 15th–17th Lok Sabha</span>
        </div>
      </div>

      {/* Top Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="gov-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Portfolio Risk Tier Distribution
              </h3>
              <p className="text-xs text-slate-500">Breakdown of allocations across 4 analytical risk tiers</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Total: 1,675
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value) => [`${value} Allocations`, 'Count']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
            {riskDistribution.map((tier) => (
              <div key={tier.name} className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium block truncate">{tier.name}</span>
                <span className="text-sm font-black text-slate-800">{tier.count}</span>
                <span className="text-[10px] text-slate-400 block">({((tier.count / 1675) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Financial Breakdown Chart */}
        <div className="gov-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gov-navy" />
                Financial Expenditure vs Budget (₹ Crores)
              </h3>
              <p className="text-xs text-slate-500">Sanctioned works budget vs reported expenditure by category</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val, name) => [`₹${val.toLocaleString()} Cr`, name === 'sanctioned' ? 'Sanctioned Budget' : 'Reported Expenditure']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="sanctioned" name="Sanctioned Budget" fill="#1B3A5C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenditure" name="Reported Expenditure" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-blue-50/60 rounded border border-blue-100 text-xs text-slate-700 flex items-center justify-between">
            <span>Overall Financial Utilization Rate across all sectors:</span>
            <span className="font-bold text-gov-navy text-sm">87.11%</span>
          </div>
        </div>
      </div>

      {/* Parliamentary Term Comparison Section */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Parliamentary Term Longitudinal Comparison</h3>
            <p className="text-xs text-slate-500">Aggregate allocation volume and financial deployment across 15th, 16th, and 17th Lok Sabha</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Lok Sabha Term</th>
                <th>Time Period</th>
                <th className="text-right">Allocation Records</th>
                <th className="text-right">Sanctioned Works (₹ Cr)</th>
                <th className="text-right">Reported Expenditure (₹ Cr)</th>
                <th className="text-right">Financial Utilization</th>
              </tr>
            </thead>
            <tbody>
              {termData.map((row) => (
                <tr key={row.term} className="hover:bg-slate-50 transition-colors">
                  <td className="font-semibold text-slate-900">{row.term.split(' ')[0]} {row.term.split(' ')[1]}</td>
                  <td className="text-slate-500">{row.term.split(' ')[2]}</td>
                  <td className="text-right font-medium">{row.allocations.toLocaleString()}</td>
                  <td className="text-right">₹{row.sanctioned.toLocaleString()} Cr</td>
                  <td className="text-right font-semibold text-gov-navy">₹{row.expenditure.toLocaleString()} Cr</td>
                  <td className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {((row.expenditure / row.sanctioned) * 100).toFixed(1)}%
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

export default DashboardPage;
