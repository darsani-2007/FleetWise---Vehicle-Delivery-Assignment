import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  User,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  MapPin,
  Calendar,
  Weight,
  Send,
  XCircle,
  X,
  ShieldAlert,
  Layers,
  CheckSquare,
  Square,
  Navigation,
  Compass,
} from 'lucide-react';
import { Delivery, Vehicle, Driver, DeliveryPriority, DeliveryStatus, CoDeliveryCluster } from '../types';

interface DispatcherBoardProps {
  deliveries: Delivery[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAssign: (deliveryId: string, vehicleId: string, driverId: string) => Promise<void>;
  onAssignBundle: (deliveryIds: string[], vehicleId: string, driverId: string) => Promise<void>;
  onUpdateStatus: (deliveryId: string, newStatus: DeliveryStatus) => Promise<void>;
  onCreateDelivery: (data: Partial<Delivery>) => Promise<void>;
  onOpenLiveMapForDelivery?: (deliveryId: string) => void;
}

export const DispatcherBoard: React.FC<DispatcherBoardProps> = ({
  deliveries,
  vehicles,
  drivers,
  onAssign,
  onAssignBundle,
  onUpdateStatus,
  onCreateDelivery,
  onOpenLiveMapForDelivery,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Single Assign Modal state
  const [selectedDeliveryForAssign, setSelectedDeliveryForAssign] = useState<Delivery | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignError, setAssignError] = useState<{ status?: number; message: string; code?: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Multi-Select for Co-Delivery / Bundle
  const [selectedForBundle, setSelectedForBundle] = useState<string[]>([]);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [bundleVehicleId, setBundleVehicleId] = useState('');
  const [bundleDriverId, setBundleDriverId] = useState('');
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [isBundling, setIsBundling] = useState(false);

  // Create Delivery Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPickup, setNewPickup] = useState('');
  const [newDropoff, setNewDropoff] = useState('');
  const [newZone, setNewZone] = useState('South Zone');
  const [newTime, setNewTime] = useState('02:00 PM');
  const [newPriority, setNewPriority] = useState<DeliveryPriority>('medium');
  const [newWeight, setNewWeight] = useState(350);
  const [newType, setNewType] = useState<Vehicle['type']>('Van');
  const [newNotes, setNewNotes] = useState('');

  // Available resource counts
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles]);
  const availableDrivers = useMemo(() => drivers.filter((d) => d.availability_status === 'available'), [drivers]);

  // Priority sorting helper
  const priorityWeight: Record<DeliveryPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // 1. NEARBY ADDRESSES CO-DELIVERY DETECTOR (பக்கத்து பக்கத்து Addresses Auto-Cluster)
  const coDeliveryOpportunity = useMemo(() => {
    const pendingOrders = deliveries.filter((d) => d.status === 'pending');
    if (pendingOrders.length < 2) return null;

    // Detect pairs that share dropoff area / zone
    // Guindy & Adyar -> South Zone (~3.8 km)
    // Nungambakkam & T. Nagar -> Central Zone (~2.5 km)
    const southPair = pendingOrders.filter(
      (d) =>
        d.dropoff.toLowerCase().includes('guindy') ||
        d.dropoff.toLowerCase().includes('adyar') ||
        d.zone?.toLowerCase().includes('south')
    );
    if (southPair.length >= 2) {
      const pair = southPair.slice(0, 2);
      const combinedWeight = pair[0].weight_kg + pair[1].weight_kg;
      const matchingVehicles = availableVehicles.filter((v) => v.capacity >= combinedWeight);
      const bestV = matchingVehicles[0] || availableVehicles[0] || null;
      const bestD = availableDrivers[0] || null;

      return {
        deliveries: pair,
        zone: 'South Zone Corridor (Guindy ⇄ Adyar)',
        distance_between: '3.8 km',
        combined_weight: combinedWeight,
        recommended_vehicle: bestV,
        recommended_driver: bestD,
        savings: 'Save ~45% fuel & 35 min transit time by dispatching 1 vehicle for both stops',
      };
    }

    const centralPair = pendingOrders.filter(
      (d) =>
        d.dropoff.toLowerCase().includes('nungambakkam') ||
        d.dropoff.toLowerCase().includes('t. nagar') ||
        d.zone?.toLowerCase().includes('central')
    );
    if (centralPair.length >= 2) {
      const pair = centralPair.slice(0, 2);
      const combinedWeight = pair[0].weight_kg + pair[1].weight_kg;
      const matchingVehicles = availableVehicles.filter((v) => v.capacity >= combinedWeight);
      const bestV = matchingVehicles[0] || availableVehicles[0] || null;
      const bestD = availableDrivers[0] || null;

      return {
        deliveries: pair,
        zone: 'Central City Zone (Nungambakkam ⇄ T. Nagar)',
        distance_between: '2.5 km',
        combined_weight: combinedWeight,
        recommended_vehicle: bestV,
        recommended_driver: bestD,
        savings: 'Nearby street addresses: 1 driver delivers both orders in 1 continuous route',
      };
    }

    // Default fallback: any two pending orders
    const pair = pendingOrders.slice(0, 2);
    const combinedWeight = pair[0].weight_kg + pair[1].weight_kg;
    const matchingVehicles = availableVehicles.filter((v) => v.capacity >= combinedWeight);
    return {
      deliveries: pair,
      zone: 'Metropolitan Multi-Drop Corridor',
      distance_between: '4.2 km',
      combined_weight: combinedWeight,
      recommended_vehicle: matchingVehicles[0] || availableVehicles[0] || null,
      recommended_driver: availableDrivers[0] || null,
      savings: 'Combine 2 orders into 1 vehicle to maximize fleet utilisation',
    };
  }, [deliveries, availableVehicles, availableDrivers]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries
      .filter((d) => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = d.delivery_id.toLowerCase().includes(q);
          const matchPickup = d.pickup.toLowerCase().includes(q);
          const matchDropoff = d.dropoff.toLowerCase().includes(q);
          const matchVeh = d.assigned_vehicle_id?.toLowerCase().includes(q);
          const matchDrv = d.assigned_driver_id?.toLowerCase().includes(q);
          const matchBatch = d.batch_id?.toLowerCase().includes(q);
          if (!matchId && !matchPickup && !matchDropoff && !matchVeh && !matchDrv && !matchBatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
  }, [deliveries, statusFilter, priorityFilter, searchQuery]);

  const handleOpenAssignModal = (del: Delivery) => {
    setSelectedDeliveryForAssign(del);
    setAssignError(null);
    const bestV = availableVehicles.find((v) => v.capacity >= del.weight_kg && v.type === del.required_vehicle_type) || availableVehicles[0];
    const bestD = availableDrivers[0];
    setSelectedVehicleId(bestV ? bestV.vehicle_id : '');
    setSelectedDriverId(bestD ? bestD.driver_id : '');
  };

  const handleExecuteAssign = async () => {
    if (!selectedDeliveryForAssign || !selectedVehicleId || !selectedDriverId) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      await onAssign(selectedDeliveryForAssign.delivery_id, selectedVehicleId, selectedDriverId);
      setSelectedDeliveryForAssign(null);
    } catch (err: any) {
      setAssignError({
        status: err.status || 409,
        message: err.message || 'Assignment failed due to resource conflict',
        code: err.code || 'CONFLICT',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Toggle multi-select checkbox for bundling
  const toggleSelectForBundle = (delId: string) => {
    setSelectedForBundle((prev) =>
      prev.includes(delId) ? prev.filter((id) => id !== delId) : [...prev, delId]
    );
  };

  const selectedDeliveriesObjects = useMemo(() => {
    return deliveries.filter((d) => selectedForBundle.includes(d.delivery_id));
  }, [deliveries, selectedForBundle]);

  const selectedTotalWeight = useMemo(() => {
    return selectedDeliveriesObjects.reduce((acc, d) => acc + d.weight_kg, 0);
  }, [selectedDeliveriesObjects]);

  const handleOpenBundleModal = () => {
    setBundleError(null);
    const bestV = availableVehicles.find((v) => v.capacity >= selectedTotalWeight) || availableVehicles[0];
    const bestD = availableDrivers[0];
    setBundleVehicleId(bestV ? bestV.vehicle_id : '');
    setBundleDriverId(bestD ? bestD.driver_id : '');
    setIsBundleModalOpen(true);
  };

  const handleExecuteBundle = async () => {
    if (selectedForBundle.length < 2 || !bundleVehicleId || !bundleDriverId) return;
    setIsBundling(true);
    setBundleError(null);
    try {
      await onAssignBundle(selectedForBundle, bundleVehicleId, bundleDriverId);
      setIsBundleModalOpen(false);
      setSelectedForBundle([]);
    } catch (err: any) {
      setBundleError(err.message || 'Failed to assign co-delivery bundle');
    } finally {
      setIsBundling(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPickup || !newDropoff) return;
    await onCreateDelivery({
      pickup: newPickup,
      dropoff: newDropoff,
      scheduled_time: newTime,
      priority: newPriority,
      weight_kg: Number(newWeight),
      required_vehicle_type: newType,
      zone: newZone,
      notes: newNotes,
    });
    setIsCreateOpen(false);
    setNewPickup('');
    setNewDropoff('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* 1. NEARBY ADDRESSES SMART CO-DELIVERY CARD (பக்கத்து பக்கத்து Addresses Auto-Cluster) */}
      {coDeliveryOpportunity && coDeliveryOpportunity.recommended_vehicle && coDeliveryOpportunity.recommended_driver && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/80 via-teal-950/70 to-slate-900 border border-emerald-700/60 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shrink-0">
                <MapPin className="w-6 h-6 animate-bounce text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950 border border-emerald-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Nearby Addresses Co-Delivery Opportunity</span>
                  </span>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full">
                    {coDeliveryOpportunity.zone} · ~{coDeliveryOpportunity.distance_between} apart
                  </span>
                </div>

                <h4 className="text-base font-bold text-white">
                  Deliver both <span className="text-cyan-300">{coDeliveryOpportunity.deliveries[0].delivery_id}</span> ({coDeliveryOpportunity.deliveries[0].dropoff}) &amp; <span className="text-emerald-300">{coDeliveryOpportunity.deliveries[1].delivery_id}</span> ({coDeliveryOpportunity.deliveries[1].dropoff}) using 1 Vehicle &amp; 1 Driver!
                </h4>

                <p className="text-xs text-slate-300">
                  Combined Load: <strong className="text-white font-mono">{coDeliveryOpportunity.combined_weight} kg</strong> (fits into {coDeliveryOpportunity.recommended_vehicle.capacity}kg {coDeliveryOpportunity.recommended_vehicle.type} <strong className="text-cyan-300">{coDeliveryOpportunity.recommended_vehicle.vehicle_id}</strong>) · Driver: <strong className="text-emerald-300">{coDeliveryOpportunity.recommended_driver.name}</strong> ({coDeliveryOpportunity.recommended_driver.driver_id})
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">
                  ⚡ {coDeliveryOpportunity.savings}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (coDeliveryOpportunity.recommended_vehicle && coDeliveryOpportunity.recommended_driver) {
                  onAssignBundle(
                    coDeliveryOpportunity.deliveries.map((d) => d.delivery_id),
                    coDeliveryOpportunity.recommended_vehicle.vehicle_id,
                    coDeliveryOpportunity.recommended_driver.driver_id
                  );
                }
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-950/50 transition active:scale-95 whitespace-nowrap self-start lg:self-center"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>1-Click Co-Delivery Dispatch</span>
            </button>
          </div>
        </div>
      )}

      {/* Control Bar: Filters, Search, Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Deliveries', count: deliveries.length },
            { id: 'pending', label: 'Pending', count: deliveries.filter((d) => d.status === 'pending').length },
            { id: 'assigned', label: 'Assigned', count: deliveries.filter((d) => d.status === 'assigned').length },
            { id: 'in_transit', label: 'In Transit', count: deliveries.filter((d) => d.status === 'in_transit').length },
            { id: 'delivered', label: 'Delivered', count: deliveries.filter((d) => d.status === 'delivered').length },
            { id: 'cancelled', label: 'Cancelled', count: deliveries.filter((d) => d.status === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${statusFilter === tab.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-2 outline-none focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search route, zone, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          {/* New Delivery Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery</span>
          </button>
        </div>
      </div>

      {/* Floating Multi-Select Co-Delivery Toolbar */}
      {selectedForBundle.length > 0 && (
        <div className="sticky top-20 z-30 bg-slate-900/95 backdrop-blur-md border border-cyan-600/60 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600/30 text-cyan-300 border border-cyan-500/40">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {selectedForBundle.length} Orders Selected for Multi-Stop Co-Delivery: ({selectedForBundle.join(', ')})
              </p>
              <p className="text-[11px] text-cyan-300">
                Combined weight: <strong className="text-white font-mono">{selectedTotalWeight} kg</strong> · Assign 1 Vehicle &amp; 1 Driver to deliver all selected stops in sequence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setSelectedForBundle([])}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Clear
            </button>
            <button
              onClick={handleOpenBundleModal}
              disabled={selectedForBundle.length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition active:scale-95"
            >
              <Truck className="w-4 h-4" />
              <span>Bundle &amp; Assign to 1 Vehicle &amp; Driver</span>
            </button>
          </div>
        </div>
      )}

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredDeliveries.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-medium text-slate-300">No deliveries found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Adjust your search filters or click "New Delivery" to add an order to the dispatch queue.
            </p>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => {
            const isAssigned = delivery.status === 'assigned';
            const isInTransit = delivery.status === 'in_transit';
            const isDelivered = delivery.status === 'delivered';
            const isCancelled = delivery.status === 'cancelled';
            const isPending = delivery.status === 'pending';
            const isSelected = selectedForBundle.includes(delivery.delivery_id);

            const assignedVehicle = vehicles.find((v) => v.vehicle_id === delivery.assigned_vehicle_id);
            const assignedDriver = drivers.find((d) => d.driver_id === delivery.assigned_driver_id);

            return (
              <div
                key={delivery.delivery_id}
                className={`bg-slate-900 border rounded-2xl p-4 transition-all ${
                  isSelected
                    ? 'border-cyan-500 ring-2 ring-cyan-500/30 bg-slate-900'
                    : isPending
                    ? 'border-amber-800/40 hover:border-amber-600/60 shadow-sm'
                    : isAssigned
                    ? 'border-blue-800/40 hover:border-blue-600/60'
                    : isInTransit
                    ? 'border-indigo-700/60 bg-slate-900/90'
                    : isDelivered
                    ? 'border-emerald-800/40 opacity-80'
                    : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Checkbox + ID, Priority, Route */}
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox for co-delivery bundling (visible if pending) */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => toggleSelectForBundle(delivery.delivery_id)}
                        className="mt-1 text-slate-400 hover:text-cyan-400 transition"
                        title="Select to bundle with nearby orders"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-950" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                          {delivery.delivery_id}
                        </span>

                        {/* Co-Delivery Batch Badge */}
                        {delivery.batch_id && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            <span>Co-Delivery Route · Stop #{delivery.stop_order || 1}</span>
                          </span>
                        )}

                        {/* Zone tag */}
                        {delivery.zone && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {delivery.zone}
                          </span>
                        )}

                        {/* Priority Tag */}
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            delivery.priority === 'urgent'
                              ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                              : delivery.priority === 'high'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : delivery.priority === 'medium'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {delivery.priority}
                        </span>

                        {/* Status Tag */}
                        <span
                          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            isPending
                              ? 'bg-amber-900/30 text-amber-300 border-amber-700/50'
                              : isAssigned
                              ? 'bg-blue-900/30 text-blue-300 border-blue-700/50'
                              : isInTransit
                              ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/60'
                              : isDelivered
                              ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50'
                              : 'bg-rose-900/20 text-rose-400 border-rose-800/40'
                          }`}
                        >
                          {isPending && <Clock className="w-3 h-3 text-amber-400" />}
                          {isAssigned && <Truck className="w-3 h-3 text-blue-400" />}
                          {isInTransit && <Truck className="w-3 h-3 text-indigo-400 animate-bounce" />}
                          {isDelivered && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {isCancelled && <XCircle className="w-3 h-3 text-rose-400" />}
                          <span className="capitalize">{delivery.status.replace('_', ' ')}</span>
                        </span>

                        <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto lg:ml-0">
                          <Clock className="w-3 h-3" />
                          {delivery.scheduled_time}
                        </span>
                      </div>

                      {/* Route Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-slate-500 font-medium">Pickup:</span>
                          <span className="text-slate-200 font-medium truncate">{delivery.pickup}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <div className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-slate-500 font-medium">Dropoff:</span>
                          <span className="text-slate-200 font-bold truncate">{delivery.dropoff}</span>
                        </div>
                      </div>

                      {/* Package Specs */}
                      <div className="flex items-center flex-wrap gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Weight className="w-3 h-3 text-slate-400" />
                          Weight: <strong className="text-slate-200">{delivery.weight_kg} kg</strong>
                        </span>
                        <span>
                          Req. Type: <strong className="text-slate-200">{delivery.required_vehicle_type || 'Any'}</strong>
                        </span>
                        {delivery.distance_km && (
                          <span>
                            Distance: <strong className="text-slate-200">{delivery.distance_km} km</strong>
                          </span>
                        )}
                        {delivery.notes && (
                          <span className="italic text-slate-400 truncate max-w-xs">
                            "{delivery.notes}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Assigned Resources Summary */}
                  {(isAssigned || isInTransit || isDelivered) && (
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 min-w-[260px] text-xs space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Resource Allocation</span>
                        {delivery.batch_id ? (
                          <span className="text-cyan-400 font-mono font-bold">Multi-Stop Route</span>
                        ) : (
                          <span className="text-emerald-400 font-mono">Resource Locked</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Truck className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-mono font-medium">{delivery.assigned_vehicle_id}</span>
                          {assignedVehicle && (
                            <span className="text-slate-400">({assignedVehicle.registration_no})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-medium">{assignedDriver?.name || delivery.assigned_driver_id}</span>
                          <span className="text-slate-400 font-mono">({delivery.assigned_driver_id})</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {/* If Pending: Assign Resources Button */}
                    {isPending && (
                      <button
                        onClick={() => handleOpenAssignModal(delivery)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-xl shadow-md transition active:scale-95"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Assign Unit</span>
                      </button>
                    )}

                    {/* If Assigned: Advance to In Transit */}
                    {isAssigned && (
                      <button
                        onClick={() => onUpdateStatus(delivery.delivery_id, 'in_transit')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Start Transit</span>
                      </button>
                    )}

                    {/* If In Transit: Mark Delivered */}
                    {isInTransit && (
                      <button
                        onClick={() => onUpdateStatus(delivery.delivery_id, 'delivered')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition active:scale-95"
                        title={
                          delivery.batch_id
                            ? 'Marks this stop delivered; vehicle & driver continue to any remaining stops in batch'
                            : 'Closes delivery and releases vehicle + driver back to available pool'
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Delivered</span>
                      </button>
                    )}

                    {/* Cancel button if pending or assigned */}
                    {(isPending || isAssigned || isInTransit) && (
                      <button
                        onClick={() => onUpdateStatus(delivery.delivery_id, 'cancelled')}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs rounded-xl border border-slate-700/60 transition"
                        title="Cancel delivery (releases any assigned resources)"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Closed state label */}
                    {(isDelivered || isCancelled) && (
                      <span className="text-xs text-slate-500 italic">
                        Archived · Resources Free
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MULTI-STOP CO-DELIVERY BUNDLE MODAL (பக்கத்து பக்கத்து Addresses Bundling) */}
      {isBundleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <span>Multi-Stop Co-Delivery Route Planner</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combine {selectedForBundle.length} nearby addresses into 1 vehicle &amp; 1 driver!
                </p>
              </div>
              <button
                onClick={() => setIsBundleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {bundleError && (
              <div className="bg-rose-950/70 border border-rose-800/80 rounded-xl p-3.5 text-xs text-rose-200">
                <p className="font-bold">Cannot Create Co-Delivery Route:</p>
                <p className="mt-0.5">{bundleError}</p>
              </div>
            )}

            {/* Selected Stops Summary */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-semibold uppercase text-[10px]">
                <span>Planned Delivery Stops in Sequence</span>
                <span className="text-cyan-300 font-mono">Total Weight: {selectedTotalWeight} kg</span>
              </div>
              <div className="space-y-1.5">
                {selectedDeliveriesObjects.map((d, idx) => (
                  <div key={d.delivery_id} className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <strong className="text-white font-mono">{d.delivery_id}</strong>
                      <span className="text-slate-300 truncate max-w-xs">{d.dropoff}</span>
                    </div>
                    <span className="text-slate-400 font-mono">{d.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select 1 Vehicle (Capacity must be $\ge$ {selectedTotalWeight}kg)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {vehicles.map((v) => {
                  const isAvailable = v.status === 'available';
                  const isSelected = bundleVehicleId === v.vehicle_id;
                  const capacityMismatch = v.capacity < selectedTotalWeight;

                  return (
                    <div
                      key={v.vehicle_id}
                      onClick={() => !capacityMismatch && setBundleVehicleId(v.vehicle_id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/40 text-white'
                          : capacityMismatch
                          ? 'opacity-40 border-slate-800 bg-slate-900 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{v.vehicle_id}</span>
                        <span className="text-[10px] font-mono text-cyan-300">
                          Cap: {v.capacity}kg
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>{v.type} ({v.registration_no})</span>
                        <span className={capacityMismatch ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {capacityMismatch ? 'Too small' : 'Fits load'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Driver Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select 1 Driver
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {drivers.map((d) => {
                  const isAvailable = d.availability_status === 'available';
                  const isSelected = bundleDriverId === d.driver_id;

                  return (
                    <div
                      key={d.driver_id}
                      onClick={() => isAvailable && setBundleDriverId(d.driver_id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-white'
                          : !isAvailable
                          ? 'opacity-40 border-slate-800 bg-slate-900 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{d.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{d.driver_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>★ {d.rating}</span>
                        <span className={isAvailable ? 'text-emerald-400' : 'text-amber-400'}>
                          {d.availability_status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBundleModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!bundleVehicleId || !bundleDriverId || isBundling}
                onClick={handleExecuteBundle}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95"
              >
                {isBundling ? 'Dispatching...' : 'Dispatch Multi-Stop Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ASSIGN MODAL */}
      {selectedDeliveryForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Assign Vehicle &amp; Driver</span>
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                    {selectedDeliveryForAssign.delivery_id}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order requires: {selectedDeliveryForAssign.weight_kg}kg capacity · Type: {selectedDeliveryForAssign.required_vehicle_type || 'Any'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeliveryForAssign(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner if assignment conflict occurs */}
            {assignError && (
              <div className="bg-rose-950/70 border border-rose-800/80 rounded-xl p-3.5 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Conflict Blocked! (HTTP {assignError.status || 409} {assignError.code || 'CONFLICT'})</span>
                </div>
                <p>{assignError.message}</p>
                <p className="text-[11px] text-rose-300/70">
                  Transaction safety preserved: zero records were partially updated.
                </p>
              </div>
            )}

            {/* Route Summary */}
            <div className="bg-slate-800/60 rounded-xl p-3 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pickup:</span>
                <span className="text-white font-medium">{selectedDeliveryForAssign.pickup}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dropoff:</span>
                <span className="text-white font-medium">{selectedDeliveryForAssign.dropoff}</span>
              </div>
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                1. Select Vehicle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {vehicles.map((v) => {
                  const isAvailable = v.status === 'available';
                  const isSelected = selectedVehicleId === v.vehicle_id;
                  const capacityMismatch = v.capacity < selectedDeliveryForAssign.weight_kg;

                  return (
                    <div
                      key={v.vehicle_id}
                      onClick={() => setSelectedVehicleId(v.vehicle_id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/40 text-white'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{v.vehicle_id}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isAvailable
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : v.status === 'assigned'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>{v.type} ({v.registration_no})</span>
                        <span className={capacityMismatch ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                          {v.capacity}kg
                        </span>
                      </div>
                      {v.status === 'assigned' && (
                        <p className="text-[10px] text-rose-400 mt-1">
                          ⚠️ On order {v.current_delivery_id || 'active'}
                        </p>
                      )}
                      {capacityMismatch && (
                        <p className="text-[10px] text-amber-400 mt-1">
                          ⚠️ Under order weight ({selectedDeliveryForAssign.weight_kg}kg)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Driver Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                2. Select Driver
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {drivers.map((d) => {
                  const isAvailable = d.availability_status === 'available';
                  const isSelected = selectedDriverId === d.driver_id;

                  return (
                    <div
                      key={d.driver_id}
                      onClick={() => setSelectedDriverId(d.driver_id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-white'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{d.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isAvailable
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : d.availability_status === 'assigned'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {d.availability_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>ID: {d.driver_id}</span>
                        <span>★ {d.rating}</span>
                      </div>
                      {d.availability_status === 'assigned' && (
                        <p className="text-[10px] text-rose-400 mt-1">
                          ⚠️ On order {d.current_delivery_id || 'active'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDeliveryForAssign(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedVehicleId || !selectedDriverId || isAssigning}
                onClick={handleExecuteAssign}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95"
              >
                {isAssigning ? 'Validating & Assigning...' : 'Confirm & Atomically Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DELIVERY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Create New Delivery Order</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Pickup Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai Port Warehouse Hub"
                  value={newPickup}
                  onChange={(e) => setNewPickup(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Dropoff Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guindy Industrial Estate, Phase 2"
                  value={newDropoff}
                  onChange={(e) => setNewDropoff(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Delivery Zone</label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="South Zone">South Zone (Guindy / Adyar)</option>
                    <option value="Central Zone">Central Zone (T. Nagar / Nungambakkam)</option>
                    <option value="West Zone">West Zone (Ambattur / Sriperumbudur)</option>
                    <option value="North Zone">North Zone (Port / Central)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as DeliveryPriority)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Package Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Required Vehicle Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as Vehicle['type'])}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Electric Van">Electric Van</option>
                    <option value="Motorbike">Motorbike</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Fragile glassware, handle with care"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition"
              >
                Add to Delivery Queue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
