import React from 'react';
import { Database, ShieldAlert, Sparkles, Plus, RefreshCw } from 'lucide-react';

interface Props {
  moduleName: string;
  description: string;
  dbTables: string[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export const ModulePlaceholder: React.FC<Props> = ({
  moduleName,
  description,
  dbTables,
  primaryActionLabel,
  onPrimaryAction
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Commercial Module In Development (Phase C)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{moduleName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>

        {primaryActionLabel && (
          <button
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{primaryActionLabel}</span>
          </button>
        )}
      </div>

      {/* Honest Empty / Development State Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Database className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          PostgreSQL Tables Ready • Backend Integration in Progress
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          As per Bodhiwaves ERP <strong>No Fake Data Policy</strong>, this screen will not display fictional placeholder records. Real authenticated CRUD endpoints for <strong>{moduleName}</strong> are being connected.
        </p>

        {/* Database Tables Section */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-left mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Allocated Database Tables</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dbTables.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
          <span>Scheduled for real API connection in Phase C</span>
        </div>
      </div>
    </div>
  );
};
