import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Employee, AttendanceRecord, LeaveRequest, Department } from '../../types';
import {
  Users,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  X
} from 'lucide-react';

export const HrmsView: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'roster' | 'attendance' | 'leaves'>('roster');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayAtt, setTodayAtt] = useState<AttendanceRecord | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Enroll Form
  const [enrollForm, setEnrollForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    designation: '',
    department_id: '',
    employee_code: '',
    phone: '',
  });

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'casual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const isManagerOrAdmin =
    user?.role && ['super_admin', 'admin', 'department_manager', 'team_leader'].includes(user.role);

  const loadAll = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [empData, attData, todayData, leaveData, deptData] = await Promise.all([
        api.getEmployees(accessToken),
        api.getAttendance(accessToken),
        api.getTodayAttendance(accessToken),
        api.getLeaves(accessToken),
        api.getDepartments(accessToken),
      ]);
      setEmployees(empData);
      setAttendance(attData);
      setTodayAtt(todayData);
      setLeaves(leaveData);
      setDepartments(deptData);
    } catch (err: any) {
      setError(err.message || 'Failed to load HRMS data from PostgreSQL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [accessToken]);

  const handleCheckIn = async () => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      await api.checkIn('Office Check-In', accessToken);
      setSuccessMessage('Successfully checked in for today!');
      await loadAll();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Check-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      await api.checkOut('Day wrap up', accessToken);
      setSuccessMessage('Successfully checked out! Work hours logged.');
      await loadAll();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Check-out failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.full_name || !enrollForm.email || !enrollForm.password || !enrollForm.employee_code || !enrollForm.designation) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!accessToken) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.enrollEmployee(
        {
          ...enrollForm,
          department_id: enrollForm.department_id ? Number(enrollForm.department_id) : undefined,
        },
        accessToken
      );
      setIsEnrollModalOpen(false);
      setSuccessMessage(`Employee ${enrollForm.full_name} enrolled successfully.`);
      setEnrollForm({
        full_name: '',
        email: '',
        password: '',
        role: 'employee',
        designation: '',
        department_id: '',
        employee_code: '',
        phone: '',
      });
      await loadAll();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to enroll employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      setFormError('Start date, end date, and reason are required.');
      return;
    }
    if (!accessToken) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.applyLeave(leaveForm, accessToken);
      setIsLeaveModalOpen(false);
      setSuccessMessage('Leave application submitted for manager approval.');
      setLeaveForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      await loadAll();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewLeave = async (leaveId: number, status: 'approved' | 'rejected') => {
    if (!accessToken) return;
    try {
      await api.reviewLeave(leaveId, status, undefined, accessToken);
      setSuccessMessage(`Leave application ${status}.`);
      await loadAll();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to review leave.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Workforce Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workforce & HRMS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Employee directory, attendance logs, leave processing, and workforce operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Check-in/Check-out for current user */}
          {!todayAtt?.check_in_time ? (
            <button
              onClick={handleCheckIn}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Check In</span>
            </button>
          ) : !todayAtt?.check_out_time ? (
            <button
              onClick={handleCheckOut}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Check Out ({todayAtt.total_working_hours}h)</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 text-xs border border-slate-700 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Checked Out ({todayAtt.total_working_hours}h logged)
            </span>
          )}

          <button
            onClick={() => {
              setFormError(null);
              setIsLeaveModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Apply Leave</span>
          </button>

          {isManagerOrAdmin && (
            <button
              onClick={() => {
                setFormError(null);
                setIsEnrollModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Staff</span>
            </button>
          )}
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'roster'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Staff Roster ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Attendance Logs ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'leaves'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Leave Applications ({leaves.length})
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading workforce records from PostgreSQL...</p>
        </div>
      ) : activeTab === 'roster' ? (
        /* Staff Roster Tab */
        employees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center">
            <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-200">No Staff Members Enrolled</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Add your agency team members, assign designations, and configure department access.
            </p>
            {isManagerOrAdmin && (
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Enroll First Employee
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                      {emp.employee_code}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                      <span className={`w-2 h-2 rounded-full ${emp.live_status === 'working' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {emp.live_status}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white">{emp.designation}</h3>
                  <p className="text-xs text-slate-400 mt-1">Status: <span className="text-slate-300 font-medium capitalize">{emp.employment_status}</span></p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500">
                  User ID: #{emp.user_id} • Enrolled in PostgreSQL
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'attendance' ? (
        /* Attendance Logs Tab */
        attendance.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center text-slate-400">
            <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm">No attendance records logged in the database yet.</p>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Check In</th>
                  <th className="p-3.5">Check Out</th>
                  <th className="p-3.5">Hours</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {attendance.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-medium text-white">{att.employee_name || `Emp #${att.employee_id}`}</td>
                    <td className="p-3.5">{att.date}</td>
                    <td className="p-3.5">{att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : '—'}</td>
                    <td className="p-3.5">{att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : 'Active'}</td>
                    <td className="p-3.5 font-semibold text-emerald-400">{att.total_working_hours}h</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Leaves Tab */
        leaves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center text-slate-400">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm">No leave requests found in the database.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map((lv) => (
              <div
                key={lv.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-slate-800 text-indigo-400 border border-slate-700">
                      {lv.leave_type} Leave
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                      lv.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      lv.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {lv.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{lv.employee_name || `Emp #${lv.employee_id}`}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{lv.reason}</p>
                  <span className="text-xs text-slate-500 mt-2 block">
                    Duration: {lv.start_date} to {lv.end_date}
                  </span>
                </div>

                {isManagerOrAdmin && lv.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewLeave(lv.id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewLeave(lv.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Enroll Employee Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span>Enroll Agency Employee</span>
              </h3>
              <button onClick={() => setIsEnrollModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff Member"
                    value={enrollForm.full_name}
                    onChange={(e) => setEnrollForm({ ...enrollForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="BW-EMP-001"
                    value={enrollForm.employee_code}
                    onChange={(e) => setEnrollForm({ ...enrollForm, employee_code: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="employee@bodhiwaves.com"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={enrollForm.password}
                    onChange={(e) => setEnrollForm({ ...enrollForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Video Editor"
                    value={enrollForm.designation}
                    onChange={(e) => setEnrollForm({ ...enrollForm, designation: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={enrollForm.department_id}
                    onChange={(e) => setEnrollForm({ ...enrollForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Enroll Staff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Apply for Leave</span>
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Leave *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="State the reason for your leave request..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
