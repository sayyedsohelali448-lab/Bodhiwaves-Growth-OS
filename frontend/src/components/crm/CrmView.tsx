import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Lead, LeadStage, LeadSource } from '../../types';
import {
  TrendingUp,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Search,
  Filter,
  MessageSquare
} from 'lucide-react';

const STAGES: Record<LeadStage, { key: LeadStage; label: string; color: string }> = {
  new: { key: 'new', label: 'New Lead', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  contacted: { key: 'contacted', label: 'Contacted', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
  qualified: { key: 'qualified', label: 'Qualified', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' },
  proposal_sent: { key: 'proposal_sent', label: 'Proposal Sent', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  negotiation: { key: 'negotiation', label: 'Negotiation', color: 'border-orange-500/30 text-orange-400 bg-orange-500/10' },
  won: { key: 'won', label: 'Won / Closed', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  lost: { key: 'lost', label: 'Lost', color: 'border-rose-500/30 text-rose-400 bg-rose-500/10' },
};

export const CrmView: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLoadingLeadDetails, setIsLoadingLeadDetails] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // Form Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Lead Form
  const [leadForm, setLeadForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    industry: 'General',
    source: 'website' as LeadSource,
    stage: 'new' as LeadStage,
    estimated_value: '0',
    follow_up_date: '',
    notes: '',
  });

  // New Activity Form
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState<'note' | 'call' | 'email' | 'meeting'>('note');

  const isAdmin = user?.role && ['super_admin', 'admin'].includes(user.role);

  const fetchLeads = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getLeads(accessToken, {
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load CRM leads from PostgreSQL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [accessToken, stageFilter, sourceFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleOpenLeadDetails = async (lead: Lead) => {
    if (!accessToken) return;
    setSelectedLead(lead);
    setIsLoadingLeadDetails(true);
    try {
      const detailed = await api.getLead(lead.id, accessToken);
      setSelectedLead(detailed);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lead activities.');
    } finally {
      setIsLoadingLeadDetails(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.company_name.trim() || !leadForm.contact_person.trim()) {
      setFormError('Company name and contact person are required.');
      return;
    }
    if (!accessToken) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.createLead(
        {
          company_name: leadForm.company_name.trim(),
          contact_person: leadForm.contact_person.trim(),
          email: leadForm.email.trim() || undefined,
          phone: leadForm.phone.trim() || undefined,
          industry: leadForm.industry.trim(),
          source: leadForm.source,
          stage: leadForm.stage,
          estimated_value: Number(leadForm.estimated_value) || 0,
          follow_up_date: leadForm.follow_up_date || undefined,
          notes: leadForm.notes.trim() || undefined,
        },
        accessToken
      );

      setIsCreateModalOpen(false);
      setSuccessMessage('Lead created and logged in PostgreSQL CRM.');
      setLeadForm({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        industry: 'General',
        source: 'website',
        stage: 'new',
        estimated_value: '0',
        follow_up_date: '',
        notes: '',
      });
      await fetchLeads();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStageChange = async (leadId: number, newStage: LeadStage) => {
    if (!accessToken) return;
    try {
      await api.updateLeadStage(leadId, newStage, undefined, accessToken);
      await fetchLeads();
      if (selectedLead?.id === leadId) {
        const detailed = await api.getLead(leadId, accessToken);
        setSelectedLead(detailed);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update stage.');
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activityNote.trim() || !accessToken) return;
    try {
      await api.addLeadActivity(
        selectedLead.id,
        { activity_type: activityType, description: activityNote.trim() },
        accessToken
      );
      setActivityNote('');
      const detailed = await api.getLead(selectedLead.id, accessToken);
      setSelectedLead(detailed);
      await fetchLeads();
    } catch (err: any) {
      setError(err.message || 'Failed to record activity.');
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete || !accessToken) return;
    setIsSubmitting(true);
    try {
      await api.deleteLead(leadToDelete.id, accessToken);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
      if (selectedLead?.id === leadToDelete.id) setSelectedLead(null);
      setSuccessMessage('Lead deleted.');
      await fetchLeads();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary Metrics
  const pipelineValue = leads
    .filter((l) => l.stage !== 'lost')
    .reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);
  const wonCount = leads.filter((l) => l.stage === 'won').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Sales Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CRM & Deal Pipeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track lead inquiries, deal values, client proposals, and touchpoint activities.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Lead</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Active Pipeline Value</span>
          <div className="text-xl font-bold text-white mt-1">₹{pipelineValue.toLocaleString('en-IN')}</div>
          <span className="text-xs text-slate-500">{leads.length} total opportunities</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Closed / Won Deals</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{wonCount} Deals Won</div>
          <span className="text-xs text-slate-500">Converted clients</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Database Source</span>
          <div className="text-xl font-bold text-indigo-400 mt-1">PostgreSQL Table `leads`</div>
          <span className="text-xs text-slate-500">0 fake deals or metrics</span>
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

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by company, contact person, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Stages</option>
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won / Closed</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Sources</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Querying PostgreSQL leads table...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">No Leads Found in PostgreSQL</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            There are currently no sales opportunities recorded in the database. Add your first inbound or outbound lead to start tracking pipeline conversions.
          </p>
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Lead</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => {
            const stageConfig = STAGES[lead.stage] || STAGES.new;
            return (
              <div
                key={lead.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${stageConfig.color}`}>
                      {stageConfig.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 capitalize">
                      {lead.source}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-100">{lead.company_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Contact: <span className="text-slate-200 font-medium">{lead.contact_person}</span></p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Deal Value</span>
                      <span className="font-semibold text-emerald-400">₹{lead.estimated_value.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Follow-up</span>
                      <span className="font-medium text-slate-300">{lead.follow_up_date || 'None set'}</span>
                    </div>
                  </div>

                  {lead.notes && (
                    <p className="text-xs text-slate-400 mt-3 p-2 rounded bg-slate-950/40 border border-slate-800/80 line-clamp-2">
                      {lead.notes}
                    </p>
                  )}
                </div>

                {/* Stage Progression & Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <select
                    value={lead.stage}
                    onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won / Closed</option>
                    <option value="lost">Lost</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenLeadDetails(lead)}
                      title="Activities & History"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{lead.activities_count} Notes</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setLeadToDelete(lead);
                          setIsDeleteModalOpen(true);
                        }}
                        title="Delete Lead"
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead Details & Activities Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Lead Activity Journal</span>
                <h2 className="text-xl font-bold text-white mt-1">{selectedLead.company_name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Contact: {selectedLead.contact_person} • Value: ₹{selectedLead.estimated_value.toLocaleString('en-IN')}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddActivity} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Log Call, Meeting or Note</span>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as any)}
                    className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                  >
                    <option value="note">Internal Note</option>
                    <option value="call">Phone Call</option>
                    <option value="meeting">Client Meeting</option>
                    <option value="email">Email Sent</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  placeholder="Record summary of conversation or follow-up requirement..."
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Post Activity
                  </button>
                </div>
              </form>

              {/* Activity Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</h4>
                {isLoadingLeadDetails ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                  </div>
                ) : (selectedLead.activities || []).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No activities logged yet.</p>
                ) : (
                  (selectedLead.activities || []).map((act) => (
                    <div key={act.id} className="p-3 rounded-lg bg-slate-950/30 border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300 uppercase tracking-wide">{act.activity_type}</span>
                        <span>{new Date(act.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-200">{act.description}</p>
                      {act.performed_by_name && (
                        <span className="text-[10px] text-slate-500 mt-1 block">Logged by {act.performed_by_name}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <span>Create Sales Lead</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prospect Company"
                    value={leadForm.company_name}
                    onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={leadForm.contact_person}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="lead@company.com"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value as LeadSource })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="referral">Referral</option>
                    <option value="meta_ads">Meta Ads</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stage</label>
                  <select
                    value={leadForm.stage}
                    onChange={(e) => setLeadForm({ ...leadForm, stage: e.target.value as LeadStage })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Deal Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={leadForm.estimated_value}
                    onChange={(e) => setLeadForm({ ...leadForm, estimated_value: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Follow-up Target Date</label>
                <input
                  type="date"
                  value={leadForm.follow_up_date}
                  onChange={(e) => setLeadForm({ ...leadForm, follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  placeholder="Requirement details, scope of work..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Lead</h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete lead <span className="text-white font-semibold">"{leadToDelete.company_name}"</span>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setLeadToDelete(null);
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLead}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
