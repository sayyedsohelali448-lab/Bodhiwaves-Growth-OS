import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { WhatsAppStatusInfo, WhatsAppConvo, WhatsAppMsg } from '../../types';
import {
  MessageSquare,
  Send,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Phone,
  X
} from 'lucide-react';

export const WhatsAppView: React.FC = () => {
  const { accessToken } = useAuth();

  const [statusInfo, setStatusInfo] = useState<WhatsAppStatusInfo | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConvo[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<WhatsAppMsg[]>([]);
  const [activeContact, setActiveContact] = useState<{ name: string; phone: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Send message
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New Conversation Modal
  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [statusData, convosData] = await Promise.all([
        api.getWhatsAppStatus(accessToken),
        api.getWhatsAppConversations(accessToken),
      ]);
      setStatusInfo(statusData);
      setConversations(convosData);

      if (convosData.length > 0 && !selectedConvoId) {
        setSelectedConvoId(convosData[0].id);
        setActiveContact({ name: convosData[0].contact_name, phone: convosData[0].contact_phone });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load WhatsApp data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const loadMessages = async (convoId: number) => {
    if (!accessToken) return;
    setIsLoadingMessages(true);
    try {
      const data = await api.getWhatsAppConversation(convoId, accessToken);
      setMessages(data.messages || []);
      setActiveContact({ name: data.contact_name, phone: data.contact_phone });
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation messages.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConvoId) {
      loadMessages(selectedConvoId);
    }
  }, [selectedConvoId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvoId || !messageInput.trim() || !accessToken) return;

    setIsSending(true);
    try {
      await api.sendWhatsAppMessage(selectedConvoId, messageInput.trim(), accessToken);
      setMessageInput('');
      await loadMessages(selectedConvoId);
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConvo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !accessToken) return;

    try {
      const res = await api.createWhatsAppConversation(
        { contact_phone: newPhone.trim(), contact_name: newName.trim() || 'Client' },
        accessToken
      );
      setIsNewConvoOpen(false);
      setNewPhone('');
      setNewName('');
      setSuccessMessage('Conversation thread initialized.');
      await loadData();
      if (res.id) setSelectedConvoId(res.id);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Meta WhatsApp Cloud API</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            WhatsApp Business Inbox
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official Meta Cloud API conversations, incoming leads, media messaging, and client threads.
          </p>
        </div>

        <button
          onClick={() => setIsNewConvoOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Honest Integration Status Alert */}
      {statusInfo && !statusInfo.configured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-200 block text-sm">
              Meta Cloud API Credentials Not Configured
            </span>
            <p className="mt-1 text-slate-300">
              The WhatsApp Inbox database tables and endpoints are fully initialized in PostgreSQL. However, live message dispatching requires setting{' '}
              <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">WHATSAPP_API_TOKEN</code> and{' '}
              <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">WHATSAPP_PHONE_NUMBER_ID</code> in the backend environment.
            </p>
          </div>
        </div>
      )}

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

      {/* Main Two-Column Inbox View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
        {/* Left: Conversation List */}
        <div className="border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 font-semibold text-xs uppercase tracking-wider text-slate-400">
            Active Threads ({conversations.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="py-12 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Phone className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                <p>No WhatsApp conversations logged yet.</p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvoId(c.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    selectedConvoId === c.id ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white truncate">{c.contact_name}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(c.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono block">{c.contact_phone}</span>
                  {c.last_message && (
                    <p className="text-xs text-slate-500 truncate mt-1">{c.last_message}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Message Thread */}
        <div className="md:col-span-2 flex flex-col justify-between bg-slate-950/40">
          {/* Thread Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            {activeContact ? (
              <div>
                <h3 className="text-sm font-bold text-white">{activeContact.name}</h3>
                <span className="text-xs font-mono text-slate-400">{activeContact.phone}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Select a conversation</span>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoadingMessages ? (
              <div className="py-12 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : !selectedConvoId ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                Select a thread to view message history.
              </div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                No messages recorded in this conversation yet.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs ${
                      m.direction === 'outbound'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                    }`}
                  >
                    <p>{m.content}</p>
                    <span className="text-[10px] opacity-60 mt-1 block text-right">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={
                statusInfo?.configured
                  ? 'Type an official WhatsApp message...'
                  : 'Meta API credentials required to dispatch live messages...'
              }
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={!selectedConvoId || isSending}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!selectedConvoId || !messageInput.trim() || isSending}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Start Conversation Modal */}
      {isNewConvoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <span>Start WhatsApp Thread</span>
              </h3>
              <button onClick={() => setIsNewConvoOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateConvo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone (with country code) *</label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact / Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Media Lead"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewConvoOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Start Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
