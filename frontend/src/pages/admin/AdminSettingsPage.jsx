import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';

export const AdminSettingsPage = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getConfig();
      setConfigs(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load system config:', err);
      setError(err.message || 'Failed to retrieve platform configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleUpdate = async (key, val) => {
    try {
      setSavingKey(key);
      setError(null);
      await AdminAPI.updateConfig({ config_key: key, config_value: String(val) });
      setSaveSuccess(`Updated ${key} successfully.`);
      setTimeout(() => setSaveSuccess(null), 3000);
      fetchConfigs();
    } catch (err) {
      console.error('Update failed:', err);
      setError(err.message || `Failed to update configuration parameter ${key}.`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="py-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-700 border border-purple-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
          <Settings className="w-3.5 h-3.5" />
          <span>Technical Parameters</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Configuration
        </h1>
        <p className="text-xs text-slate-600">
          Technical operational parameters, feature switches, telemetry retention, and ingestion limits.
        </p>
      </div>

      {/* Boundary Warning */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Least-Privilege Boundary Enforced:</span>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            This panel only configures technical platform behavior (e.g. batch size, logging levels). System Administrators are strictly prohibited from altering individual project expenditures, sanctions, completion statuses, or ML risk thresholds.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading configuration parameters..." />
      ) : (
        <div className="gov-card p-6 bg-white space-y-6">
          <div className="divide-y divide-slate-100">
            {configs.map((c) => (
              <div key={c.config_key} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-0.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700">{c.config_key}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-bold uppercase">
                      {c.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{c.description}</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {c.config_value === 'true' || c.config_value === 'false' ? (
                    <select
                      value={c.config_value}
                      onChange={(e) => handleUpdate(c.config_key, e.target.value)}
                      disabled={savingKey === c.config_key}
                      className="text-xs font-semibold rounded border border-slate-300 px-3 py-1.5 bg-white text-slate-800"
                    >
                      <option value="true">Enabled (true)</option>
                      <option value="false">Disabled (false)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      defaultValue={c.config_value}
                      onBlur={(e) => {
                        if (e.target.value !== c.config_value) {
                          handleUpdate(c.config_key, e.target.value);
                        }
                      }}
                      className="text-xs font-mono rounded border border-slate-300 px-3 py-1.5 bg-white text-slate-800 w-32"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
