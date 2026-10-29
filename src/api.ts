import {
  Vehicle,
  Driver,
  Delivery,
  Assignment,
  AuditLog,
  TestCaseResult,
} from './types';

export interface FleetStats {
  total_vehicles: number;
  available_vehicles: number;
  assigned_vehicles: number;
  maintenance_vehicles: number;
  total_drivers: number;
  available_drivers: number;
  assigned_drivers: number;
  total_deliveries: number;
  pending_deliveries: number;
  in_transit_deliveries: number;
  delivered_deliveries: number;
  active_deliveries: number;
  fleet_utilisation_pct: number;
  blocked_conflicts_count: number;
  total_bikes?: number;
  emergency_vehicles_count?: number;
  emergency_bikes_count?: number;
  emergency_deliveries_count?: number;
}

export async function fetchHealth() {
  const res = await fetch('/api/health');
  return res.json();
}

export async function fetchStats(): Promise<FleetStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const res = await fetch('/api/vehicles');
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}

export async function createVehicle(data: Partial<Vehicle>) {
  const res = await fetch('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || 'Failed to create vehicle');
  return json;
}

export async function updateVehicleStatus(id: string, status: Vehicle['status']) {
  const res = await fetch(`/api/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || 'Failed to update vehicle');
  return json;
}

export async function fetchDrivers(): Promise<Driver[]> {
  const res = await fetch('/api/drivers');
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}

export async function createDriver(data: Partial<Driver>) {
  const res = await fetch('/api/drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || 'Failed to create driver');
  return json;
}

export async function updateDriverStatus(id: string, availability_status: Driver['availability_status']) {
  const res = await fetch(`/api/drivers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability_status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || 'Failed to update driver');
  return json;
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const res = await fetch('/api/deliveries');
  if (!res.ok) throw new Error('Failed to fetch deliveries');
  return res.json();
}

export async function createDelivery(data: Partial<Delivery>) {
  const res = await fetch('/api/deliveries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.error || 'Failed to create delivery');
  return json;
}

export async function assignDelivery(deliveryId: string, vehicleId: string, driverId: string, actor = 'Dispatcher') {
  const res = await fetch(`/api/deliveries/${deliveryId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      driver_id: driverId,
      actor,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.message || json.error || 'Assignment conflict');
    error.status = res.status;
    error.code = json.error;
    throw error;
  }
  return json;
}

export async function assignBundle(deliveryIds: string[], vehicleId: string, driverId: string, actor = 'Dispatcher') {
  const res = await fetch('/api/deliveries/bundle-assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      delivery_ids: deliveryIds,
      vehicle_id: vehicleId,
      driver_id: driverId,
      actor,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.message || json.error || 'Bundle assignment conflict');
    error.status = res.status;
    error.code = json.error;
    throw error;
  }
  return json;
}

export async function fetchCoDeliverySuggestions(): Promise<any[]> {
  const res = await fetch('/api/deliveries/co-delivery-suggestions');
  if (!res.ok) throw new Error('Failed to fetch co-delivery suggestions');
  return res.json();
}

export async function fetchBatches(): Promise<any[]> {
  const res = await fetch('/api/deliveries/batches');
  if (!res.ok) throw new Error('Failed to fetch batches');
  return res.json();
}

export async function updateDeliveryStatus(deliveryId: string, status: Delivery['status'], actor = 'Dispatcher') {
  const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, actor }),
  });
  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.message || json.error || 'Status update failed');
    error.status = res.status;
    error.code = json.error;
    throw error;
  }
  return json;
}

export async function fetchAssignments(): Promise<Assignment[]> {
  const res = await fetch('/api/assignments');
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch('/api/audit-logs');
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function resetDemoData() {
  const res = await fetch('/api/seed', { method: 'POST' });
  return res.json();
}

export async function runSingleTest(testId: string): Promise<TestCaseResult> {
  const res = await fetch('/api/tests/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_id: testId }),
  });
  return res.json();
}

export async function runAllTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  all_passed: boolean;
  results: TestCaseResult[];
}> {
  const res = await fetch('/api/tests/run-all', { method: 'POST' });
  return res.json();
}
