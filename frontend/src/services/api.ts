import type {
  TokenResponse,
  User,
  Department,
  Employee,
  LiveStatus,
  Project,
  Task,
  Client,
  Lead,
  LeadActivity,
  AttendanceRecord,
  LeaveRequest,
  TeamMemberPresence,
  ActiveSessionInfo,
  Invoice,
  Expense,
  FinancialSummary,
  WhatsAppStatusInfo,
  WhatsAppConvo
} from '../types';

const API_BASE = 'http://localhost:8000/api/v1';

export const api = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Invalid email or password');
    }
    return data;
  },

  async logout(refreshToken: string, accessToken: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
  },

  async getMe(accessToken: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  async getDepartments(accessToken: string): Promise<Department[]> {
    const res = await fetch(`${API_BASE}/departments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  },

  async getEmployees(accessToken: string): Promise<Employee[]> {
    const res = await fetch(`${API_BASE}/employees?size=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  },

  async updateLiveStatus(
    empId: number,
    status: LiveStatus,
    accessToken: string
  ): Promise<Employee> {
    const res = await fetch(
      `${API_BASE}/employees/${empId}/live-status?status_value=${status}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update live status');
    return data.data;
  },

  async getProjects(
    accessToken: string,
    filters?: { status?: string; search?: string; department_id?: number }
  ): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.department_id) params.append('department_id', filters.department_id.toString());

    const url = `${API_BASE}/projects${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch projects');
    }
    return res.json();
  },

  async getProject(id: number, accessToken: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch project details');
    }
    return res.json();
  },

  async createProject(
    payload: {
      title: string;
      description?: string;
      department_id?: number;
      budget: number;
      start_date?: string;
      deadline: string;
      status: string;
    },
    accessToken: string
  ): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create project');
    }
    return data;
  },

  async updateProject(
    id: number,
    payload: {
      title?: string;
      description?: string;
      department_id?: number;
      budget?: number;
      start_date?: string;
      deadline?: string;
      status?: string;
      progress_percent?: number;
    },
    accessToken: string
  ): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update project');
    }
    return data;
  },

  async deleteProject(id: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete project');
    }
  },

  async getProjectTasks(projectId: number, accessToken: string): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch project tasks');
    }
    return res.json();
  },

  async createProjectTask(
    projectId: number,
    payload: {
      title: string;
      description?: string;
      priority: string;
      deadline: string;
      estimated_hours: number;
      status: string;
      progress_percent: number;
    },
    accessToken: string
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ...payload, project_id: projectId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to create task');
    }
    return data;
  },

  async updateTask(
    taskId: number,
    payload: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      deadline?: string;
      actual_hours?: number;
      progress_percent?: number;
      manager_approval_status?: string;
    },
    accessToken: string
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update task');
    }
    return data;
  },

  async updateTaskApproval(
    taskId: number,
    approvalStatus: 'approved' | 'rejected',
    accessToken: string
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/approval?approval_status=${approvalStatus}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update task approval');
    }
    return data;
  },

  async deleteTask(taskId: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete task');
    }
  },

  // ==========================================
  // Clients API
  // ==========================================
  async getClients(
    accessToken: string,
    filters?: { status?: string; industry?: string; search?: string }
  ): Promise<Client[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.industry && filters.industry !== 'all') params.append('industry', filters.industry);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/clients?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch clients');
    }
    return res.json();
  },

  async getClient(id: number, accessToken: string): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch client details');
    return res.json();
  },

  async createClient(data: Partial<Client>, accessToken: string): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to create client');
    return resData;
  },

  async updateClient(id: number, data: Partial<Client>, accessToken: string): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to update client');
    return resData;
  },

  async deleteClient(id: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete client');
    }
  },

  // ==========================================
  // CRM API
  // ==========================================
  async getLeads(
    accessToken: string,
    filters?: { stage?: string; source?: string; search?: string }
  ): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.stage && filters.stage !== 'all') params.append('stage', filters.stage);
    if (filters?.source && filters.source !== 'all') params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/crm/leads?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch sales leads');
    }
    return res.json();
  },

  async getLead(id: number, accessToken: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/crm/leads/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch lead profile');
    return res.json();
  },

  async createLead(data: Partial<Lead>, accessToken: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to create lead');
    return resData;
  },

  async updateLead(id: number, data: Partial<Lead>, accessToken: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/crm/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to update lead');
    return resData;
  },

  async updateLeadStage(id: number, stage: string, notes: string | undefined, accessToken: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/crm/leads/${id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ stage, notes }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to update lead stage');
    return resData;
  },

  async addLeadActivity(
    leadId: number,
    data: { activity_type: string; description: string },
    accessToken: string
  ): Promise<LeadActivity> {
    const res = await fetch(`${API_BASE}/crm/leads/${leadId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to add activity');
    return resData;
  },

  async deleteLead(id: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/crm/leads/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete lead');
    }
  },

  // ==========================================
  // HRMS & Attendance API
  // ==========================================
  async getAttendance(
    accessToken: string,
    filters?: { date?: string; status?: string }
  ): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);

    const res = await fetch(`${API_BASE}/hrms/attendance?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getTodayAttendance(accessToken: string): Promise<AttendanceRecord | null> {
    const res = await fetch(`${API_BASE}/hrms/attendance/today`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  },

  async checkIn(notes: string | undefined, accessToken: string): Promise<AttendanceRecord> {
    const res = await fetch(`${API_BASE}/hrms/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Check-in failed');
    return data;
  },

  async checkOut(notes: string | undefined, accessToken: string): Promise<AttendanceRecord> {
    const res = await fetch(`${API_BASE}/hrms/attendance/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Check-out failed');
    return data;
  },

  async getLeaves(accessToken: string, status?: string): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);

    const res = await fetch(`${API_BASE}/hrms/leaves?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async applyLeave(data: { leave_type: string; start_date: string; end_date: string; reason: string }, accessToken: string): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/hrms/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to submit leave application');
    return resData;
  },

  async reviewLeave(leaveId: number, status: 'approved' | 'rejected', review_notes: string | undefined, accessToken: string): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/hrms/leaves/${leaveId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status, review_notes }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to review leave');
    return resData;
  },

  async enrollEmployee(data: any, accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/hrms/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to enroll employee');
    return resData;
  },

  // ==========================================
  // Live Tracking API
  // ==========================================
  async getTeamPresence(accessToken: string): Promise<TeamMemberPresence[]> {
    const res = await fetch(`${API_BASE}/tracking/team`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getMySession(accessToken: string): Promise<ActiveSessionInfo | null> {
    const res = await fetch(`${API_BASE}/tracking/my-session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  },

  async startWorkSession(session_type: string, task_id: number | undefined, notes: string | undefined, accessToken: string): Promise<any> {
    const params = new URLSearchParams({ session_type });
    if (task_id) params.append('task_id', task_id.toString());
    if (notes) params.append('notes', notes);

    const res = await fetch(`${API_BASE}/tracking/session/start?${params.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to start session');
    return data;
  },

  async stopWorkSession(notes: string | undefined, accessToken: string): Promise<any> {
    const params = new URLSearchParams();
    if (notes) params.append('notes', notes);

    const res = await fetch(`${API_BASE}/tracking/session/stop?${params.toString()}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to stop session');
    return data;
  },

  // ==========================================
  // Tasks Standalone API
  // ==========================================
  async getAllTasks(
    accessToken: string,
    filters?: { status?: string; priority?: string; project_id?: number }
  ): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters?.project_id) params.append('project_id', filters.project_id.toString());

    const res = await fetch(`${API_BASE}/tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  // ==========================================
  // Finance API
  // ==========================================
  async getInvoices(accessToken: string, status?: string): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);

    const res = await fetch(`${API_BASE}/finance/invoices?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getInvoice(id: number, accessToken: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/finance/invoices/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
  },

  async createInvoice(data: any, accessToken: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/finance/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to create invoice');
    return resData;
  },

  async updateInvoice(id: number, data: any, accessToken: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/finance/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to update invoice');
    return resData;
  },

  async deleteInvoice(id: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/finance/invoices/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to delete invoice');
  },

  async recordPayment(invoiceId: number, data: any, accessToken: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/finance/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to record payment');
    return resData;
  },

  async getExpenses(accessToken: string, category?: string): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);

    const res = await fetch(`${API_BASE}/finance/expenses?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async createExpense(data: any, accessToken: string): Promise<Expense> {
    const res = await fetch(`${API_BASE}/finance/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to record expense');
    return resData;
  },

  async deleteExpense(id: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/finance/expenses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to delete expense');
  },

  async getFinancialSummary(accessToken: string): Promise<FinancialSummary> {
    const res = await fetch(`${API_BASE}/finance/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch financial summary');
    return res.json();
  },

  // ==========================================
  // WhatsApp API
  // ==========================================
  async getWhatsAppStatus(accessToken: string): Promise<WhatsAppStatusInfo> {
    const res = await fetch(`${API_BASE}/whatsapp/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch WhatsApp status');
    return res.json();
  },

  async getWhatsAppConversations(accessToken: string): Promise<WhatsAppConvo[]> {
    const res = await fetch(`${API_BASE}/whatsapp/conversations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getWhatsAppConversation(id: number, accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/whatsapp/conversations/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  async createWhatsAppConversation(data: any, accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/whatsapp/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to start conversation');
    return resData;
  },

  async sendWhatsAppMessage(conversationId: number, content: string, accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/whatsapp/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ content, message_type: 'text' }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to send WhatsApp message');
    return resData;
  },

  // ==========================================
  // Analytics API
  // ==========================================
  async getAnalyticsOverview(accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/overview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // ==========================================
  // Settings & Audit API
  // ==========================================
  async getUserProfile(accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  async updateUserProfile(data: { full_name?: string; phone?: string }, accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to update profile');
    return resData;
  },

  async changePassword(data: { current_password: string; new_password: string }, accessToken: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.detail || 'Failed to change password');
    return resData;
  },

  async getAuditLogs(accessToken: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/settings/audit-logs`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return res.json();
  },
};
