import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchVehicles,
  fetchDrivers,
  fetchDeliveries,
  fetchStats,
  fetchAuditLogs,
  assignDelivery,
  assignBundle,
  updateDeliveryStatus,
  createDelivery,
  createVehicle,
  createDriver,
  updateVehicleStatus,
  updateDriverStatus,
  resetDemoData,
  FleetStats,
} from './api';
import { Vehicle, Driver, Delivery, AuditLog, UserRole, DeliveryStatus } from './types';
import { Navbar } from './components/Navbar';
import { KPIDashboard } from './components/KPIDashboard';
import { DispatcherBoard } from './components/DispatcherBoard';
import { FleetManagerView } from './components/FleetManagerView';
import { OperationsLiveMap } from './components/OperationsLiveMap';
import { TestSuiteRunner } from './components/TestSuiteRunner';
import { ReportViewer } from './components/ReportViewer';
import { DemoAcceptanceModal } from './components/DemoAcceptanceModal';
import { AuditLogModal } from './components/AuditLogModal';
import { ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('operations_lead');
  const [subView, setSubView] = useState<'tests' | 'report'>('tests');

  // Application Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);

  // Global Toast Banner
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch full state from backend
  const loadAllData = useCallback(async () => {
    try {
      const [v, d, del, st, logs] = await Promise.all([
        fetchVehicles(),
        fetchDrivers(),
        fetchDeliveries(),
        fetchStats(),
        fetchAuditLogs(),
      ]);
      setVehicles(v);
      setDrivers(d);
      setDeliveries(del);
      setStats(st);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load fleet data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Dispatch Assignment Action
  const handleAssign = async (deliveryId: string, vehicleId: string, driverId: string) => {
    try {
      const res = await assignDelivery(deliveryId, vehicleId, driverId, 'Dispatcher UI');
      showToast(res.message || `Successfully assigned ${vehicleId} & driver to ${deliveryId}`, 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Conflict detected! Assignment blocked.', 'error');
      await loadAllData();
      throw err; // rethrow for modal handling
    }
  };

  // Co-Delivery Multi-Stop Bundle Action
  const handleAssignBundle = async (deliveryIds: string[], vehicleId: string, driverId: string) => {
    try {
      const res = await assignBundle(deliveryIds, vehicleId, driverId, 'Dispatcher Co-Delivery');
      showToast(
        res.message || `Successfully assigned ${deliveryIds.length} nearby stops to ${vehicleId} & driver!`,
        'success'
      );
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create co-delivery bundle', 'error');
      await loadAllData();
      throw err;
    }
  };

  // Delivery Status Update Action (Part 2.3 & 1.3)
  const handleUpdateStatus = async (deliveryId: string, newStatus: DeliveryStatus) => {
    try {
      const res = await updateDeliveryStatus(deliveryId, newStatus, 'Operations UI');
      showToast(
        res.resources_released
          ? `Delivery ${deliveryId} is now ${newStatus}. Attached vehicle & driver were released back to available pool!`
          : `Delivery ${deliveryId} transitioned to ${newStatus}.`,
        'success'
      );
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Status transition rejected.', 'error');
      await loadAllData();
    }
  };

  // Create Delivery Action
  const handleCreateDelivery = async (data: Partial<Delivery>) => {
    try {
      await createDelivery(data);
      showToast('New delivery order registered in dispatch queue.', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create delivery.', 'error');
    }
  };

  // Create Vehicle Action
  const handleCreateVehicle = async (data: Partial<Vehicle>) => {
    try {
      await createVehicle(data);
      showToast(`Vehicle ${data.vehicle_id || data.registration_no} registered successfully.`, 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to register vehicle.', 'error');
      throw err;
    }
  };

  // Create Driver Action
  const handleCreateDriver = async (data: Partial<Driver>) => {
    try {
      await createDriver(data);
      showToast(`Driver ${data.name} onboarded to fleet roster.`, 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to onboard driver.', 'error');
      throw err;
    }
  };

  // Update Vehicle Status (Part 2.1)
  const handleUpdateVehicleStatus = async (id: string, status: Vehicle['status']) => {
    try {
      await updateVehicleStatus(id, status);
      showToast(`Vehicle ${id} status updated to ${status}.`, 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Cannot update vehicle status', 'error');
      await loadAllData();
      throw err;
    }
  };

  // Update Driver Status (Part 2.2)
  const handleUpdateDriverStatus = async (id: string, status: Driver['availability_status']) => {
    try {
      await updateDriverStatus(id, status);
      showToast(`Driver ${id} availability updated to ${status}.`, 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Cannot update driver status', 'error');
      await loadAllData();
      throw err;
    }
  };

  // Reset to initial seed dataset
  const handleResetSeed = async () => {
    try {
      await resetDemoData();
      showToast('System reset to clean test dataset.', 'info');
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenDemo={() => setIsDemoOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onResetData={handleResetSeed}
        onOpenNewDelivery={() => {}}
        blockedCount={stats?.blocked_conflicts_count || 0}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-medium border ${
              toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-700 text-rose-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-700 text-emerald-200'
                : 'bg-slate-900/95 border-cyan-700 text-cyan-200'
            }`}
          >
            {toast.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real-Time KPIs */}
        <KPIDashboard
          stats={stats}
          onFilterPending={() => setCurrentRole('dispatcher')}
          onFilterActive={() => setCurrentRole('operations_lead')}
        />

        {/* Core View Switcher */}
        {currentRole === 'dispatcher' && (
          <DispatcherBoard
            deliveries={deliveries}
            vehicles={vehicles}
            drivers={drivers}
            onAssign={handleAssign}
            onAssignBundle={handleAssignBundle}
            onUpdateStatus={handleUpdateStatus}
            onCreateDelivery={handleCreateDelivery}
          />
        )}

        {currentRole === 'fleet_manager' && (
          <FleetManagerView
            vehicles={vehicles}
            drivers={drivers}
            onUpdateVehicleStatus={handleUpdateVehicleStatus}
            onUpdateDriverStatus={handleUpdateDriverStatus}
            onCreateVehicle={handleCreateVehicle}
            onCreateDriver={handleCreateDriver}
          />
        )}

        {currentRole === 'operations_lead' && (
          <OperationsLiveMap
            deliveries={deliveries}
            vehicles={vehicles}
            drivers={drivers}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {currentRole === 'qa_tester' && (
          <div className="space-y-6">
            {/* Sub-Tabs between Test Matrix and REPORT.md */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl w-fit">
              <button
                onClick={() => setSubView('tests')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  subView === 'tests'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Part 5: Automated Edge-Case Suite (T1-T12)
              </button>
              <button
                onClick={() => setSubView('report')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  subView === 'report'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Part 8: Official Technical Report (REPORT.md)
              </button>
            </div>

            {subView === 'tests' ? (
              <TestSuiteRunner
                vehicles={vehicles}
                drivers={drivers}
                deliveries={deliveries}
                onRefreshData={loadAllData}
              />
            ) : (
              <ReportViewer />
            )}
          </div>
        )}
      </main>

      {/* Judges Demo Acceptance Walkthrough Modal */}
      <DemoAcceptanceModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onRefreshData={loadAllData}
      />

      {/* Audit Log Stream Modal */}
      <AuditLogModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
        logs={auditLogs}
      />
    </div>
  );
}
