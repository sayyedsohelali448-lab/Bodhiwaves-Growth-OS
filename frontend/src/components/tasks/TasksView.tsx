import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import {
  Layers,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const isManagerOrAdmin =
    user?.role && ['super_admin', 'admin', 'department_manager', 'team_leader'].includes(user.role);
  const isAdmin = user?.role && ['super_admin', 'admin'].includes(user.role);

  const fetchTasks = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAllTasks(accessToken, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      });
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks from PostgreSQL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [accessToken, statusFilter, priorityFilter]);

  const handleUpdateStatus = async (taskId: number, newStatus: TaskStatus, progress: number) => {
    if (!accessToken) return;
    try {
      await api.updateTask(taskId, { status: newStatus, progress_percent: progress }, accessToken);
      setSuccessMessage('Task status updated.');
      await fetchTasks();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    }
  };

  const handleApproval = async (taskId: number, status: 'approved' | 'rejected') => {
    if (!accessToken) return;
    try {
      await api.updateTaskApproval(taskId, status, accessToken);
      setSuccessMessage(status === 'approved' ? 'Deliverable approved!' : 'Revision requested.');
      await fetchTasks();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Approval action failed.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!accessToken) return;
    try {
      await api.deleteTask(taskId, accessToken);
      setSuccessMessage('Task removed from PostgreSQL.');
      await fetchTasks();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'low':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.project_title && t.project_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Sprints & Deliverables</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tasks & Sprints
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deliverable tracking, sprints, work hours, and manager approval workflows.
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deliverables by title or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="revision_required">Revision Required</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading task deliverables from PostgreSQL...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">No Deliverables in Database</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            There are currently no sprint tasks matching your filters. You can add tasks under specific campaigns in the Projects module.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityBadge(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                    {task.status.replace('_', ' ')}
                  </span>
                  {task.project_title && (
                    <span className="px-2 py-0.5 text-xs rounded bg-indigo-950/60 text-indigo-300 border border-indigo-900">
                      Proj: {task.project_title}
                    </span>
                  )}
                  {task.manager_approval_status === 'approved' && (
                    <span className="px-2 py-0.5 text-xs rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approved
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-slate-100">{task.title}</h4>
                {task.description && <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>}

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Due: {task.deadline}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Est: {task.estimated_hours}h / Act: {task.actual_hours}h
                  </span>
                  {task.assigned_to_name && <span>Assignee: {task.assigned_to_name}</span>}
                </div>
              </div>

              {/* Progress & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-32">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Progress</span>
                    <span>{task.progress_percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${task.progress_percent}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {task.status === 'assigned' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'in_progress', 25)}
                      className="px-2.5 py-1 text-xs rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                    >
                      Start Task
                    </button>
                  )}

                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'under_review', 100)}
                      className="px-2.5 py-1 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      Submit for Review
                    </button>
                  )}

                  {isManagerOrAdmin && task.status === 'under_review' && (
                    <>
                      <button
                        onClick={() => handleApproval(task.id, 'approved')}
                        title="Approve Deliverable"
                        className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApproval(task.id, 'rejected')}
                        title="Request Revision"
                        className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete Task"
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
