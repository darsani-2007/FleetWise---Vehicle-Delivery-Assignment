import React from 'react';
import {
  Truck,
  ShieldCheck,
  Activity,
  RotateCcw,
  FileText,
  PlayCircle,
  LayoutDashboard,
  Users,
  MapPin,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenDemo: () => void;
  onOpenAuditLogs: () => void;
  onResetData: () => void;
  onOpenNewDelivery: () => void;
  blockedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenDemo,
  onOpenAuditLogs,
  onResetData,
  onOpenNewDelivery,
  blockedCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-md shadow-cyan-900/40">
              <Truck className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">FleetWise</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  RAALE #13
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero Double-Booking Logistics Engine</p>
            </div>
          </div>

          {/* Role Navigation Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-sm">
            <button
              onClick={() => onRoleChange('dispatcher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentRole === 'dispatcher'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dispatcher</span>
            </button>

            <button
              onClick={() => onRoleChange('fleet_manager')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentRole === 'fleet_manager'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Fleet Manager</span>
            </button>

            <button
              onClick={() => onRoleChange('operations_lead')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentRole === 'operations_lead'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Live Map</span>
            </button>

            <button
              onClick={() => onRoleChange('qa_tester')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentRole === 'qa_tester'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Test Suite (T1-T12)</span>
            </button>

            <button
              onClick={() => onRoleChange('qa_tester')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50"
              title="Official PDF Spec & Report"
            >
              <FileText className="w-4 h-4" />
              <span>Spec & Report</span>
            </button>
          </nav>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2">
            {/* Quick Demo Acceptance for Judges */}
            <button
              onClick={onOpenDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-semibold text-xs tracking-wide shadow-md shadow-orange-950/40 transition active:scale-95"
            >
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Judges Demo</span>
              <span className="sm:hidden">Demo</span>
            </button>

            {/* Audit log trigger with conflict shield count */}
            <button
              onClick={onOpenAuditLogs}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
              title="Live Audit Log Stream"
            >
              <ClipboardList className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">Audit Log</span>
              {blockedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-red-900/80 text-red-300 border border-red-700/50 rounded-full font-mono text-[10px]">
                  {blockedCount} blocked
                </span>
              )}
            </button>

            {/* Reset data */}
            <button
              onClick={onResetData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="Reset System to Clean Seed Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Submenu for tabs */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800 text-xs scrollbar-none">
          <button
            onClick={() => onRoleChange('dispatcher')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${currentRole === 'dispatcher' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'}`}
          >
            Dispatcher
          </button>
          <button
            onClick={() => onRoleChange('fleet_manager')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${currentRole === 'fleet_manager' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'}`}
          >
            Fleet Manager
          </button>
          <button
            onClick={() => onRoleChange('operations_lead')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${currentRole === 'operations_lead' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'}`}
          >
            Live Map
          </button>
          <button
            onClick={() => onRoleChange('qa_tester')}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap ${currentRole === 'qa_tester' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'}`}
          >
            Tests (T1-T12)
          </button>
        </div>
      </div>
    </header>
  );
};
