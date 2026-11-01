import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { TeamMemberPresence, ActiveSessionInfo, Task } from '../../types';
import {
  Activity,
  Play,
  Square,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Users
} from 'lucide-react';

export const LiveTrackingView: React.FC = () => {
  const { accessToken } = useAuth();

  const [team, setTeam] = useState<TeamMemberPresence[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [teamData, sessionData, taskData] = await Promise.all([
        api.getTeamPresence(accessToken),
        api.getMySession(accessToken),
        api.getAllTasks(accessToken, { status: 'in_progress' }),
      ]);
      setTeam(teamData);
      setActiveSession(sessionData);
      setTasks(taskData);
    } catch (err: any) {
      setError(err.message || 'Failed to load tracking data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (accessToken) {
        api.getTeamPresence(accessToken).then(setTeam).catch(() => {});
      }
    }, 15000); // 15s refresh for live presence
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleStartSession = async (type: 'working' | 'break') => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      await api.startWorkSession(
        type,
        selectedTaskId ? Number(selectedTaskId) : undefined,
        sessionNotes.trim() || undefined,
        accessToken
      );
      setSuccessMessage(type === 'working' ? 'Work session started!' : 'Break session started.');
      setSessionNotes('');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to start session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopSession = async () => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      await api.stopWorkSession('Session completed', accessToken);
      setSuccessMessage('Work session ended and hours saved to database.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to stop session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const workingCount = team.filter((m) => m.live_status === 'working').length;
  const breakCount = team.filter((m) => m.live_status === 'break').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Team Presence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Live Workforce Tracking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Transparent active work sessions, timers, task associations, and team status.
          </p>
        </div>
      </div>

      {/* Banners */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-400 text-xs font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Current User Active Session Control Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Personal Session Controller
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              {activeSession ? (
                <span className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeSession.session_type === 'working' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  Session in Progress: <span className="capitalize">{activeSession.session_type}</span>
                </span>
              ) : (
                'No Active Work Session'
              )}
            </h3>
            {activeSession?.task_title && (
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Task: {activeSession.task_title}
              </p>
            )}
          </div>

          {/* Session Action Buttons */}
          <div className="flex items-center gap-3">
            {!activeSession ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">No linked task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleStartSession('working')}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Working</span>
                </button>

                <button
                  onClick={() => handleStartSession('break')}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Take Break</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStopSession}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>Stop Session & Log Time</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Total Enrolled Workforce</span>
          <div className="text-xl font-bold text-white mt-1">{team.length} Staff</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Currently Working</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{workingCount} Active</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">On Break</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{breakCount} Away</div>
        </div>
      </div>

      {/* Team Presence Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Querying live team presence from PostgreSQL...</p>
        </div>
      ) : team.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center text-slate-400">
          <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm">No employee accounts enrolled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member) => (
            <div
              key={member.employee_id}
              className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                      {member.avatar_initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{member.full_name}</h4>
                      <span className="text-[11px] text-slate-400 block">{member.designation}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold capitalize border ${
                    member.live_status === 'working' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    member.live_status === 'break' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${member.live_status === 'working' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {member.live_status}
                  </span>
                </div>

                {member.current_task ? (
                  <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Task</span>
                    <span className="text-slate-200 font-medium truncate block">{member.current_task}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No task actively clocked.</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                <span>Code: {member.employee_code}</span>
                {member.department_name && <span>{member.department_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
