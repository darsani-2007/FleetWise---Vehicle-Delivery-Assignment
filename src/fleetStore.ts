import {
  Vehicle,
  Driver,
  Delivery,
  Assignment,
  AuditLog,
  TestCaseResult,
  MultiStopBatch,
  CoDeliveryCluster,
} from './types';

// Mutex lock to simulate true database transaction concurrency isolation
class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) next();
        });
      };

      if (!this.locked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

export class FleetStore {
  private vehicles: Map<string, Vehicle> = new Map();
  private drivers: Map<string, Driver> = new Map();
  private deliveries: Map<string, Delivery> = new Map();
  private assignments: Map<string, Assignment> = new Map();
  private batches: Map<string, MultiStopBatch> = new Map();
  private auditLogs: AuditLog[] = [];
  private assignmentMutex = new Mutex();
  private blockedConflictsCount = 0;

  constructor() {
    this.seedInitialData();
  }

  public getBlockedConflictsCount(): number {
    return this.blockedConflictsCount;
  }

  public seedInitialData() {
    this.vehicles.clear();
    this.drivers.clear();
    this.deliveries.clear();
    this.assignments.clear();
    this.batches.clear();
    this.auditLogs = [];
    this.blockedConflictsCount = 0;

    // Initial Vehicles matching handout & logistics scenarios
    const initialVehicles: Vehicle[] = [
      {
        vehicle_id: 'V-101',
        registration_no: 'TN-01-AB-1001',
        type: 'Van',
        capacity: 1200,
        status: 'available',
        fuel_level: 95,
        model: 'Ford Transit 350',
        is_emergency_reserve: false,
      },
      {
        vehicle_id: 'V-102',
        registration_no: 'TN-01-AB-1002',
        type: 'Truck',
        capacity: 3500,
        status: 'available',
        fuel_level: 80,
        model: 'Isuzu NPR HD',
        is_emergency_reserve: false,
      },
      {
        vehicle_id: 'V-103',
        registration_no: 'TN-02-CD-2003',
        type: 'Electric Van',
        capacity: 900,
        status: 'assigned',
        current_delivery_id: 'D-200',
        fuel_level: 88,
        model: 'Rivian EDV 700',
        is_emergency_reserve: false,
      },
      {
        vehicle_id: 'V-104',
        registration_no: 'TN-03-EF-3004',
        type: 'Van',
        capacity: 1500,
        status: 'maintenance',
        fuel_level: 40,
        model: 'Mercedes Sprinter',
        is_emergency_reserve: false,
      },
      {
        vehicle_id: 'V-105',
        registration_no: 'TN-04-GH-4005',
        type: 'Bike',
        capacity: 45,
        status: 'available',
        fuel_level: 90,
        model: 'Honda Cargo 160 (City Bike)',
        is_emergency_reserve: false,
      },
      {
        vehicle_id: 'V-106',
        registration_no: 'TN-05-IJ-5006',
        type: 'Truck',
        capacity: 5000,
        status: 'inactive',
        fuel_level: 10,
        model: 'Tata Ultra T.7',
        is_emergency_reserve: false,
      },
      {
        vehicle_id: 'V-107',
        registration_no: 'TN-06-KL-7007',
        type: 'Bike',
        capacity: 40,
        status: 'available',
        fuel_level: 85,
        model: 'Bajaj Pulsar 150 Cargo Bike',
        is_emergency_reserve: false,
      },
      // Dedicated Emergency Vehicles & Emergency Bikes (அவசர பிரிவு)
      {
        vehicle_id: 'V-EMG-01',
        registration_no: 'TN-09-EM-1101',
        type: 'Bike',
        capacity: 35,
        status: 'available',
        fuel_level: 100,
        model: 'Yamaha FZ-X Rapid SOS Emergency Bike',
        is_emergency_reserve: true,
        emergency_unit_type: 'emergency_bike',
        emergency_equipment: ['First-Aid Trauma Kit', 'Insulated Blood & Vaccine Box', 'Rapid Siren/Strobe', 'Live Telemetry Beacon'],
      },
      {
        vehicle_id: 'V-EMG-02',
        registration_no: 'TN-09-EM-1102',
        type: 'Electric Bike',
        capacity: 30,
        status: 'available',
        fuel_level: 98,
        model: 'Ather 450X SOS Rapid Response Bike',
        is_emergency_reserve: true,
        emergency_unit_type: 'emergency_bike',
        emergency_equipment: ['Portable Defibrillator Pack', 'Thermal Specimen Case', 'High-Intensity Strobe Beacon'],
      },
      {
        vehicle_id: 'V-EMG-03',
        registration_no: 'TN-09-EM-2201',
        type: 'Electric Van',
        capacity: 1300,
        status: 'available',
        fuel_level: 95,
        model: 'Force Urbania SOS Medical & Oxygen Vehicle',
        is_emergency_reserve: true,
        emergency_unit_type: 'emergency_van',
        emergency_equipment: ['Oxygen Cylinders & Ventilator Mount', 'Critical Care Perishables Fridge', 'Emergency Siren Beacon'],
      },
    ];

    // Initial Drivers
    const initialDrivers: Driver[] = [
      {
        driver_id: 'DR-001',
        name: 'Arun Kumar',
        phone: '+91 98401 23456',
        availability_status: 'available',
        license_type: 'Heavy Transport (HTV)',
        rating: 4.9,
        experience_years: 7,
        is_emergency_certified: false,
      },
      {
        driver_id: 'DR-002',
        name: 'Suresh Rajan',
        phone: '+91 98402 34567',
        availability_status: 'available',
        license_type: 'Light Motor Vehicle (LMV)',
        rating: 4.8,
        experience_years: 4,
        is_emergency_certified: false,
      },
      {
        driver_id: 'DR-003',
        name: 'Meena Natarajan',
        phone: '+91 98403 45678',
        availability_status: 'assigned',
        current_delivery_id: 'D-200',
        license_type: 'Commercial EV (LMV-EV)',
        rating: 5.0,
        experience_years: 5,
        is_emergency_certified: false,
      },
      {
        driver_id: 'DR-004',
        name: 'Venkatesh Prasad',
        phone: '+91 98404 56789',
        availability_status: 'unavailable',
        license_type: 'HTV Heavy Goods',
        rating: 4.6,
        experience_years: 9,
        is_emergency_certified: false,
      },
      {
        driver_id: 'DR-005',
        name: 'Praveen Chandran',
        phone: '+91 98405 67890',
        availability_status: 'available',
        license_type: 'Two-Wheeler / Express Dispatch',
        rating: 4.7,
        experience_years: 3,
        is_emergency_certified: false,
      },
      // Dedicated Emergency Dispatch Drivers
      {
        driver_id: 'DR-EMG-01',
        name: 'Karthik Selvam',
        phone: '+91 98406 11223',
        availability_status: 'available',
        license_type: 'Rapid SOS Emergency Bike Specialist',
        rating: 4.95,
        experience_years: 6,
        is_emergency_certified: true,
      },
      {
        driver_id: 'DR-EMG-02',
        name: 'Dr. S. Vignesh (Paramedic Driver)',
        phone: '+91 98407 33445',
        availability_status: 'available',
        license_type: 'Emergency Medical Vehicle Pilot',
        rating: 5.0,
        experience_years: 8,
        is_emergency_certified: true,
      },
    ];

    // Initial Deliveries with recipient person details, date, time & phone number
    const initialDeliveries: Delivery[] = [
      {
        delivery_id: 'D-200',
        pickup: 'T. Nagar Retail Central Warehouse',
        dropoff: 'Adyar Express Fulfilment Hub',
        recipient_name: 'Dr. Rajeshwar Rao',
        recipient_phone: '+91 98401 99882',
        delivery_date: '2026-10-29',
        scheduled_time: '10:00 AM',
        priority: 'high',
        status: 'in_transit',
        weight_kg: 280,
        required_vehicle_type: 'Electric Van',
        distance_km: 9.2,
        zone: 'South Zone',
        assigned_vehicle_id: 'V-103',
        assigned_driver_id: 'DR-003',
        assigned_at: new Date().toISOString(),
        notes: 'Priority eco-route delivery live on road',
        recipient_address: 'Adyar Express Fulfilment Hub, Block C, Chennai',
        is_emergency: false,
      },
      {
        delivery_id: 'D-201',
        pickup: 'Chennai Port Container Freight Hub',
        dropoff: 'Guindy Industrial Estate, Phase 2',
        recipient_name: 'Kavitha Ramanathan',
        recipient_phone: '+91 98402 77651',
        delivery_date: '2026-10-29',
        scheduled_time: '10:30 AM',
        priority: 'urgent',
        status: 'pending',
        weight_kg: 450,
        required_vehicle_type: 'Van',
        distance_km: 18.5,
        zone: 'South Zone',
        notes: 'Cold chain perishable goods - priority handling',
        recipient_address: 'Guindy Industrial Estate, Phase 2, Lab 4',
        is_emergency: true,
        emergency_type: 'Perishable Cold-Chain Critical Biologicals',
      },
      {
        delivery_id: 'D-202',
        pickup: 'Sriperumbudur Manufacturing Facility',
        dropoff: 'Ambattur Industrial Logistics Park',
        recipient_name: 'M. Saravanan',
        recipient_phone: '+91 98403 66540',
        delivery_date: '2026-10-29',
        scheduled_time: '11:45 AM',
        priority: 'high',
        status: 'pending',
        weight_kg: 2400,
        required_vehicle_type: 'Truck',
        distance_km: 34.0,
        zone: 'West Zone',
        notes: 'Automotive sub-assemblies crate on pallet',
        recipient_address: 'Ambattur Industrial Logistics Park, Bay 12',
        is_emergency: false,
      },
      {
        delivery_id: 'D-203',
        pickup: 'T. Nagar Retail Central Warehouse',
        dropoff: 'Adyar Express Fulfilment Hub (Near Guindy)',
        recipient_name: 'Ananya Krishnan',
        recipient_phone: '+91 98408 88123',
        delivery_date: '2026-10-29',
        scheduled_time: '01:15 PM',
        priority: 'medium',
        status: 'pending',
        weight_kg: 320,
        required_vehicle_type: 'Van',
        distance_km: 9.2,
        zone: 'South Zone',
        notes: 'Adjacent to Guindy (3.8 km away) - ideal for co-delivery bundle',
        recipient_address: 'Adyar Express Fulfilment Hub, Unit 4B',
        is_emergency: false,
      },
      {
        delivery_id: 'D-204',
        pickup: 'Central Railway Parcels Office',
        dropoff: 'Nungambakkam Corporate Headquarters',
        recipient_name: 'Advocate K. Sundaram',
        recipient_phone: '+91 98404 55430',
        delivery_date: '2026-10-29',
        scheduled_time: '02:30 PM',
        priority: 'low',
        status: 'pending',
        weight_kg: 18,
        required_vehicle_type: 'Bike',
        distance_km: 6.4,
        zone: 'Central Zone',
        notes: 'Legal documents pouch - direct handover to receptionist',
        recipient_address: 'Nungambakkam Corporate Towers, 6th Floor',
        is_emergency: false,
      },
      {
        delivery_id: 'D-205',
        pickup: 'Central Railway Parcels Office',
        dropoff: 'T. Nagar Commercial Annex (Near Nungambakkam)',
        recipient_name: 'Ganesh Moorthy',
        recipient_phone: '+91 98409 44321',
        delivery_date: '2026-10-29',
        scheduled_time: '02:45 PM',
        priority: 'medium',
        status: 'pending',
        weight_kg: 22,
        required_vehicle_type: 'Bike',
        distance_km: 7.1,
        zone: 'Central Zone',
        notes: 'Only 2.5 km from Nungambakkam - perfect two-drop bike/van route',
        recipient_address: 'T. Nagar Commercial Annex, 1st Cross',
        is_emergency: false,
      },
      // Dedicated Emergency / SOS Delivery Order (அவசர ஆர்டர்)
      {
        delivery_id: 'D-206',
        pickup: 'Apollo Central Blood Bank, Greams Road',
        dropoff: 'Fortis Malar Emergency ICU, Adyar',
        recipient_name: 'Dr. Deepa Natarajan (Head of ICU)',
        recipient_phone: '+91 98405 11223',
        delivery_date: '2026-10-29',
        scheduled_time: '09:45 AM',
        priority: 'urgent',
        status: 'pending',
        weight_kg: 12,
        required_vehicle_type: 'Bike',
        distance_km: 8.4,
        zone: 'South Zone',
        notes: '🚨 CRITICAL EMERGENCY: Rare AB- Blood Units & ICU Cardiac Valves. Assign Dedicated Emergency Bike immediately for rapid city transit!',
        recipient_address: 'Fortis Malar Emergency ICU Trauma Wing, Gate 1, Adyar',
        is_emergency: true,
        emergency_type: 'ICU Critical Blood Plasma & Pediatric Valves',
      },
    ];

    for (const v of initialVehicles) this.vehicles.set(v.vehicle_id, { ...v });
    for (const d of initialDrivers) this.drivers.set(d.driver_id, { ...d });
    for (const del of initialDeliveries) this.deliveries.set(del.delivery_id, { ...del });

    // Initial Active Assignment for live telemetry
    this.assignments.set('ASN-INIT-001', {
      assignment_id: 'ASN-INIT-001',
      delivery_id: 'D-200',
      vehicle_id: 'V-103',
      driver_id: 'DR-003',
      assigned_at: new Date().toISOString(),
      released_at: null,
      status: 'active',
    });

    this.logAudit(
      'RESET_DEMO',
      'system',
      'SYS-001',
      'System initialized with standard fleet, driver, and delivery demo dataset.',
      'System',
      'info'
    );
  }

  // --- Audit Logging ---
  private logAudit(
    action: AuditLog['action'],
    entity_type: AuditLog['entity_type'],
    entity_id: string,
    details: string,
    actor = 'Dispatcher',
    severity: AuditLog['severity'] = 'info'
  ) {
    const log: AuditLog = {
      id: 'LOG-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      action,
      entity_type,
      entity_id,
      details,
      actor,
      severity,
    };
    this.auditLogs.unshift(log);
    // Keep max 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  // --- Vehicle Methods ---
  public getVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  public getVehicle(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }

  public createVehicle(data: Omit<Vehicle, 'status' | 'current_delivery_id'> & { status?: Vehicle['status'] }): { success: boolean; data?: Vehicle; error?: string; code?: string; status: number } {
    if (!data.vehicle_id || !data.registration_no || !data.type || !data.capacity) {
      return { success: false, error: 'Missing required vehicle fields (id, registration_no, type, capacity)', code: 'VALIDATION_ERROR', status: 400 };
    }

    if (this.vehicles.has(data.vehicle_id)) {
      return { success: false, error: `Vehicle ID ${data.vehicle_id} already exists. Must be unique.`, code: 'DUPLICATE_VEHICLE_ID', status: 409 };
    }

    // Check duplicate registration
    const existingReg = Array.from(this.vehicles.values()).find(
      (v) => v.registration_no.toLowerCase().trim() === data.registration_no.toLowerCase().trim()
    );
    if (existingReg) {
      return {
        success: false,
        error: `Registration number ${data.registration_no} already exists for vehicle ${existingReg.vehicle_id}.`,
        code: 'DUPLICATE_REGISTRATION',
        status: 409,
      };
    }

    if (data.capacity <= 0) {
      return { success: false, error: 'Capacity must be greater than zero.', code: 'INVALID_CAPACITY', status: 400 };
    }

    const vehicle: Vehicle = {
      vehicle_id: data.vehicle_id.trim().toUpperCase(),
      registration_no: data.registration_no.trim().toUpperCase(),
      type: data.type,
      capacity: Number(data.capacity),
      status: data.status || 'available',
      fuel_level: data.fuel_level ?? 100,
      model: data.model || 'Standard Fleet Unit',
      current_delivery_id: null,
      is_emergency_reserve: Boolean(data.is_emergency_reserve),
      emergency_unit_type: data.emergency_unit_type || (data.is_emergency_reserve ? (data.type.toLowerCase().includes('bike') ? 'emergency_bike' : 'emergency_van') : 'none'),
      emergency_equipment: data.emergency_equipment || [],
    };

    this.vehicles.set(vehicle.vehicle_id, vehicle);
    this.logAudit('CREATE', 'vehicle', vehicle.vehicle_id, `Created vehicle ${vehicle.vehicle_id} (${vehicle.registration_no}, ${vehicle.type}, ${vehicle.capacity}kg)${vehicle.is_emergency_reserve ? ' [🚨 EMERGENCY RESERVE UNIT]' : ''}`);
    return { success: true, data: vehicle, status: 201 };
  }

  public updateVehicleStatus(id: string, newStatus: Vehicle['status']): { success: boolean; data?: Vehicle; error?: string; code?: string; status: number } {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      return { success: false, error: `Vehicle ${id} not found`, code: 'VEHICLE_NOT_FOUND', status: 404 };
    }

    // Part 2.1 rule: Change vehicle to maintenance or inactive only when no active assignment exists; otherwise reject
    const hasActiveAssignment = this.isVehicleInActiveAssignment(id);
    if (hasActiveAssignment && (newStatus === 'maintenance' || newStatus === 'inactive' || newStatus === 'available')) {
      return {
        success: false,
        error: `Cannot change vehicle ${id} status to '${newStatus}' while assigned to active delivery ${vehicle.current_delivery_id || 'unknown'}. Resolve delivery first.`,
        code: 'VEHICLE_HAS_ACTIVE_ASSIGNMENT',
        status: 409,
      };
    }

    vehicle.status = newStatus;
    this.logAudit('UPDATE', 'vehicle', id, `Updated vehicle status to ${newStatus}`);
    return { success: true, data: vehicle, status: 200 };
  }

  public deleteVehicle(id: string): { success: boolean; error?: string; code?: string; status: number } {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      return { success: false, error: `Vehicle ${id} not found`, code: 'VEHICLE_NOT_FOUND', status: 404 };
    }
    if (this.isVehicleInActiveAssignment(id)) {
      return { success: false, error: `Cannot delete vehicle ${id} while assigned to an active delivery.`, code: 'VEHICLE_ACTIVE', status: 409 };
    }
    this.vehicles.delete(id);
    this.logAudit('DELETE', 'vehicle', id, `Deleted vehicle ${id}`);
    return { success: true, status: 200 };
  }

  // --- Driver Methods ---
  public getDrivers(): Driver[] {
    return Array.from(this.drivers.values());
  }

  public getDriver(id: string): Driver | undefined {
    return this.drivers.get(id);
  }

  public createDriver(data: Omit<Driver, 'availability_status' | 'current_delivery_id'> & { availability_status?: Driver['availability_status']; is_emergency_certified?: boolean }): { success: boolean; data?: Driver; error?: string; code?: string; status: number } {
    if (!data.driver_id || !data.name || !data.phone) {
      return { success: false, error: 'Missing required driver fields (id, name, phone)', code: 'VALIDATION_ERROR', status: 400 };
    }

    if (this.drivers.has(data.driver_id)) {
      return { success: false, error: `Driver ID ${data.driver_id} already exists. Must be unique.`, code: 'DUPLICATE_DRIVER_ID', status: 409 };
    }

    const driver: Driver = {
      driver_id: data.driver_id.trim().toUpperCase(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      availability_status: data.availability_status || 'available',
      current_delivery_id: null,
      license_type: data.license_type || 'Standard Commercial',
      rating: data.rating ?? 5.0,
      experience_years: data.experience_years ?? 3,
      is_emergency_certified: Boolean(data.is_emergency_certified),
    };

    this.drivers.set(driver.driver_id, driver);
    this.logAudit('CREATE', 'driver', driver.driver_id, `Created driver ${driver.name} (${driver.driver_id})${driver.is_emergency_certified ? ' [🚨 EMERGENCY CERTIFIED]' : ''}`);
    return { success: true, data: driver, status: 201 };
  }

  public updateDriverStatus(id: string, newStatus: Driver['availability_status']): { success: boolean; data?: Driver; error?: string; code?: string; status: number } {
    const driver = this.drivers.get(id);
    if (!driver) {
      return { success: false, error: `Driver ${id} not found`, code: 'DRIVER_NOT_FOUND', status: 404 };
    }

    // Part 2.2 rule: Do not mark a driver unavailable while the driver has an active delivery
    const hasActiveAssignment = this.isDriverInActiveAssignment(id);
    if (hasActiveAssignment && newStatus === 'unavailable') {
      return {
        success: false,
        error: `Cannot mark driver ${id} as unavailable while assigned to active delivery ${driver.current_delivery_id || 'unknown'}. Resolve delivery first.`,
        code: 'DRIVER_HAS_ACTIVE_ASSIGNMENT',
        status: 409,
      };
    }

    driver.availability_status = newStatus;
    this.logAudit('UPDATE', 'driver', id, `Updated driver availability to ${newStatus}`);
    return { success: true, data: driver, status: 200 };
  }

  public deleteDriver(id: string): { success: boolean; error?: string; code?: string; status: number } {
    const driver = this.drivers.get(id);
    if (!driver) {
      return { success: false, error: `Driver ${id} not found`, code: 'DRIVER_NOT_FOUND', status: 404 };
    }
    if (this.isDriverInActiveAssignment(id)) {
      return { success: false, error: `Cannot delete driver ${id} while assigned to an active delivery.`, code: 'DRIVER_ACTIVE', status: 409 };
    }
    this.drivers.delete(id);
    this.logAudit('DELETE', 'driver', id, `Deleted driver ${id}`);
    return { success: true, status: 200 };
  }

  // --- Delivery Methods ---
  public getDeliveries(): Delivery[] {
    return Array.from(this.deliveries.values());
  }

  public getDelivery(id: string): Delivery | undefined {
    return this.deliveries.get(id);
  }

  public createDelivery(data: {
    delivery_id?: string;
    pickup: string;
    dropoff: string;
    scheduled_time: string;
    priority?: Delivery['priority'];
    weight_kg?: number;
    required_vehicle_type?: Vehicle['type'];
    notes?: string;
    distance_km?: number;
    recipient_name?: string;
    recipient_phone?: string;
    delivery_date?: string;
    recipient_address?: string;
    is_emergency?: boolean;
    emergency_type?: string;
  }): { success: boolean; data?: Delivery; error?: string; code?: string; status: number } {
    if (!data.pickup || !data.dropoff || !data.scheduled_time) {
      return { success: false, error: 'Pickup, dropoff, and scheduled_time are required.', code: 'VALIDATION_ERROR', status: 400 };
    }

    const id = data.delivery_id
      ? data.delivery_id.trim().toUpperCase()
      : 'D-' + (200 + this.deliveries.size + 1);

    if (this.deliveries.has(id)) {
      return { success: false, error: `Delivery ID ${id} already exists.`, code: 'DUPLICATE_DELIVERY_ID', status: 409 };
    }

    const delivery: Delivery = {
      delivery_id: id,
      pickup: data.pickup.trim(),
      dropoff: data.dropoff.trim(),
      scheduled_time: data.scheduled_time.trim(),
      priority: data.priority || (data.is_emergency ? 'urgent' : 'medium'),
      status: 'pending',
      weight_kg: Number(data.weight_kg) || 100,
      required_vehicle_type: data.required_vehicle_type || 'Van',
      distance_km: data.distance_km || Math.round((Math.random() * 25 + 5) * 10) / 10,
      notes: data.notes || '',
      recipient_name: data.recipient_name?.trim() || 'General Customer',
      recipient_phone: data.recipient_phone?.trim() || '+91 98400 00000',
      delivery_date: data.delivery_date?.trim() || new Date().toISOString().split('T')[0],
      recipient_address: data.recipient_address?.trim() || data.dropoff.trim(),
      is_emergency: Boolean(data.is_emergency || data.priority === 'urgent'),
      emergency_type: data.emergency_type || (data.is_emergency || data.priority === 'urgent' ? 'High-Priority Emergency Dispatch' : undefined),
      assigned_vehicle_id: null,
      assigned_driver_id: null,
      assigned_at: null,
      completed_at: null,
    };

    this.deliveries.set(delivery.delivery_id, delivery);
    this.logAudit('CREATE', 'delivery', delivery.delivery_id, `Created delivery ${delivery.delivery_id} for ${delivery.recipient_name} (${delivery.recipient_phone}) to ${delivery.dropoff} [${delivery.priority.toUpperCase()}]`);
    return { success: true, data: delivery, status: 201 };
  }

  // --- Active Helper Queries ---
  private isVehicleInActiveAssignment(vehicle_id: string): boolean {
    for (const assignment of this.assignments.values()) {
      if (assignment.vehicle_id === vehicle_id && assignment.status === 'active') {
        return true;
      }
    }
    const vehicle = this.vehicles.get(vehicle_id);
    return vehicle?.status === 'assigned';
  }

  private isDriverInActiveAssignment(driver_id: string): boolean {
    for (const assignment of this.assignments.values()) {
      if (assignment.driver_id === driver_id && assignment.status === 'active') {
        return true;
      }
    }
    const driver = this.drivers.get(driver_id);
    return driver?.availability_status === 'assigned';
  }

  // --- Core Assignment Engine with Concurrency Lock (Part 1.2, 1.3, 3.2, 5) ---
  public async assignDelivery(
    delivery_id: string,
    vehicle_id: string,
    driver_id: string,
    actor = 'Dispatcher'
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    code?: string;
    status: number;
    message?: string;
  }> {
    const releaseLock = await this.assignmentMutex.acquire();

    try {
      // 1. Validate entity existence (T7 edge case)
      const delivery = this.deliveries.get(delivery_id);
      if (!delivery) {
        return {
          success: false,
          error: 'DELIVERY_NOT_FOUND',
          message: `Delivery ${delivery_id} does not exist.`,
          status: 404,
        };
      }

      const vehicle = this.vehicles.get(vehicle_id);
      if (!vehicle) {
        return {
          success: false,
          error: 'VEHICLE_NOT_FOUND',
          message: `Vehicle ${vehicle_id} does not exist.`,
          status: 404,
        };
      }

      const driver = this.drivers.get(driver_id);
      if (!driver) {
        return {
          success: false,
          error: 'DRIVER_NOT_FOUND',
          message: `Driver ${driver_id} does not exist.`,
          status: 404,
        };
      }

      // 2. Validate delivery state: must be pending
      if (delivery.status !== 'pending') {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'delivery',
          delivery_id,
          `Rejected assignment: Delivery ${delivery_id} is already in state '${delivery.status}' (must be pending).`,
          actor,
          'warning'
        );
        return {
          success: false,
          error: 'DELIVERY_NOT_PENDING',
          message: `Delivery ${delivery_id} cannot be assigned because its current status is '${delivery.status}'.`,
          status: 409,
        };
      }

      // 3. Check Both Occupied (T4 edge case)
      const isVehicleUnavailable = vehicle.status !== 'available' || this.isVehicleInActiveAssignment(vehicle_id);
      const isDriverUnavailable = driver.availability_status !== 'available' || this.isDriverInActiveAssignment(driver_id);

      if (isVehicleUnavailable && isDriverUnavailable) {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'assignment',
          `${delivery_id}`,
          `Rejected assignment: Both vehicle ${vehicle_id} and driver ${driver_id} are unavailable or occupied.`,
          actor,
          'error'
        );
        return {
          success: false,
          error: 'BOTH_RESOURCES_OCCUPIED',
          message: `Both vehicle ${vehicle_id} and driver ${driver_id} are unavailable or already assigned to active deliveries.`,
          status: 409,
        };
      }

      // 4. Validate Vehicle Eligibility (T2, T6 edge cases)
      if (vehicle.status === 'maintenance') {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'vehicle',
          vehicle_id,
          `Rejected assignment: Vehicle ${vehicle_id} is in maintenance.`,
          actor,
          'warning'
        );
        return {
          success: false,
          error: 'VEHICLE_IN_MAINTENANCE',
          message: `Vehicle ${vehicle_id} is currently under maintenance and cannot be assigned.`,
          status: 409,
        };
      }

      if (vehicle.status === 'inactive') {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'vehicle',
          vehicle_id,
          `Rejected assignment: Vehicle ${vehicle_id} is inactive.`,
          actor,
          'warning'
        );
        return {
          success: false,
          error: 'VEHICLE_INACTIVE',
          message: `Vehicle ${vehicle_id} is inactive and cannot be assigned.`,
          status: 409,
        };
      }

      if (vehicle.status !== 'available' || this.isVehicleInActiveAssignment(vehicle_id)) {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'vehicle',
          vehicle_id,
          `Rejected assignment: Vehicle ${vehicle_id} is already assigned to an active delivery.`,
          actor,
          'error'
        );
        return {
          success: false,
          error: 'VEHICLE_UNAVAILABLE',
          message: `Vehicle ${vehicle_id} is already assigned to an active delivery`,
          status: 409,
        };
      }

      // 5. Validate Driver Eligibility (T3, T5 edge cases)
      if (driver.availability_status === 'unavailable') {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'driver',
          driver_id,
          `Rejected assignment: Driver ${driver_id} is marked unavailable.`,
          actor,
          'warning'
        );
        return {
          success: false,
          error: 'DRIVER_UNAVAILABLE',
          message: `Driver ${driver_id} is currently marked unavailable`,
          status: 409,
        };
      }

      if (driver.availability_status !== 'available' || this.isDriverInActiveAssignment(driver_id)) {
        this.blockedConflictsCount++;
        this.logAudit(
          'CONFLICT_BLOCKED',
          'driver',
          driver_id,
          `Rejected assignment: Driver ${driver_id} is already assigned to an active delivery.`,
          actor,
          'error'
        );
        return {
          success: false,
          error: 'DRIVER_ALREADY_ASSIGNED',
          message: `Driver ${driver_id} is already assigned to an active delivery`,
          status: 409,
        };
      }

      // 6. Capacity warning/validation check (Part 7 stretch goal)
      if (vehicle.capacity < delivery.weight_kg) {
        // Can reject or flag capacity conflict
        return {
          success: false,
          error: 'CAPACITY_EXCEEDED',
          message: `Vehicle ${vehicle_id} capacity (${vehicle.capacity}kg) is insufficient for delivery weight (${delivery.weight_kg}kg).`,
          status: 400,
        };
      }

      // --- ATOMIC COMMIT (No partial update on failure) ---
      const now = new Date().toISOString();
      const assignmentId = 'ASN-' + Math.random().toString(36).substring(2, 9).toUpperCase();

      const newAssignment: Assignment = {
        assignment_id: assignmentId,
        delivery_id: delivery.delivery_id,
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        assigned_at: now,
        status: 'active',
        released_at: null,
      };

      // Mutate states in one atomic block
      vehicle.status = 'assigned';
      vehicle.current_delivery_id = delivery.delivery_id;

      driver.availability_status = 'assigned';
      driver.current_delivery_id = delivery.delivery_id;

      delivery.status = 'assigned';
      delivery.assigned_vehicle_id = vehicle.vehicle_id;
      delivery.assigned_driver_id = driver.driver_id;
      delivery.assigned_at = now;

      this.assignments.set(assignmentId, newAssignment);

      this.logAudit(
        'ASSIGN_SUCCESS',
        'assignment',
        assignmentId,
        `Assigned ${vehicle.vehicle_id} and ${driver.name} (${driver.driver_id}) to ${delivery.delivery_id}`,
        actor,
        'success'
      );

      // Return exactly the contract requested in Section 4.2
      return {
        success: true,
        status: 200,
        data: {
          delivery_id: delivery.delivery_id,
          vehicle_id: vehicle.vehicle_id,
          driver_id: driver.driver_id,
          status: 'assigned',
          message: 'Assignment created successfully',
          assignment_id: assignmentId,
        },
        message: 'Assignment created successfully',
      };
    } finally {
      releaseLock();
    }
  }

  // --- Delivery Status Transition with Resource Release (Part 2.3, 1.3, T8, T9, T10) ---
  public async updateDeliveryStatus(
    delivery_id: string,
    newStatus: Delivery['status'],
    actor = 'Dispatcher'
  ): Promise<{
    success: boolean;
    data?: Delivery;
    error?: string;
    code?: string;
    status: number;
    message?: string;
    resources_released?: boolean;
  }> {
    const releaseLock = await this.assignmentMutex.acquire();

    try {
      const delivery = this.deliveries.get(delivery_id);
      if (!delivery) {
        return {
          success: false,
          error: 'DELIVERY_NOT_FOUND',
          message: `Delivery ${delivery_id} not found`,
          status: 404,
        };
      }

      const currentStatus = delivery.status;

      // Validate lifecycle transitions:
      // Pending -> Assigned (only through assign endpoint)
      // Pending -> Cancelled (valid)
      // Assigned -> In_transit (valid)
      // Assigned -> Cancelled (valid, release resources)
      // In_transit -> Delivered (valid, release resources)
      // In_transit -> Cancelled (valid, release resources)

      const validTransitions: Record<Delivery['status'], Delivery['status'][]> = {
        pending: ['cancelled'], // 'assigned' is via assignDelivery
        assigned: ['in_transit', 'cancelled'],
        in_transit: ['delivered', 'cancelled'],
        delivered: [],
        cancelled: [],
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        this.logAudit(
          'CONFLICT_BLOCKED',
          'delivery',
          delivery_id,
          `Invalid status transition attempted: cannot move from '${currentStatus}' to '${newStatus}'.`,
          actor,
          'warning'
        );
        return {
          success: false,
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition delivery from '${currentStatus}' to '${newStatus}'. Valid next states: [${(validTransitions[currentStatus] || []).join(', ') || 'none'}]`,
          status: 400,
        };
      }

      const now = new Date().toISOString();
      let resourcesReleased = false;

      // Execute status update
      delivery.status = newStatus;

      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        delivery.completed_at = now;

        // Check if this delivery is part of a multi-stop co-delivery batch
        let hasRemainingActiveInBatch = false;
        if (delivery.batch_id) {
          for (const d of this.deliveries.values()) {
            if (d.batch_id === delivery.batch_id && d.delivery_id !== delivery.delivery_id) {
              if (d.status === 'assigned' || d.status === 'in_transit') {
                hasRemainingActiveInBatch = true;
                break;
              }
            }
          }
        }

        // Close Active Assignment for this specific delivery
        for (const assignment of this.assignments.values()) {
          if (assignment.delivery_id === delivery.delivery_id && assignment.status === 'active') {
            assignment.status = newStatus === 'delivered' ? 'completed' : 'cancelled';
            assignment.released_at = now;
          }
        }

        if (hasRemainingActiveInBatch) {
          // Do NOT release vehicle or driver yet: they have other stops to complete!
          resourcesReleased = false;
          // Point vehicle and driver to the next remaining active delivery in this batch
          const nextActiveDel = Array.from(this.deliveries.values()).find(
            (d) => d.batch_id === delivery.batch_id && (d.status === 'assigned' || d.status === 'in_transit')
          );
          if (delivery.assigned_vehicle_id) {
            const v = this.vehicles.get(delivery.assigned_vehicle_id);
            if (v && nextActiveDel) v.current_delivery_id = nextActiveDel.delivery_id;
          }
          if (delivery.assigned_driver_id) {
            const dr = this.drivers.get(delivery.assigned_driver_id);
            if (dr && nextActiveDel) dr.current_delivery_id = nextActiveDel.delivery_id;
          }

          this.logAudit(
            'STATUS_CHANGE',
            'delivery',
            delivery.delivery_id,
            `Co-Delivery Stop completed for ${delivery.delivery_id}. Driver and vehicle continue onward to remaining orders in batch ${delivery.batch_id}.`,
            actor,
            'info'
          );
        } else {
          // Final stop of batch (or normal single delivery): Release Vehicle & Driver!
          if (delivery.assigned_vehicle_id) {
            const vehicle = this.vehicles.get(delivery.assigned_vehicle_id);
            if (vehicle) {
              vehicle.status = 'available';
              vehicle.current_delivery_id = null;
              vehicle.current_delivery_ids = [];
              vehicle.current_batch_id = null;
            }
          }

          if (delivery.assigned_driver_id) {
            const driver = this.drivers.get(delivery.assigned_driver_id);
            if (driver) {
              driver.availability_status = 'available';
              driver.current_delivery_id = null;
              driver.current_delivery_ids = [];
              driver.current_batch_id = null;
            }
          }

          if (delivery.batch_id) {
            const batch = this.batches.get(delivery.batch_id);
            if (batch) {
              batch.status = newStatus === 'delivered' ? 'completed' : 'cancelled';
            }
          }

          resourcesReleased = true;
        }
      }

      this.logAudit(
        'STATUS_CHANGE',
        'delivery',
        delivery.delivery_id,
        `Delivery ${delivery.delivery_id} status changed from ${currentStatus} to ${newStatus}${resourcesReleased ? ' (vehicle and driver released)' : ''}`,
        actor,
        newStatus === 'delivered' ? 'success' : 'info'
      );

      return {
        success: true,
        status: 200,
        data: delivery,
        message: `Delivery status updated to ${newStatus}`,
        resources_released: resourcesReleased,
      };
    } finally {
      releaseLock();
    }
  }

  // --- BUNDLED CO-DELIVERY FOR NEARBY ORDERS ---
  public async assignBundle(
    delivery_ids: string[],
    vehicle_id: string,
    driver_id: string,
    actor = 'Dispatcher'
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    code?: string;
    status: number;
    message?: string;
  }> {
    const releaseLock = await this.assignmentMutex.acquire();

    try {
      if (!delivery_ids || delivery_ids.length < 2) {
        return {
          success: false,
          error: 'INVALID_BUNDLE',
          message: 'At least 2 nearby deliveries are required for a bundled co-delivery route.',
          status: 400,
        };
      }

      // Check deliveries
      const bundleDeliveries: Delivery[] = [];
      let totalWeight = 0;

      for (const dId of delivery_ids) {
        const d = this.deliveries.get(dId);
        if (!d) {
          return {
            success: false,
            error: 'DELIVERY_NOT_FOUND',
            message: `Delivery ${dId} does not exist.`,
            status: 404,
          };
        }
        if (d.status !== 'pending') {
          return {
            success: false,
            error: 'DELIVERY_NOT_PENDING',
            message: `Delivery ${dId} cannot be bundled because its current status is '${d.status}'.`,
            status: 409,
          };
        }
        bundleDeliveries.push(d);
        totalWeight += d.weight_kg;
      }

      // Check vehicle
      const vehicle = this.vehicles.get(vehicle_id);
      if (!vehicle) {
        return { success: false, error: 'VEHICLE_NOT_FOUND', message: `Vehicle ${vehicle_id} does not exist.`, status: 404 };
      }
      if (vehicle.status === 'maintenance') {
        return { success: false, error: 'VEHICLE_IN_MAINTENANCE', message: `Vehicle ${vehicle_id} is in maintenance.`, status: 409 };
      }
      if (vehicle.status === 'inactive') {
        return { success: false, error: 'VEHICLE_INACTIVE', message: `Vehicle ${vehicle_id} is inactive.`, status: 409 };
      }
      if (vehicle.status !== 'available' && !vehicle.current_batch_id) {
        return { success: false, error: 'VEHICLE_UNAVAILABLE', message: `Vehicle ${vehicle_id} is already assigned to another active order.`, status: 409 };
      }
      if (vehicle.capacity < totalWeight) {
        return {
          success: false,
          error: 'CAPACITY_EXCEEDED',
          message: `Vehicle ${vehicle_id} capacity (${vehicle.capacity}kg) cannot hold combined bundle weight (${totalWeight}kg). Please choose a larger vehicle.`,
          status: 400,
        };
      }

      // Check driver
      const driver = this.drivers.get(driver_id);
      if (!driver) {
        return { success: false, error: 'DRIVER_NOT_FOUND', message: `Driver ${driver_id} does not exist.`, status: 404 };
      }
      if (driver.availability_status === 'unavailable') {
        return { success: false, error: 'DRIVER_UNAVAILABLE', message: `Driver ${driver_id} is unavailable.`, status: 409 };
      }
      if (driver.availability_status !== 'available' && !driver.current_batch_id) {
        return { success: false, error: 'DRIVER_ALREADY_ASSIGNED', message: `Driver ${driver_id} is already assigned to another active order.`, status: 409 };
      }

      // ATOMIC ASSIGNMENT FOR BUNDLE
      const now = new Date().toISOString();
      const batchId = 'BATCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      bundleDeliveries.forEach((del, idx) => {
        del.status = 'assigned';
        del.assigned_vehicle_id = vehicle.vehicle_id;
        del.assigned_driver_id = driver.driver_id;
        del.assigned_at = now;
        del.batch_id = batchId;
        del.stop_order = idx + 1;

        const assignmentId = 'ASN-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        this.assignments.set(assignmentId, {
          assignment_id: assignmentId,
          delivery_id: del.delivery_id,
          vehicle_id: vehicle.vehicle_id,
          driver_id: driver.driver_id,
          assigned_at: now,
          status: 'active',
          released_at: null,
        });
      });

      vehicle.status = 'assigned';
      vehicle.current_delivery_id = bundleDeliveries[0].delivery_id;
      vehicle.current_delivery_ids = bundleDeliveries.map((d) => d.delivery_id);
      vehicle.current_batch_id = batchId;

      driver.availability_status = 'assigned';
      driver.current_delivery_id = bundleDeliveries[0].delivery_id;
      driver.current_delivery_ids = bundleDeliveries.map((d) => d.delivery_id);
      driver.current_batch_id = batchId;

      const newBatch: MultiStopBatch = {
        batch_id: batchId,
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        delivery_ids: bundleDeliveries.map((d) => d.delivery_id),
        total_weight_kg: totalWeight,
        status: 'assigned',
        created_at: now,
        stops: bundleDeliveries.map((d, idx) => ({
          delivery_id: d.delivery_id,
          stop_number: idx + 1,
          pickup: d.pickup,
          dropoff: d.dropoff,
          status: d.status,
          weight_kg: d.weight_kg,
        })),
      };

      this.batches.set(batchId, newBatch);

      this.logAudit(
        'ASSIGN_SUCCESS',
        'assignment',
        batchId,
        `Bundled Co-Delivery Route created: Vehicle ${vehicle.vehicle_id} and Driver ${driver.name} assigned to deliver ${bundleDeliveries.length} nearby orders (${bundleDeliveries.map((d) => d.delivery_id).join(', ')}) with total ${totalWeight}kg load.`,
        actor,
        'success'
      );

      return {
        success: true,
        status: 200,
        data: {
          batch_id: batchId,
          vehicle_id: vehicle.vehicle_id,
          driver_id: driver.driver_id,
          deliveries: bundleDeliveries,
          total_weight_kg: totalWeight,
          message: `Co-Delivery bundle created! ${bundleDeliveries.length} orders allocated to ${vehicle.vehicle_id} & ${driver.name}.`,
        },
        message: 'Bundled co-delivery assigned successfully',
      };
    } finally {
      releaseLock();
    }
  }

  // --- CO-DELIVERY SUGGESTIONS DETECTOR ---
  public getCoDeliverySuggestions(): CoDeliveryCluster[] {
    const pendings = Array.from(this.deliveries.values()).filter((d) => d.status === 'pending');
    if (pendings.length < 2) return [];

    const clusters: CoDeliveryCluster[] = [];
    const zoneMap = new Map<string, Delivery[]>();

    for (const del of pendings) {
      let zone = del.zone || 'Metropolitan';
      const dropoffLower = del.dropoff.toLowerCase();
      if (dropoffLower.includes('guindy') || dropoffLower.includes('adyar') || dropoffLower.includes('airport')) {
        zone = 'South Zone Corridor';
      } else if (dropoffLower.includes('nungambakkam') || dropoffLower.includes('t. nagar') || dropoffLower.includes('egmore') || dropoffLower.includes('central')) {
        zone = 'Central City Zone';
      } else if (dropoffLower.includes('ambattur') || dropoffLower.includes('sriperumbudur')) {
        zone = 'West Industrial Corridor';
      } else if (dropoffLower.includes('port') || dropoffLower.includes('north')) {
        zone = 'North Port Zone';
      }

      const existing = zoneMap.get(zone) || [];
      existing.push(del);
      zoneMap.set(zone, existing);
    }

    let clusterIdx = 1;
    for (const [zone, dels] of zoneMap.entries()) {
      if (dels.length >= 2) {
        const paired = dels.slice(0, 3);
        const totalWeight = paired.reduce((acc, cur) => acc + cur.weight_kg, 0);

        clusters.push({
          cluster_id: `CLUSTER-${clusterIdx++}`,
          zone,
          delivery_ids: paired.map((d) => d.delivery_id),
          deliveries: paired,
          total_weight_kg: totalWeight,
          estimated_distance_between_km: Math.round((Math.random() * 2 + 2) * 10) / 10,
          recommended_vehicle_type: totalWeight > 1200 ? 'Truck' : totalWeight > 50 ? 'Van' : 'Motorbike',
          savings_estimate: 'Saves ~45% fuel, 35 min dispatch time & reduces 1 vehicle trip',
        });
      }
    }

    return clusters;
  }

  public getBatches(): MultiStopBatch[] {
    return Array.from(this.batches.values());
  }

  public getBatch(batchId: string): MultiStopBatch | undefined {
    return this.batches.get(batchId);
  }

  // --- Assignments History ---
  public getAssignments(): Assignment[] {
    return Array.from(this.assignments.values()).sort(
      (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    );
  }

  // --- Automated Test Suite Runner (Part 5 T1-T12) ---
  public async runTest(testId: string): Promise<TestCaseResult> {
    const startTime = Date.now();

    switch (testId) {
      case 'T1': {
        // T1 — Valid assignment: Assign available vehicle and driver to pending delivery
        // Setup clean target records
        const delId = 'T1-DEL-' + Date.now().toString().slice(-4);
        const vehId = 'T1-VEH-' + Date.now().toString().slice(-4);
        const drvId = 'T1-DRV-' + Date.now().toString().slice(-4);

        this.createVehicle({
          vehicle_id: vehId,
          registration_no: 'TN-TEST-' + Math.random().toString().slice(-4),
          type: 'Van',
          capacity: 1000,
          status: 'available',
        });
        this.createDriver({
          driver_id: drvId,
          name: 'Test Driver 1',
          phone: '+91 99999 00001',
          availability_status: 'available',
        });
        this.createDelivery({
          delivery_id: delId,
          pickup: 'Test Depot A',
          dropoff: 'Test Client B',
          scheduled_time: '10:00 AM',
          weight_kg: 200,
        });

        const res = await this.assignDelivery(delId, vehId, drvId, 'Test Runner (T1)');
        const v = this.getVehicle(vehId);
        const d = this.getDriver(drvId);
        const dl = this.getDelivery(delId);

        const passed =
          res.success &&
          res.status === 200 &&
          v?.status === 'assigned' &&
          d?.availability_status === 'assigned' &&
          dl?.status === 'assigned';

        return {
          id: 'T1',
          name: 'Valid Assignment',
          action: 'Assign available vehicle and driver to pending delivery.',
          expected_result: 'Success (200/201); all three records reflect assignment.',
          observed_result: passed
            ? `Success: Delivery ${delId}, Vehicle ${vehId}, Driver ${drvId} all marked assigned.`
            : `Failed: ${res.message || res.error}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: delId, vehicle_id: vehId, driver_id: drvId },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T2': {
        // T2 — Vehicle conflict: Assign same vehicle to second active delivery
        // Pick an assigned vehicle or assign one
        const v = Array.from(this.vehicles.values()).find((item) => item.status === 'assigned') || (await this.ensureOneAssigned()).vehicle;
        const availableDriver = Array.from(this.drivers.values()).find((item) => item.availability_status === 'available');

        const secondDel = 'T2-DEL-' + Date.now().toString().slice(-4);
        this.createDelivery({
          delivery_id: secondDel,
          pickup: 'Hub Alpha',
          dropoff: 'Hub Beta',
          scheduled_time: '12:00 PM',
          weight_kg: 100,
        });

        const res = await this.assignDelivery(secondDel, v.vehicle_id, availableDriver?.driver_id || 'DR-001', 'Test Runner (T2)');
        const secondDelState = this.getDelivery(secondDel);

        const passed = res.status === 409 && res.error === 'VEHICLE_UNAVAILABLE' && secondDelState?.status === 'pending';

        return {
          id: 'T2',
          name: 'Vehicle Conflict',
          action: 'Assign same vehicle to second active delivery.',
          expected_result: 'Rejected (409 Conflict); no records partially changed.',
          observed_result: passed
            ? `Conflict detected safely: ${res.message} (Status 409). Delivery remains pending.`
            : `Expected 409 but got ${res.status}: ${res.error || res.message}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: secondDel, vehicle_id: v.vehicle_id, driver_id: availableDriver?.driver_id },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T3': {
        // T3 — Driver conflict: Assign same driver to second active delivery
        const d = Array.from(this.drivers.values()).find((item) => item.availability_status === 'assigned') || (await this.ensureOneAssigned()).driver;
        const availableVeh = Array.from(this.vehicles.values()).find((item) => item.status === 'available');

        const secondDel = 'T3-DEL-' + Date.now().toString().slice(-4);
        this.createDelivery({
          delivery_id: secondDel,
          pickup: 'Hub Gamma',
          dropoff: 'Hub Delta',
          scheduled_time: '01:00 PM',
          weight_kg: 50,
        });

        const res = await this.assignDelivery(secondDel, availableVeh?.vehicle_id || 'V-101', d.driver_id, 'Test Runner (T3)');
        const secondDelState = this.getDelivery(secondDel);

        const passed = res.status === 409 && (res.error === 'DRIVER_ALREADY_ASSIGNED' || res.error === 'DRIVER_CONFLICT') && secondDelState?.status === 'pending';

        return {
          id: 'T3',
          name: 'Driver Conflict',
          action: 'Assign same driver to second active delivery.',
          expected_result: 'Rejected (409 Conflict); no records partially changed.',
          observed_result: passed
            ? `Conflict blocked correctly: ${res.message} (Status 409). Delivery remains pending.`
            : `Expected 409 but got ${res.status}: ${res.error || res.message}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: secondDel, vehicle_id: availableVeh?.vehicle_id, driver_id: d.driver_id },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T4': {
        // T4 — Both occupied: Choose occupied vehicle and occupied driver
        const assignedData = await this.ensureOneAssigned();
        const pendingDel = 'T4-DEL-' + Date.now().toString().slice(-4);
        this.createDelivery({
          delivery_id: pendingDel,
          pickup: 'Point A',
          dropoff: 'Point B',
          scheduled_time: '02:00 PM',
          weight_kg: 80,
        });

        const res = await this.assignDelivery(pendingDel, assignedData.vehicle.vehicle_id, assignedData.driver.driver_id, 'Test Runner (T4)');
        const passed = res.status === 409 && (res.error === 'BOTH_RESOURCES_OCCUPIED' || res.error === 'VEHICLE_UNAVAILABLE');

        return {
          id: 'T4',
          name: 'Both Occupied',
          action: 'Choose occupied vehicle and occupied driver.',
          expected_result: 'Rejected with clear reason (409 Conflict).',
          observed_result: passed
            ? `Blocked with clear reason: ${res.message} (Status 409).`
            : `Failed: Expected 409 but got ${res.status}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: pendingDel, vehicle_id: assignedData.vehicle.vehicle_id, driver_id: assignedData.driver.driver_id },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T5': {
        // T5 — Unavailable driver: Set driver unavailable, then assign
        const drvId = 'T5-DRV-' + Date.now().toString().slice(-4);
        this.createDriver({
          driver_id: drvId,
          name: 'Off-Duty Driver',
          phone: '+91 99999 55555',
          availability_status: 'unavailable',
        });

        const v = Array.from(this.vehicles.values()).find((item) => item.status === 'available') || this.getVehicles()[0];
        const delId = 'T5-DEL-' + Date.now().toString().slice(-4);
        this.createDelivery({
          delivery_id: delId,
          pickup: 'Pickup Site',
          dropoff: 'Delivery Site',
          scheduled_time: '03:00 PM',
          weight_kg: 100,
        });

        const res = await this.assignDelivery(delId, v.vehicle_id, drvId, 'Test Runner (T5)');
        const passed = res.status === 409 && res.error === 'DRIVER_UNAVAILABLE';

        return {
          id: 'T5',
          name: 'Unavailable Driver',
          action: 'Set driver unavailable, then assign.',
          expected_result: 'Rejected (409 Conflict: Driver unavailable).',
          observed_result: passed
            ? `Safely rejected: ${res.message} (Code: ${res.error})`
            : `Expected DRIVER_UNAVAILABLE but got status ${res.status}: ${res.error}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: delId, vehicle_id: v.vehicle_id, driver_id: drvId },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T6': {
        // T6 — Maintenance vehicle: Select vehicle in maintenance
        const vehId = 'T6-VEH-' + Date.now().toString().slice(-4);
        this.createVehicle({
          vehicle_id: vehId,
          registration_no: 'TN-MAINT-' + Math.random().toString().slice(-4),
          type: 'Van',
          capacity: 1000,
          status: 'maintenance',
        });

        const d = Array.from(this.drivers.values()).find((item) => item.availability_status === 'available') || this.getDrivers()[0];
        const delId = 'T6-DEL-' + Date.now().toString().slice(-4);
        this.createDelivery({
          delivery_id: delId,
          pickup: 'Workshop Hub',
          dropoff: 'Destination Hub',
          scheduled_time: '04:00 PM',
          weight_kg: 120,
        });

        const res = await this.assignDelivery(delId, vehId, d.driver_id, 'Test Runner (T6)');
        const passed = res.status === 409 && res.error === 'VEHICLE_IN_MAINTENANCE';

        return {
          id: 'T6',
          name: 'Maintenance Vehicle',
          action: 'Select vehicle in maintenance.',
          expected_result: 'Rejected (409 Conflict: Vehicle in maintenance).',
          observed_result: passed
            ? `Blocked vehicle under maintenance: ${res.message}`
            : `Expected VEHICLE_IN_MAINTENANCE but got status ${res.status}: ${res.error}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: delId, vehicle_id: vehId, driver_id: d.driver_id },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T7': {
        // T7 — Unknown ID: Use missing vehicle, driver or delivery ID
        const res = await this.assignDelivery('D-NON-EXISTENT', 'V-UNKNOWN', 'DR-FAKE', 'Test Runner (T7)');
        const passed = res.status === 404;

        return {
          id: 'T7',
          name: 'Unknown ID',
          action: 'Use missing vehicle, driver or delivery ID.',
          expected_result: 'Rejected safely with 404; no crash.',
          observed_result: passed
            ? `Handled gracefully: ${res.message} (Status 404). Server stable.`
            : `Failed: Got status ${res.status}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: 'D-NON-EXISTENT', vehicle_id: 'V-UNKNOWN', driver_id: 'DR-FAKE' },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T8': {
        // T8 — Complete delivery: Mark assigned/in-transit delivery delivered
        const { delivery, vehicle, driver } = await this.ensureOneAssigned();

        // Step to in-transit first, then delivered
        await this.updateDeliveryStatus(delivery.delivery_id, 'in_transit', 'Test Runner (T8)');
        const res = await this.updateDeliveryStatus(delivery.delivery_id, 'delivered', 'Test Runner (T8)');

        const updatedVehicle = this.getVehicle(vehicle.vehicle_id);
        const updatedDriver = this.getDriver(driver.driver_id);
        const updatedDelivery = this.getDelivery(delivery.delivery_id);

        const passed =
          res.success &&
          updatedDelivery?.status === 'delivered' &&
          updatedVehicle?.status === 'available' &&
          updatedDriver?.availability_status === 'available';

        return {
          id: 'T8',
          name: 'Complete Delivery',
          action: 'Mark assigned/in-transit delivery delivered.',
          expected_result: 'Delivery closes; vehicle and driver become available.',
          observed_result: passed
            ? `Delivery closed (${updatedDelivery?.status}). Vehicle ${updatedVehicle?.vehicle_id} released -> available. Driver ${updatedDriver?.driver_id} released -> available.`
            : `Failed: Resources not released properly.`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: delivery.delivery_id, target_status: 'delivered' },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T9': {
        // T9 — Cancel delivery: Cancel eligible delivery
        const { delivery, vehicle, driver } = await this.ensureOneAssigned();
        const res = await this.updateDeliveryStatus(delivery.delivery_id, 'cancelled', 'Test Runner (T9)');

        const updatedVehicle = this.getVehicle(vehicle.vehicle_id);
        const updatedDriver = this.getDriver(driver.driver_id);
        const updatedDelivery = this.getDelivery(delivery.delivery_id);

        const passed =
          res.success &&
          updatedDelivery?.status === 'cancelled' &&
          updatedVehicle?.status === 'available' &&
          updatedDriver?.availability_status === 'available';

        return {
          id: 'T9',
          name: 'Cancel Delivery',
          action: 'Cancel eligible delivery.',
          expected_result: 'Status changes to cancelled; resources released consistently.',
          observed_result: passed
            ? `Cancelled delivery ${delivery.delivery_id}. Released vehicle ${vehicle.vehicle_id} and driver ${driver.driver_id}.`
            : `Failed: Release inconsistent.`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: delivery.delivery_id, target_status: 'cancelled' },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T10': {
        // T10 — Invalid transition: Mark pending delivery delivered directly
        const delId = 'T10-DEL-' + Date.now().toString().slice(-4);
        this.createDelivery({
          pickup: 'Pickup',
          dropoff: 'Dropoff',
          scheduled_time: '12:00 PM',
          delivery_id: delId,
        });

        const res = await this.updateDeliveryStatus(delId, 'delivered', 'Test Runner (T10)');
        const delivery = this.getDelivery(delId);

        const passed = res.status === 400 && res.error === 'INVALID_STATUS_TRANSITION' && delivery?.status === 'pending';

        return {
          id: 'T10',
          name: 'Invalid Transition',
          action: 'Mark pending delivery delivered directly.',
          expected_result: 'Rejected (400) by documented workflow rules.',
          observed_result: passed
            ? `Illegal jump blocked: ${res.message} (Status 400). Delivery stays pending.`
            : `Failed: Allowed invalid jump or wrong status ${res.status}`,
          http_status: res.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { delivery_id: delId, attempted_status: 'delivered' },
          response: res,
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T11': {
        // T11 — Duplicate submit: Submit same assignment twice quickly
        const delId = 'T11-DEL-' + Date.now().toString().slice(-4);
        const vehId = 'T11-VEH-' + Date.now().toString().slice(-4);
        const drvId = 'T11-DRV-' + Date.now().toString().slice(-4);

        this.createVehicle({
          vehicle_id: vehId,
          registration_no: 'TN-DUP-' + Math.random().toString().slice(-4),
          type: 'Van',
          capacity: 1000,
          status: 'available',
        });
        this.createDriver({
          driver_id: drvId,
          name: 'Duplicate Test Driver',
          phone: '+91 99999 11111',
          availability_status: 'available',
        });
        this.createDelivery({
          delivery_id: delId,
          pickup: 'Depot 11',
          dropoff: 'Store 11',
          scheduled_time: '05:00 PM',
          weight_kg: 100,
        });

        // Submit first assignment
        const res1 = await this.assignDelivery(delId, vehId, drvId, 'Test Runner (T11 - Call 1)');
        // Immediately submit identical duplicate assignment
        const res2 = await this.assignDelivery(delId, vehId, drvId, 'Test Runner (T11 - Call 2)');

        const passed = res1.status === 200 && res2.status === 409;

        return {
          id: 'T11',
          name: 'Duplicate Submit',
          action: 'Submit same assignment twice quickly.',
          expected_result: 'First succeeds (200), duplicate rejected (409); no duplicate active assignments.',
          observed_result: passed
            ? `First attempt: 200 OK. Duplicate attempt: 409 Conflict (${res2.error}). State is fully protected.`
            : `Failed: Res1=${res1.status}, Res2=${res2.status}`,
          http_status: res2.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { call_1: { delId, vehId, drvId }, call_2: { delId, vehId, drvId } },
          response: { first: res1, second: res2 },
          duration_ms: Date.now() - startTime,
        };
      }

      case 'T12': {
        // T12 — Concurrent request: Two requests attempt same vehicle at once
        const vehId = 'T12-VEH-' + Date.now().toString().slice(-4);
        this.createVehicle({
          vehicle_id: vehId,
          registration_no: 'TN-CONC-' + Math.random().toString().slice(-4),
          type: 'Truck',
          capacity: 2500,
          status: 'available',
        });

        const drvId1 = 'T12-DR1-' + Date.now().toString().slice(-4);
        const drvId2 = 'T12-DR2-' + Date.now().toString().slice(-4);
        this.createDriver({ driver_id: drvId1, name: 'Concurrent Driver 1', phone: '+91 91111 11111' });
        this.createDriver({ driver_id: drvId2, name: 'Concurrent Driver 2', phone: '+91 92222 22222' });

        const delId1 = 'T12-DEL1-' + Date.now().toString().slice(-4);
        const delId2 = 'T12-DEL2-' + Date.now().toString().slice(-4);
        this.createDelivery({ delivery_id: delId1, pickup: 'Site A', dropoff: 'Site B', scheduled_time: '06:00 PM', weight_kg: 100 });
        this.createDelivery({ delivery_id: delId2, pickup: 'Site C', dropoff: 'Site D', scheduled_time: '06:30 PM', weight_kg: 100 });

        // Launch two requests simultaneously via Promise.all
        const [res1, res2] = await Promise.all([
          this.assignDelivery(delId1, vehId, drvId1, 'Concurrent Req A'),
          this.assignDelivery(delId2, vehId, drvId2, 'Concurrent Req B'),
        ]);

        const successCount = (res1.status === 200 ? 1 : 0) + (res2.status === 200 ? 1 : 0);
        const conflictCount = (res1.status === 409 ? 1 : 0) + (res2.status === 409 ? 1 : 0);

        const passed = successCount === 1 && conflictCount === 1;

        return {
          id: 'T12',
          name: 'Concurrent Request Race',
          action: 'Two requests attempt same vehicle at once.',
          expected_result: 'At most one succeeds; the other is rejected (409 Conflict). Mutex blocks race condition.',
          observed_result: passed
            ? `Race condition prevented! 1 succeeded (200), 1 rejected with 409 Conflict. Mutex locked safely.`
            : `Failed: Success count: ${successCount}, Conflicts: ${conflictCount}`,
          http_status: res2.status === 409 ? 409 : res1.status,
          status: passed ? 'passed' : 'failed',
          run_at: new Date().toISOString(),
          payload: { concurrent_attempts: 2, target_vehicle: vehId },
          response: { attempt_1: res1, attempt_2: res2 },
          duration_ms: Date.now() - startTime,
        };
      }

      default:
        return {
          id: testId,
          name: 'Unknown Test',
          action: 'Run test ' + testId,
          expected_result: 'Valid test ID',
          observed_result: 'Test ID not recognized',
          status: 'failed',
        };
    }
  }

  public async runAllTests(): Promise<TestCaseResult[]> {
    const testIds = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const results: TestCaseResult[] = [];
    for (const id of testIds) {
      const res = await this.runTest(id);
      results.push(res);
    }
    return results;
  }

  // Helper to ensure at least one active assignment exists for test cases
  private async ensureOneAssigned(): Promise<{ delivery: Delivery; vehicle: Vehicle; driver: Driver }> {
    for (const del of this.deliveries.values()) {
      if (del.status === 'assigned') {
        const v = this.vehicles.get(del.assigned_vehicle_id!);
        const d = this.drivers.get(del.assigned_driver_id!);
        if (v && d) return { delivery: del, vehicle: v, driver: d };
      }
    }

    // Otherwise create and assign one
    const vId = 'V-SETUP-' + Date.now().toString().slice(-4);
    const dId = 'DR-SETUP-' + Date.now().toString().slice(-4);
    const delId = 'D-SETUP-' + Date.now().toString().slice(-4);

    this.createVehicle({
      vehicle_id: vId,
      registration_no: 'TN-SET-' + Math.random().toString().slice(-4),
      type: 'Van',
      capacity: 1000,
      status: 'available',
    });
    this.createDriver({
      driver_id: dId,
      name: 'Setup Driver',
      phone: '+91 99999 88888',
      availability_status: 'available',
    });
    this.createDelivery({
      delivery_id: delId,
      pickup: 'Setup Depot',
      dropoff: 'Setup Client',
      scheduled_time: '09:00 AM',
      weight_kg: 150,
    });

    await this.assignDelivery(delId, vId, dId, 'Test Setup');
    return {
      delivery: this.getDelivery(delId)!,
      vehicle: this.getVehicle(vId)!,
      driver: this.getDriver(dId)!,
    };
  }
}

// Singleton store instance
export const fleetStore = new FleetStore();
