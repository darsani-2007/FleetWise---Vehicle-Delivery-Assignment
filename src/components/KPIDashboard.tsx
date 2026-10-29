import React from 'react';
import {
  Truck,
  Users,
  Package,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { FleetStats } from '../api';

interface KPIDashboardProps {
  stats: FleetStats | null;
  onFilterPending?: () => void;
  onFilterActive?: () => void;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ stats, onFilterPending, onFilterActive }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
      {/* 1. Fleet Utilisation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Fleet Utilisation</span>
          <TrendingUp className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {stats.fleet_utilisation_pct}%
          </span>
          <span className="text-xs text-slate-400">
            ({stats.assigned_vehicles}/{stats.total_vehicles} in use)
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(5, stats.fleet_utilisation_pct))}%` }}
          />
        </div>
      </div>

      {/* 2. Available Drivers */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Driver Pool</span>
          <Users className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">
            {stats.available_drivers}
          </span>
          <span className="text-xs text-slate-400">available now</span>
        </div>
        <p className="text-[11px] text-slate-500">
          {stats.assigned_drivers} on trip · {stats.total_drivers - stats.available_drivers - stats.assigned_drivers} off-duty
        </p>
      </div>

      {/* 3. Pending Deliveries */}
      <div
        onClick={onFilterPending}
        className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 shadow-sm cursor-pointer transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider group-hover:text-amber-400 transition">
            Pending Orders
          </span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-amber-400 tracking-tight">
            {stats.pending_deliveries}
          </span>
          <span className="text-xs text-slate-400">awaiting dispatch</span>
        </div>
        <p className="text-[11px] text-slate-500 group-hover:text-amber-300/80 transition flex items-center gap-1">
          Click to review queue <ArrowUpRight className="w-3 h-3" />
        </p>
      </div>

      {/* 4. Active Deliveries */}
      <div
        onClick={onFilterActive}
        className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 shadow-sm cursor-pointer transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider group-hover:text-blue-400 transition">
            Active Deliveries
          </span>
          <Package className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-blue-400 tracking-tight">
            {stats.active_deliveries}
          </span>
          <span className="text-xs text-slate-400">assigned / on road</span>
        </div>
        <p className="text-[11px] text-slate-500">
          {stats.in_transit_deliveries} rolling · {stats.delivered_deliveries} delivered
        </p>
      </div>

      {/* 5. Conflict Shield Counter */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/50 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-indigo-300">
            Safety Shield
          </span>
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-indigo-300 font-mono tracking-tight">
            {stats.blocked_conflicts_count}
          </span>
          <span className="text-xs text-indigo-200/70">conflicts blocked</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Double-bookings safely rejected
        </p>
      </div>

      {/* Emergency & Bike Rapid Fleet Status Bar */}
      <div className="col-span-2 md:col-span-4 lg:col-span-5 bg-gradient-to-r from-rose-950/50 via-slate-900 to-amber-950/40 border border-rose-900/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-900/50 text-rose-300 border border-rose-700/60 font-bold uppercase text-[10px] tracking-wider animate-pulse">
            🚨 Dedicated Emergency Fleet
          </span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            Separated Rapid Response Units &amp; Delivery Bikes
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">🚨 Emergency Vehicles &amp; Vans:</span>
            <span className="font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
              {stats.emergency_vehicles_count || 3} units
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">🏍️ Emergency Rapid Bikes:</span>
            <span className="font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
              {stats.emergency_bikes_count || 2} bikes
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">⚡ SOS / Urgent Queue:</span>
            <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              {stats.emergency_deliveries_count || 2} orders
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
