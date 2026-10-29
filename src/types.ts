export type VehicleType = 'Bike' | 'Motorbike' | 'Electric Bike' | 'Van' | 'Truck' | 'Electric Van';
export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'inactive';

export interface Vehicle {
  vehicle_id: string;
  registration_no: string;
  type: VehicleType;
  capacity: number; // in kg
  status: VehicleStatus;
  current_delivery_id?: string | null;
  current_delivery_ids?: string[];
  current_batch_id?: string | null;
  fuel_level?: number; // 0-100%
  model?: string;
  is_emergency_reserve?: boolean; // Dedicated Emergency / Rapid Response Unit
  emergency_unit_type?: 'emergency_bike' | 'emergency_van' | 'none';
  emergency_equipment?: string[];
}

export type DriverStatus = 'available' | 'assigned' | 'unavailable';

export interface Driver {
  driver_id: string;
  name: string;
  phone: string;
  availability_status: DriverStatus;
  current_delivery_id?: string | null;
  current_delivery_ids?: string[];
  current_batch_id?: string | null;
  license_type?: string;
  rating?: number;
  experience_years?: number;
  is_emergency_certified?: boolean; // Trained for rapid emergency dispatch
}

export type DeliveryPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DeliveryStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

export interface Delivery {
  delivery_id: string;
  pickup: string;
  dropoff: string;
  scheduled_time: string;
  priority: DeliveryPriority;
  status: DeliveryStatus;
  weight_kg: number;
  required_vehicle_type?: VehicleType;
  assigned_vehicle_id?: string | null;
  assigned_driver_id?: string | null;
  assigned_at?: string | null;
  completed_at?: string | null;
  notes?: string;
  distance_km?: number;
  batch_id?: string | null;
  stop_order?: number;
  zone?: string;
  // Recipient / Customer & Scheduled details (person who receives the order)
  recipient_name?: string;
  recipient_phone?: string;
  delivery_date?: string;
  recipient_address?: string;
  is_emergency?: boolean; // SOS / Emergency delivery order
  emergency_type?: string;
}

export interface MultiStopBatch {
  batch_id: string;
  vehicle_id: string;
  driver_id: string;
  delivery_ids: string[];
  total_weight_kg: number;
  status: 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  created_at: string;
  stops: Array<{
    delivery_id: string;
    stop_number: number;
    pickup: string;
    dropoff: string;
    status: DeliveryStatus;
    weight_kg: number;
  }>;
}

export interface CoDeliveryCluster {
  cluster_id: string;
  zone: string;
  delivery_ids: string[];
  deliveries: Delivery[];
  total_weight_kg: number;
  estimated_distance_between_km: number;
  recommended_vehicle_type: VehicleType;
  savings_estimate: string;
}

export type AssignmentStatus = 'active' | 'completed' | 'cancelled';

export interface Assignment {
  assignment_id: string;
  delivery_id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_at: string;
  released_at?: string | null;
  status: AssignmentStatus;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'ASSIGN_SUCCESS' | 'CONFLICT_BLOCKED' | 'STATUS_CHANGE' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET_DEMO' | 'TEST_RUN';
  entity_type: 'delivery' | 'vehicle' | 'driver' | 'assignment' | 'system';
  entity_id: string;
  details: string;
  actor: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export interface TestCaseResult {
  id: string;
  name: string;
  action: string;
  expected_result: string;
  observed_result?: string;
  http_status?: number;
  status: 'passed' | 'failed' | 'not_run';
  run_at?: string;
  payload?: any;
  response?: any;
  duration_ms?: number;
}

export type UserRole = 'dispatcher' | 'fleet_manager' | 'operations_lead' | 'qa_tester';
