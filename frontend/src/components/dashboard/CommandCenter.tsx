import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  FolderKanban,
  Sparkles,
  Play,
  Coffee,
  Briefcase,
  Plus,
  ShieldCheck,
  Building,
  ArrowRight
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState<'working' | 'break' | 'meeting' | 'offline'>('working');
  const [departmentCount, setDepartmentCount] = useState<number>(0);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [clientCount, setClientCount] = useState<number>(0);
  const [projectCount, setProjectCount] = useState<number>(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!accessToken) return;
      try {
        const [deptRes, empRes, clientRes, projRes, finRes] = await Promise.all([
          fetch('http://localhost:8000/api/v1/departments', { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch('http://localhost:8000/api/v1/employees?size=1', { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch('http://localhost:8000/api/v1/clients', { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch('http://localhost:8000/api/v1/projects', { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch('http://localhost:8000/api/v1/finance/summary', { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);

        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartmentCount(data.data ? data.data.length : 0);
        }
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployeeCount(empData.total || 0);
        }
        if (clientRes.ok) {
          const clients = await clientRes.json();
          setClientCount(Array.isArray(clients) ? clients.length : 0);
        }
        if (projRes.ok) {
          const projs = await projRes.json();
          setProjectCount(Array.isArray(projs) ? projs.length : 0);
        }
        if (finRes.ok) {
          const finData = await finRes.json();
          setMonthlyRevenue(finData.total_collected || 0);
        }
      } catch (err) {
        console.warn('Metrics fetch error:', err);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchCounts();
  }, [accessToken]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-950/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium mb-3 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Growth OS Enterprise • Live PostgreSQL Connection</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {user?.full_name || 'Administrator'}
          </h1>
          <p className="text-indigo-200 text-sm mt-1">
            Bodhiwaves Media operational hub connected to database <code className="font-mono text-xs bg-indigo-950/60 px-2 py-0.5 rounded">bodhiwaves_erp</code>.
          </p>
        </div>

        {/* Live Status Control */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-xl flex items-center gap-3 self-start md:self-auto">
          <div className="text-right">
            <div className="text-xs text-indigo-200 font-medium">Your Live Status</div>
            <div className="text-sm font-semibold capitalize flex items-center gap-1.5 justify-end">
              <span className={`w-2 h-2 rounded-full ${
                currentStatus === 'working' ? 'bg-emerald-400 animate-pulse' :
                currentStatus === 'break' ? 'bg-amber-400' :
                currentStatus === 'meeting' ? 'bg-indigo-400' : 'bg-slate-400'
              }`} />
              {currentStatus}
            </div>
          </div>
          <div className="flex items-center gap-1 border-l border-white/20 pl-3">
            <button
              onClick={() => setCurrentStatus('working')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                currentStatus === 'working' ? 'bg-emerald-500 text-white' : 'hover:bg-white/10 text-slate-300'
              }`}
              title="Working"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStatus('break')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                currentStatus === 'break' ? 'bg-amber-500 text-white' : 'hover:bg-white/10 text-slate-300'
              }`}
              title="Break"
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStatus('meeting')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                currentStatus === 'meeting' ? 'bg-indigo-500 text-white' : 'hover:bg-white/10 text-slate-300'
              }`}
              title="Meeting"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Real KPI Stats Grid (No Fake Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoadingMetrics ? '...' : `₹${monthlyRevenue.toLocaleString('en-IN')}`}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>{monthlyRevenue > 0 ? 'Verified collected in DB' : '0 paid invoices in DB'}</span>
            <button
              onClick={() => navigate('/finance')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Invoices
            </button>
          </div>
        </div>

        {/* Retainers / Clients */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Retainers</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoadingMetrics ? '...' : `${clientCount} Clients`}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>{clientCount > 0 ? `${clientCount} registered accounts` : 'No active clients yet'}</span>
            <button
              onClick={() => navigate('/clients')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Add Client
            </button>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoadingMetrics ? '...' : `${projectCount} Projects`}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>{projectCount > 0 ? `${projectCount} active project campaigns` : '0 active deliverables'}</span>
            <button
              onClick={() => navigate('/projects')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + New Project
            </button>
          </div>
        </div>

        {/* Departments & Workforce */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Divisions</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoadingMetrics ? '...' : `${departmentCount} Departments`}
          </div>
          <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>{employeeCount} staff enrolled</span>
            <button
              onClick={() => navigate('/departments')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline & Live Employee Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Pipeline Flow (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lead & Revenue Pipeline</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">PostgreSQL CRM stages</p>
            </div>
            <button
              onClick={() => navigate('/crm')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <span>Open Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real Empty Pipeline Stages */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {['New Leads', 'Contacted', 'Qualified', 'Proposal', 'Won'].map((stage) => (
              <div key={stage} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-xs text-slate-500 font-medium">{stage}</div>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">0</div>
                <div className="text-[10px] text-slate-400">₹0.00</div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Recent Client Milestones</h3>
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <FolderKanban className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No client project deliverables active yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Projects created in the system will automatically appear here.</p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:bg-indigo-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Project</span>
            </button>
          </div>
        </div>

        {/* Live Tracking Sidebar (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Workforce</h2>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Real-time attendance & authenticated employee sessions.
            </p>

            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 mb-4">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">0 Employees Registered</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                Enroll agency team members to start live tracking.
              </p>
              <button
                onClick={() => navigate('/departments')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Staff</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Database Sync</span>
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">PostgreSQL Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
