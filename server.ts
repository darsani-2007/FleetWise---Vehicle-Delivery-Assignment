import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { fleetStore } from './src/fleetStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS and logging middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- HEALTH CHECK (Part 4) ---
  app.get(['/api/health', '/health'], (req, res) => {
    res.status(200).json({
      status: 'healthy',
      uptime_seconds: process.uptime(),
      service: 'FleetWise Vehicle & Delivery Assignment System',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      active_deliveries: fleetStore.getDeliveries().filter((d) => d.status === 'assigned' || d.status === 'in_transit').length,
    });
  });

  // --- VEHICLES (Part 4) ---
  // POST /vehicles (Create vehicle; reject duplicate registration; validate fields)
  app.post(['/api/vehicles', '/vehicles'], (req, res) => {
    const result = fleetStore.createVehicle(req.body);
    return res.status(result.status).json(result.success ? result.data : { error: result.code, message: result.error });
  });

  // GET /vehicles (List vehicles; include availability / current status)
  app.get(['/api/vehicles', '/vehicles'], (req, res) => {
    const vehicles = fleetStore.getVehicles();
    return res.status(200).json(vehicles);
  });

  // PATCH /vehicles/:id (Update vehicle status e.g. maintenance, inactive)
  app.patch(['/api/vehicles/:id', '/vehicles/:id'], (req, res) => {
    const { status } = req.body;
    const result = fleetStore.updateVehicleStatus(req.params.id, status);
    return res.status(result.status).json(result.success ? result.data : { error: result.code, message: result.error });
  });

  // DELETE /vehicles/:id
  app.delete(['/api/vehicles/:id', '/vehicles/:id'], (req, res) => {
    const result = fleetStore.deleteVehicle(req.params.id);
    return res.status(result.status).json(result.success ? { message: 'Vehicle deleted successfully' } : { error: result.code, message: result.error });
  });

  // --- DRIVERS (Part 4) ---
  // POST /drivers (Create driver; reject duplicate driver ID; validate fields)
  app.post(['/api/drivers', '/drivers'], (req, res) => {
    const result = fleetStore.createDriver(req.body);
    return res.status(result.status).json(result.success ? result.data : { error: result.code, message: result.error });
  });

  // GET /drivers (List drivers; include availability / current status)
  app.get(['/api/drivers', '/drivers'], (req, res) => {
    const drivers = fleetStore.getDrivers();
    return res.status(200).json(drivers);
  });

  // PATCH /drivers/:id (Update driver availability status)
  app.patch(['/api/drivers/:id', '/drivers/:id'], (req, res) => {
    const { availability_status } = req.body;
    const result = fleetStore.updateDriverStatus(req.params.id, availability_status);
    return res.status(result.status).json(result.success ? result.data : { error: result.code, message: result.error });
  });

  // DELETE /drivers/:id
  app.delete(['/api/drivers/:id', '/drivers/:id'], (req, res) => {
    const result = fleetStore.deleteDriver(req.params.id);
    return res.status(result.status).json(result.success ? { message: 'Driver deleted successfully' } : { error: result.code, message: result.error });
  });

  // --- DELIVERIES (Part 4) ---
  // POST /deliveries (Create delivery in pending state)
  app.post(['/api/deliveries', '/deliveries'], (req, res) => {
    const result = fleetStore.createDelivery(req.body);
    return res.status(result.status).json(result.success ? result.data : { error: result.code, message: result.error });
  });

  // GET /deliveries (List deliveries with status and assignment details)
  app.get(['/api/deliveries', '/deliveries'], (req, res) => {
    const deliveries = fleetStore.getDeliveries();
    return res.status(200).json(deliveries);
  });

  // POST /deliveries/{id}/assign (Assign vehicle + driver atomically)
  app.post(['/api/deliveries/:id/assign', '/deliveries/:id/assign'], async (req, res) => {
    const deliveryId = req.params.id;
    const { vehicle_id, driver_id, actor } = req.body;

    if (!vehicle_id || !driver_id) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Both vehicle_id and driver_id are required in the assignment payload.',
      });
    }

    const result = await fleetStore.assignDelivery(deliveryId, vehicle_id, driver_id, actor || 'Dispatcher');

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message,
      });
    }

    // Matches Section 4.2:
    // { "delivery_id": "D-204", "vehicle_id": "V-102", "driver_id": "DR-018", "status": "assigned", "message": "Assignment created successfully" }
    return res.status(200).json(result.data);
  });

  // POST /api/deliveries/bundle-assign (Assign 1 vehicle + 1 driver to multiple nearby orders)
  app.post(['/api/deliveries/bundle-assign', '/deliveries/bundle-assign'], async (req, res) => {
    const { delivery_ids, vehicle_id, driver_id, actor } = req.body;

    if (!delivery_ids || !Array.isArray(delivery_ids) || delivery_ids.length < 2) {
      return res.status(400).json({
        error: 'INVALID_BUNDLE_IDS',
        message: 'Must provide an array of at least 2 delivery IDs to create a co-delivery bundle.',
      });
    }

    if (!vehicle_id || !driver_id) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Both vehicle_id and driver_id are required.',
      });
    }

    const result = await fleetStore.assignBundle(delivery_ids, vehicle_id, driver_id, actor || 'Dispatcher Bundle');

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message,
      });
    }

    return res.status(200).json(result.data);
  });

  // GET /api/deliveries/co-delivery-suggestions (Finds pairs of nearby pending deliveries)
  app.get('/api/deliveries/co-delivery-suggestions', (req, res) => {
    const suggestions = fleetStore.getCoDeliverySuggestions();
    return res.status(200).json(suggestions);
  });

  // GET /api/deliveries/batches (List multi-stop batches)
  app.get('/api/deliveries/batches', (req, res) => {
    return res.status(200).json(fleetStore.getBatches());
  });

  // PATCH /deliveries/{id}/status (Update status; valid transitions; release resources)
  app.patch(['/api/deliveries/:id/status', '/deliveries/:id/status'], async (req, res) => {
    const deliveryId = req.params.id;
    const { status, actor } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'MISSING_STATUS',
        message: "Status field is required (e.g., 'in_transit', 'delivered', 'cancelled')",
      });
    }

    const result = await fleetStore.updateDeliveryStatus(deliveryId, status, actor || 'Dispatcher');

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message,
      });
    }

    return res.status(200).json({
      delivery_id: deliveryId,
      status: result.data?.status,
      resources_released: result.resources_released,
      message: result.message,
      delivery: result.data,
    });
  });

  // --- ASSIGNMENTS & AUDIT LOGS ---
  app.get('/api/assignments', (req, res) => {
    return res.status(200).json(fleetStore.getAssignments());
  });

  app.get('/api/audit-logs', (req, res) => {
    return res.status(200).json(fleetStore.getAuditLogs());
  });

  // --- STATS & KPIS ---
  app.get('/api/stats', (req, res) => {
    const vehicles = fleetStore.getVehicles();
    const drivers = fleetStore.getDrivers();
    const deliveries = fleetStore.getDeliveries();

    const availableVehicles = vehicles.filter((v) => v.status === 'available').length;
    const assignedVehicles = vehicles.filter((v) => v.status === 'assigned').length;
    const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;

    const availableDrivers = drivers.filter((d) => d.availability_status === 'available').length;
    const assignedDrivers = drivers.filter((d) => d.availability_status === 'assigned').length;

    const pendingDeliveries = deliveries.filter((d) => d.status === 'pending').length;
    const inTransitDeliveries = deliveries.filter((d) => d.status === 'in_transit').length;
    const deliveredDeliveries = deliveries.filter((d) => d.status === 'delivered').length;
    const activeDeliveries = deliveries.filter((d) => d.status === 'assigned' || d.status === 'in_transit').length;

    const totalFleet = vehicles.length;
    const utilisationPct = totalFleet > 0 ? Math.round((assignedVehicles / totalFleet) * 100) : 0;

    const totalBikes = vehicles.filter((v) => v.type === 'Bike' || v.type === 'Motorbike' || v.type === 'Electric Bike').length;
    const emergencyVehiclesCount = vehicles.filter((v) => v.is_emergency_reserve).length;
    const emergencyBikesCount = vehicles.filter((v) => v.is_emergency_reserve && (v.type === 'Bike' || v.type === 'Motorbike' || v.type === 'Electric Bike')).length;
    const emergencyDeliveriesCount = deliveries.filter((d) => d.is_emergency || d.priority === 'urgent').length;

    return res.status(200).json({
      total_vehicles: totalFleet,
      available_vehicles: availableVehicles,
      assigned_vehicles: assignedVehicles,
      maintenance_vehicles: maintenanceVehicles,
      total_drivers: drivers.length,
      available_drivers: availableDrivers,
      assigned_drivers: assignedDrivers,
      total_deliveries: deliveries.length,
      pending_deliveries: pendingDeliveries,
      in_transit_deliveries: inTransitDeliveries,
      delivered_deliveries: deliveredDeliveries,
      active_deliveries: activeDeliveries,
      fleet_utilisation_pct: utilisationPct,
      blocked_conflicts_count: fleetStore.getBlockedConflictsCount(),
      total_bikes: totalBikes,
      emergency_vehicles_count: emergencyVehiclesCount,
      emergency_bikes_count: emergencyBikesCount,
      emergency_deliveries_count: emergencyDeliveriesCount,
    });
  });

  // --- SEED / RESET ---
  app.post('/api/seed', (req, res) => {
    fleetStore.seedInitialData();
    return res.status(200).json({ message: 'FleetWise system state reset to clean seed data.' });
  });

  // --- AUTOMATED TEST RUNNER (Part 5 T1-T12) ---
  app.post('/api/tests/run', async (req, res) => {
    const { test_id } = req.body;
    if (!test_id) {
      return res.status(400).json({ error: 'test_id is required (e.g. T1, T2... T12)' });
    }
    const result = await fleetStore.runTest(test_id);
    return res.status(200).json(result);
  });

  app.post('/api/tests/run-all', async (req, res) => {
    const results = await fleetStore.runAllTests();
    const passedCount = results.filter((r) => r.status === 'passed').length;
    return res.status(200).json({
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
      all_passed: passedCount === results.length,
    });
  });

  // --- MOUNT VITE DEV MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FleetWise Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
