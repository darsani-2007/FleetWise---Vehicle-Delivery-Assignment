import React, { useState } from 'react';
import {
  Truck,
  Users,
  Plus,
  Wrench,
  AlertOctagon,
  CheckCircle,
  Phone,
  Award,
  Fuel,
  X,
  AlertTriangle,
  ShieldAlert,
  Search,
  Bike,
  Activity,
  Flame,
  Zap,
} from 'lucide-react';
import { Vehicle, Driver, VehicleType } from '../types';

interface FleetManagerViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onUpdateVehicleStatus: (id: string, status: Vehicle['status']) => Promise<void>;
  onUpdateDriverStatus: (id: string, status: Driver['availability_status']) => Promise<void>;
  onCreateVehicle: (data: Partial<Vehicle>) => Promise<void>;
  onCreateDriver: (data: Partial<Driver>) => Promise<void>;
}

export const FleetManagerView: React.FC<FleetManagerViewProps> = ({
  vehicles,
  drivers,
  onUpdateVehicleStatus,
  onUpdateDriverStatus,
  onCreateVehicle,
  onCreateDriver,
}) => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [fleetFilterCategory, setFleetFilterCategory] = useState<'all' | 'emergency' | 'bikes' | 'vans_trucks'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Vehicle Form State
  const [vId, setVId] = useState('');
  const [vReg, setVReg] = useState('');
  const [vType, setVType] = useState<VehicleType>('Bike');
  const [vCap, setVCap] = useState(35);
  const [vModel, setVModel] = useState('');
  const [vIsEmergency, setVIsEmergency] = useState(false);
  const [vEmergencyUnitType, setVEmergencyUnitType] = useState<'emergency_bike' | 'emergency_van'>('emergency_bike');
  const [vEquipment, setVEquipment] = useState<string[]>(['First-Aid Trauma Kit', 'Rapid Siren/Strobe']);

  // New Driver Form State
  const [dId, setDId] = useState('');
  const [dName, setDName] = useState('');
  const [dPhone, setDPhone] = useState('+91 9840');
  const [dLicense, setDLicense] = useState('Two-Wheeler / Express Dispatch');
  const [dIsEmergency, setDIsEmergency] = useState(false);

  // Handle vehicle status mutation with error handling (Part 2.1)
  const handleVehicleStatusChange = async (vehicle: Vehicle, newStatus: Vehicle['status']) => {
    setActionError(null);
    try {
      await onUpdateVehicleStatus(vehicle.vehicle_id, newStatus);
    } catch (err: any) {
      setActionError(err.message || 'Cannot change vehicle status');
    }
  };

  // Handle driver status mutation with error handling (Part 2.2)
  const handleDriverStatusChange = async (driver: Driver, newStatus: Driver['availability_status']) => {
    setActionError(null);
    try {
      await onUpdateDriverStatus(driver.driver_id, newStatus);
    } catch (err: any) {
      setActionError(err.message || 'Cannot change driver availability');
    }
  };

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await onCreateVehicle({
        vehicle_id: vId || (vIsEmergency ? (vType.toLowerCase().includes('bike') ? 'V-EMG-B' : 'V-EMG-V') + (vehicles.length + 1) : 'V-' + (100 + vehicles.length + 1)),
        registration_no: vReg,
        type: vType,
        capacity: Number(vCap),
        model: vModel || `${vType} ${vIsEmergency ? 'Rapid Emergency Edition' : 'Standard'}`,
        status: 'available',
        is_emergency_reserve: vIsEmergency,
        emergency_unit_type: vIsEmergency ? vEmergencyUnitType : 'none',
        emergency_equipment: vIsEmergency ? vEquipment : [],
      });
      setIsAddVehicleOpen(false);
      setVId('');
      setVReg('');
      setVModel('');
      setVIsEmergency(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add vehicle');
    }
  };

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await onCreateDriver({
        driver_id: dId || (dIsEmergency ? 'DR-EMG-0' : 'DR-0') + (drivers.length + 1),
        name: dName,
        phone: dPhone,
        license_type: dLicense,
        availability_status: 'available',
        is_emergency_certified: dIsEmergency,
      });
      setIsAddDriverOpen(false);
      setDId('');
      setDName('');
      setDPhone('+91 9840');
      setDIsEmergency(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add driver');
    }
  };

  const emergencyVehiclesCount = vehicles.filter((v) => v.is_emergency_reserve).length;
  const bikesCount = vehicles.filter((v) => v.type === 'Bike' || v.type === 'Motorbike' || v.type === 'Electric Bike').length;

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (fleetFilterCategory === 'emergency' && !v.is_emergency_reserve) return false;
    if (fleetFilterCategory === 'bikes') {
      const isBike = v.type === 'Bike' || v.type === 'Motorbike' || v.type === 'Electric Bike';
      if (!isBike) return false;
    }
    if (fleetFilterCategory === 'vans_trucks') {
      const isVanOrTruck = v.type === 'Van' || v.type === 'Truck' || v.type === 'Electric Van';
      if (!isVanOrTruck) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.vehicle_id.toLowerCase().includes(q) ||
        v.registration_no.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        (v.model && v.model.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredDrivers = drivers.filter((d) => {
    if (statusFilter !== 'all' && d.availability_status !== statusFilter) return false;
    if (fleetFilterCategory === 'emergency' && !d.is_emergency_certified) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.driver_id.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        (d.license_type && d.license_type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Blocked Operations */}
      {actionError && (
        <div className="bg-rose-950/80 border border-rose-800 rounded-2xl p-4 flex items-start justify-between text-rose-200 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-300">Operational Rule Enforced</p>
              <p className="mt-0.5">{actionError}</p>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="p-1 hover:bg-rose-900/60 rounded text-rose-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('vehicles');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'vehicles'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Vehicles &amp; Bikes ({vehicles.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('drivers');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'drivers'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Drivers Roster ({drivers.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'vehicles' ? 'Search vehicle or bike...' : 'Search driver...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl pl-8 pr-3 py-2 outline-none focus:border-blue-500 w-44"
            />
          </div>

          {activeTab === 'vehicles' ? (
            <button
              onClick={() => {
                setVType('Bike');
                setVCap(35);
                setVIsEmergency(false);
                setIsAddVehicleOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle / Bike</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Driver</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet Classification Filter Bar (Dedicated Emergency & Bike Categorization) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <span className="text-xs text-slate-400 font-semibold px-2 uppercase text-[10px] tracking-wider">
          Filter Fleet:
        </span>
        <button
          onClick={() => setFleetFilterCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            fleetFilterCategory === 'all'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
          }`}
        >
          All Fleet ({activeTab === 'vehicles' ? vehicles.length : drivers.length})
        </button>

        <button
          onClick={() => setFleetFilterCategory('emergency')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            fleetFilterCategory === 'emergency'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
              : 'text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60'
          }`}
        >
          <span>🚨 Dedicated Emergency Units</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-200 text-[10px] border border-rose-700">
            {activeTab === 'vehicles' ? emergencyVehiclesCount : drivers.filter((d) => d.is_emergency_certified).length}
          </span>
        </button>

        <button
          onClick={() => setFleetFilterCategory('bikes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            fleetFilterCategory === 'bikes'
              ? 'bg-amber-600 text-white shadow'
              : 'text-amber-300 bg-amber-950/50 hover:bg-amber-900/50 border border-amber-800/60'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Bikes &amp; Two-Wheelers ({bikesCount})</span>
        </button>

        <button
          onClick={() => setFleetFilterCategory('vans_trucks')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            fleetFilterCategory === 'vans_trucks'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
          }`}
        >
          Vans &amp; Heavy Trucks ({vehicles.length - bikesCount})
        </button>
      </div>

      {/* VEHICLES SECTION */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const isAssigned = vehicle.status === 'assigned';
            const isAvailable = vehicle.status === 'available';
            const isMaintenance = vehicle.status === 'maintenance';
            const isInactive = vehicle.status === 'inactive';

            return (
              <div
                key={vehicle.vehicle_id}
                className={`border rounded-2xl p-4 transition ${
                  vehicle.is_emergency_reserve
                    ? 'border-rose-700/80 bg-gradient-to-b from-rose-950/30 via-slate-900 to-slate-900 shadow-md ring-1 ring-rose-500/20'
                    : isAssigned
                    ? 'border-blue-800/60 bg-slate-900/90'
                    : isAvailable
                    ? 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    : 'border-amber-900/40 bg-slate-950/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold text-white flex items-center gap-1.5">
                        {(vehicle.type === 'Bike' || vehicle.type === 'Motorbike' || vehicle.type === 'Electric Bike') && <Bike className="w-4 h-4 text-amber-400" />}
                        {!(vehicle.type === 'Bike' || vehicle.type === 'Motorbike' || vehicle.type === 'Electric Bike') && <Truck className="w-4 h-4 text-cyan-400" />}
                        {vehicle.vehicle_id}
                      </span>
                      {vehicle.is_emergency_reserve && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-400 fill-current animate-pulse" />
                          <span>Emergency Unit</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : isAssigned
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : isMaintenance
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {vehicle.registration_no}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                    {vehicle.type}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Load Capacity:</span>
                    <strong className="text-white">{vehicle.capacity} kg</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Model:</span>
                    <span className="text-slate-300">{vehicle.model || 'Commercial Fleet'}</span>
                  </div>
                  {vehicle.fuel_level !== undefined && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-cyan-400" /> Fuel / Charge:
                      </span>
                      <span className="text-slate-200 font-mono">{vehicle.fuel_level}%</span>
                    </div>
                  )}

                  {vehicle.is_emergency_reserve && vehicle.emergency_equipment && vehicle.emergency_equipment.length > 0 && (
                    <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-2 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-rose-300 block">
                        Equipment:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.emergency_equipment.map((eq, i) => (
                          <span key={i} className="text-[10px] bg-rose-900/40 text-rose-200 px-1.5 py-0.2 rounded border border-rose-800/50">
                            ✓ {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isAssigned && (
                    <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg p-2 text-[11px] text-blue-300">
                      🔒 Active Delivery: <strong>{vehicle.current_delivery_id}</strong>
                    </div>
                  )}
                </div>

                {/* State Machine Action Buttons (Part 2.1) */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-1.5 text-xs">
                  {isAvailable && (
                    <button
                      onClick={() => handleVehicleStatusChange(vehicle, 'maintenance')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 text-slate-400 transition"
                      title="Send to Maintenance (allowed only if no active delivery)"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Maintenance</span>
                    </button>
                  )}

                  {(isMaintenance || isInactive) && (
                    <button
                      onClick={() => handleVehicleStatusChange(vehicle, 'available')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Available</span>
                    </button>
                  )}

                  {isAssigned && (
                    <span className="text-[11px] text-slate-500 italic">
                      Locked to delivery
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRIVERS SECTION */}
      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const isAssigned = driver.availability_status === 'assigned';
            const isAvailable = driver.availability_status === 'available';
            const isUnavailable = driver.availability_status === 'unavailable';

            return (
              <div
                key={driver.driver_id}
                className={`bg-slate-900 border rounded-2xl p-4 transition ${
                  isAssigned
                    ? 'border-blue-800/60 bg-slate-900/90'
                    : isAvailable
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-amber-900/40 bg-slate-950/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{driver.name}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : isAssigned
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {driver.availability_status}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      ID: {driver.driver_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-950/50 border border-amber-800 px-2 py-0.5 rounded-lg">
                    ★ {driver.rating || 5.0}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" /> Phone:
                    </span>
                    <span className="text-slate-200 font-mono">{driver.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-emerald-400" /> License:
                    </span>
                    <span className="text-slate-300 truncate max-w-[150px]">{driver.license_type || 'Commercial'}</span>
                  </div>

                  {isAssigned && (
                    <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg p-2 text-[11px] text-blue-300">
                      🔒 On Route: <strong>{driver.current_delivery_id}</strong>
                    </div>
                  )}
                </div>

                {/* State Machine Action Buttons (Part 2.2) */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-1.5 text-xs">
                  {isAvailable && (
                    <button
                      onClick={() => handleDriverStatusChange(driver, 'unavailable')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 text-slate-400 transition"
                      title="Set unavailable (blocked if on active delivery)"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Set Unavailable</span>
                    </button>
                  )}

                  {isUnavailable && (
                    <button
                      onClick={() => handleDriverStatusChange(driver, 'available')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Available</span>
                    </button>
                  )}

                  {isAssigned && (
                    <span className="text-[11px] text-slate-500 italic">
                      Locked to delivery
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD VEHICLE MODAL */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleAddVehicleSubmit}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <span>Register New Fleet Vehicle</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Vehicle ID</label>
                <input
                  type="text"
                  placeholder="e.g. V-107 (leave blank for auto)"
                  value={vId}
                  onChange={(e) => setVId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Registration Number * (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TN-07-JK-7890"
                  value={vReg}
                  onChange={(e) => setVReg(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Type</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as VehicleType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Electric Van">Electric Van</option>
                    <option value="Motorbike">Motorbike</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Capacity (kg) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={vCap}
                    onChange={(e) => setVCap(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Model Details</label>
                <input
                  type="text"
                  placeholder="e.g. Isuzu D-Max Commercial"
                  value={vModel}
                  onChange={(e) => setVModel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition"
              >
                Register Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD DRIVER MODAL */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleAddDriverSubmit}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Onboard New Driver</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDriverOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Driver ID</label>
                <input
                  type="text"
                  placeholder="e.g. DR-006 (leave blank for auto)"
                  value={dId}
                  onChange={(e) => setDId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kannan"
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={dPhone}
                  onChange={(e) => setDPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">License / Category</label>
                <input
                  type="text"
                  value={dLicense}
                  onChange={(e) => setDLicense(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddDriverOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition"
              >
                Onboard Driver
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
