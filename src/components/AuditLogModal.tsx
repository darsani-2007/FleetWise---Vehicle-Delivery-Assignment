import React, { useState } from 'react';
import {
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  const [filterAction, setFilterAction] = useState('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">System Audit & Conflict Log</h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {logs.length} events
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="CONFLICT_BLOCKED">Conflicts Blocked</option>
            <option value="ASSIGN_SUCCESS">Assignments</option>
            <option value="STATUS_CHANGE">Status Changes</option>
            <option value="CREATE">Creations</option>
          </select>

          <input
            type="text"
            placeholder="Search audit trail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-1.5 outline-none focus:border-blue-500"
          />
        </div>

        {/* Log stream */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
          {filteredLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No matching audit events</p>
          ) : (
            filteredLogs.map((log) => {
              const isConflict = log.action === 'CONFLICT_BLOCKED';
              const isSuccess = log.action === 'ASSIGN_SUCCESS';

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs font-mono transition ${
                    isConflict
                      ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                      : isSuccess
                      ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      {isConflict && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                      {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span className={isConflict ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-cyan-400'}>
                        {log.action}
                      </span>
                      <span className="text-slate-500 font-normal">by {log.actor}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs font-sans text-slate-300">{log.details}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
