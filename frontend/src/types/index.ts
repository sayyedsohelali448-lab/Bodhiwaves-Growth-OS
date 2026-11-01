export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'department_manager'
  | 'team_leader'
  | 'employee'
  | 'client';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  avatar_initials: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_initials: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export type LiveStatus = 'online' | 'working' | 'break' | 'away' | 'offline';

export interface Employee {
  id: number;
  user_id: number;
  employee_code: string;
  department_id?: number | null;
  designation: string;
  employment_status: string;
  live_status: LiveStatus;
  last_active_at?: string | null;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'in_review' | 'completed' | 'on_hold';

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  client_id?: number | null;
  manager_id?: number | null;
  department_id?: number | null;
  budget: number;
  start_date?: string | null;
  deadline: string;
  progress_percent: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  client_name?: string | null;
  manager_name?: string | null;
  department_name?: string | null;
  tasks_count: number;
  completed_tasks_count: number;
  tasks?: Task[];
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'assigned' | 'accepted' | 'in_progress' | 'under_review' | 'revision_required' | 'completed';
export type TaskApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  department_id?: number | null;
  project_id?: number | null;
  assigned_to_id?: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string | null;
  deadline: string;
  estimated_hours: number;
  actual_hours: number;
  progress_percent: number;
  manager_approval_status: TaskApprovalStatus;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
  project_title?: string | null;
  department_name?: string | null;
  assigned_to_name?: string | null;
}

// ==========================================
// Clients
// ==========================================
export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'churned';

export interface Client {
  id: number;
  business_name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  status: ClientStatus;
  account_manager_id?: number | null;
  account_manager_name?: string | null;
  active_projects_count: number;
  total_invoiced: number;
  created_at: string;
  updated_at: string;
}

// ==========================================
// CRM & Sales
// ==========================================
export type LeadSource = 'website' | 'whatsapp' | 'referral' | 'meta_ads' | 'manual';
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';

export interface LeadActivity {
  id: number;
  lead_id: number;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change';
  description: string;
  performed_by_id?: number | null;
  performed_by_name?: string | null;
  created_at: string;
}

export interface Lead {
  id: number;
  company_name: string;
  contact_person: string;
  email?: string | null;
  phone?: string | null;
  industry: string;
  source: LeadSource;
  stage: LeadStage;
  estimated_value: number;
  assigned_sales_id?: number | null;
  assigned_sales_name?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  activities_count: number;
  activities?: LeadActivity[];
}

// ==========================================
// HRMS & Attendance
// ==========================================
export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  employee_code?: string | null;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_working_hours: number;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  employee_code?: string | null;
  leave_type: 'casual' | 'sick' | 'earned' | 'unpaid';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_id?: number | null;
  reviewed_by_name?: string | null;
  review_notes?: string | null;
  created_at: string;
}

// ==========================================
// Live Workforce Tracking
// ==========================================
export interface TeamMemberPresence {
  employee_id: number;
  employee_code: string;
  full_name: string;
  avatar_initials: string;
  department_name?: string | null;
  designation: string;
  live_status: LiveStatus;
  last_active_at?: string | null;
  current_task?: string | null;
  session_type?: 'working' | 'break' | null;
  session_started_at?: string | null;
}

export interface ActiveSessionInfo {
  session_id: number;
  session_type: 'working' | 'break';
  task_id?: number | null;
  task_title?: string | null;
  start_time: string;
  last_heartbeat: string;
  notes?: string | null;
}

// ==========================================
// Finance & Invoices
// ==========================================
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface PaymentReceipt {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: string;
  transaction_ref?: string | null;
  paid_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string | null;
  project_id?: number | null;
  project_title?: string | null;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date?: string | null;
  status: InvoiceStatus;
  created_at: string;
  payments_count: number;
  payments?: PaymentReceipt[];
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  department_id?: number | null;
  department_name?: string | null;
  amount: number;
  expense_date: string;
  recorded_by_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface FinancialSummary {
  total_invoiced: number;
  total_collected: number;
  outstanding_balance: number;
  total_expenses: number;
  net_revenue: number;
  invoices_count: number;
  expenses_count: number;
}

// ==========================================
// WhatsApp Business Inbox
// ==========================================
export interface WhatsAppStatusInfo {
  configured: boolean;
  phone_number_id_configured: boolean;
  business_account_id_configured: boolean;
  conversations_count: number;
  messages_count: number;
  status_message: string;
}

export interface WhatsAppMsg {
  id: number;
  conversation_id: number;
  meta_message_id?: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  delivery_status: string;
  timestamp: string;
}

export interface WhatsAppConvo {
  id: number;
  contact_phone: string;
  contact_name: string;
  lead_id?: number | null;
  lead_company?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  unread_count: number;
  last_message?: string | null;
  last_message_at: string;
  created_at: string;
}
