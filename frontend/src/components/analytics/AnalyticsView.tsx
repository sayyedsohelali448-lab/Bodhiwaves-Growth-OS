import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FolderKanban,
  AlertCircle,
  Loader2
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { accessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getAnalyticsOverview(accessToken);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Aggregating live business metrics from PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Business Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time commercial revenue metrics, sales conversion stages, and workforce outputs.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Financial Velocity & Cash Flow</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Collected Revenue</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              ₹{(data?.finance?.total_revenue || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-500 mt-2 block">from paid tax invoices</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Total Invoiced</span>
            <div className="text-2xl font-bold text-white mt-1">
              ₹{(data?.finance?.total_invoiced || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-500 mt-2 block">{data?.finance?.invoices_count || 0} invoices issued</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Outstanding Balances</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              ₹{(data?.finance?.outstanding_invoices || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-500 mt-2 block">pending client remittances</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Net Margin</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              ₹{(data?.finance?.net_margin || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-500 mt-2 block">after operational expenses</span>
          </div>
        </div>
      </div>

      {/* CRM & Pipeline Section */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Sales Pipeline & Conversions</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Active Deal Pipeline</span>
              <div className="text-2xl font-bold text-white mt-1">
                ₹{(data?.pipeline?.pipeline_value || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Across {data?.pipeline?.total_leads || 0} logged sales opportunities.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium block mb-3">Leads by Conversion Stage</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(data?.pipeline?.stages || {}).length === 0 ? (
                <p className="text-xs text-slate-500 col-span-4 py-4 text-center">No leads recorded in CRM yet.</p>
              ) : (
                Object.entries(data?.pipeline?.stages || {}).map(([stage, count]: any) => (
                  <div key={stage} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{stage}</span>
                    <span className="text-lg font-bold text-white mt-1 block">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projects & Workforce Section */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          <span>Operations & Delivery Velocity</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <span className="text-xs text-slate-400 font-medium block">Sprint & Deliverables Output</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-xs text-slate-400">Total Projects</span>
                <div className="text-xl font-bold text-white mt-1">{data?.projects?.total_projects || 0}</div>
                <span className="text-[11px] text-indigo-400">{data?.projects?.active_projects || 0} currently active</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-xs text-slate-400">Tasks Completed</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {data?.projects?.completed_tasks || 0} / {data?.projects?.total_tasks || 0}
                </div>
                <span className="text-[11px] text-slate-500">deliverables closed</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <span className="text-xs text-slate-400 font-medium block">Workforce Staffing by Division</span>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(data?.workforce?.by_department || []).map((dept: any) => (
                <div key={dept.department_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
                  <span className="font-medium text-slate-200">{dept.department_name}</span>
                  <span className="font-bold text-indigo-400">{dept.employee_count} staff</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
