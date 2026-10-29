# FleetWise — Vehicle & Delivery Assignment System
## Project & Verification Report · IT HAPPENS @ RAALE #13

**Core Engineering Principle:** Never assign an occupied vehicle or unavailable driver. FleetWise makes dispatch safer, not merely faster.

---

## 1. What We Built
FleetWise is a full-stack, enterprise-grade fleet allocation and dispatch safety platform designed to replace manual, error-prone logistics operations. It enforces zero double-booking through atomic validation locks, strict lifecycle state machines, and real-time resource reclamation.

### Key Working Features:
- **Conflict-Free Atomic Assignment Engine**: Rejects any assignment where vehicle or driver is already occupied or unavailable, with zero partial updates.
- **Strict Delivery Lifecycle Management**: Pending $\rightarrow$ Assigned $\rightarrow$ In Transit $\rightarrow$ Delivered (or Cancelled), with automatic vehicle and driver resource release.
- **Pre-Flight Resource Protection**: Blocks marking vehicles into maintenance or drivers unavailable while active deliveries are ongoing.
- **Interactive Multi-Role Operations**:
  - **Dispatcher View**: Priority delivery queue, smart auto-dispatch recommendations, real-time vehicle/driver match scoring.
  - **Fleet Manager View**: Complete vehicle and driver registries, capacity limits, fuel/maintenance status.
  - **Operations Lead View**: Live interactive tracking map, animated dispatch routes, delivery progress simulation.
  - **QA & Verification Suite**: Automated execution and evidence logging for all 12 edge cases (T1–T12).
  - **Judges Demo Acceptance Walkthrough**: 1-click guided flow demonstrating valid assignment $\rightarrow$ duplicate vehicle rejection $\rightarrow$ duplicate driver rejection $\rightarrow$ resource reclamation upon completion.
- **Comprehensive Audit Trail**: Real-time logging of all assignments, status changes, and blocked double-booking attempts.

---

## 2. Data Model

### Entities & Relationships

| Entity | Primary Key / Unique | Key Fields | Status Values / Notes |
| :--- | :--- | :--- | :--- |
| **Vehicle** | `vehicle_id` (PK)<br>`registration_no` (Unique) | `type`, `capacity` (kg), `status`, `fuel_level`, `model`, `current_delivery_id` | `available`, `assigned`, `maintenance`, `inactive`. Rejects duplicate registration numbers. |
| **Driver** | `driver_id` (PK, Unique) | `name`, `phone`, `availability_status`, `license_type`, `rating`, `current_delivery_id` | `available`, `assigned`, `unavailable`. Rejects duplicate driver IDs. |
| **Delivery** | `delivery_id` (PK, Unique) | `pickup`, `dropoff`, `scheduled_time`, `priority`, `weight_kg`, `status`, `assigned_vehicle_id`, `assigned_driver_id`, `assigned_at`, `completed_at` | `pending`, `assigned`, `in_transit`, `delivered`, `cancelled`. Active states: `assigned`, `in_transit`. |
| **Assignment** | `assignment_id` (PK) | `delivery_id`, `vehicle_id`, `driver_id`, `assigned_at`, `released_at`, `status` | `active`, `completed`, `cancelled`. Prevents overlapping active assignments. |
| **AuditLog** | `id` (PK) | `timestamp`, `action`, `entity_type`, `entity_id`, `details`, `actor`, `severity` | Real-time audit history of every mutation and blocked conflict. |

---

## 3. Assignment Rule & Concurrency Control

### Mandatory Assignment Rule
```text
IF delivery.status is pending
AND vehicle.status is available
AND driver.availability_status is available
AND no active assignment uses vehicle
AND no active assignment uses driver:
    create assignment
    mark vehicle assigned
    mark driver assigned
    mark delivery assigned
ELSE:
    reject assignment with clear reason (HTTP 409 Conflict / HTTP 404 / HTTP 400)
```

### Active Delivery Definition
- **Active**: `assigned` and `in_transit`. Both vehicle and driver remain locked.
- **Closed**: `delivered` and `cancelled`. These automatically release vehicle and driver back to `available` state.

### Concurrency & Safe Transaction Strategy
To prevent race conditions where two simultaneous requests attempt to reserve the same vehicle or driver (Test T12):
1. **Asynchronous Execution Mutex**: Requests acquire a serial lock before checking entity eligibility and committing changes.
2. **Atomic State Mutation**: The vehicle status, driver status, delivery status, and assignment record are updated in a single synchronous transactional block. If any eligibility check fails, zero records are modified.
3. **Double Verification**: Both the in-memory entity status flags (`vehicle.status === 'available'`) and the active assignments table are verified.

---

## 4. Methods and Decisions

- **Backend Stack**: Node.js + Express with TypeScript. Chosen for fast startup, deterministic routing, and native JSON handling.
- **Frontend Stack**: React 19 + Vite + Tailwind CSS + Lucide Icons + Motion. High visual fidelity with sub-second feedback for operators.
- **Database / Store Choice**: In-memory transactional store with ACID-style mutex synchronization. Chosen to eliminate external network dependencies, achieve instant microsecond test executions, and ensure reproducible zero-latency demos.
- **Validation Approach**: Strict server-side validation on every POST/PATCH endpoint. The frontend provides real-time helper indicators, but the server is the ultimate authority.
- **Rejected Alternatives**:
  - *Client-only state*: Rejected because concurrent requests cannot be coordinated safely and test suites cannot prove API contract compliance.
  - *Blind status overwrites*: Rejected because marking a delivery delivered without atomic release of attached resources would cause ghost vehicle/driver locks.

---

## 5. Test Results (All 12 Mandatory Test Cases)

| Test ID | Test Name | Action Performed | Expected Result | Observed Result | HTTP Status | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **T1** | Valid Assignment | Assign available vehicle & driver to pending delivery | Success (200); all 3 records reflect assignment | All 3 entities marked `assigned`, assignment record created | `200 OK` | **PASS** |
| **T2** | Vehicle Conflict | Assign same vehicle to second active delivery | Rejected (409); no records partially changed | `409 Conflict`: "Vehicle is already assigned to an active delivery" | `409 Conflict` | **PASS** |
| **T3** | Driver Conflict | Assign same driver to second active delivery | Rejected (409); no records partially changed | `409 Conflict`: "Driver is already assigned to an active delivery" | `409 Conflict` | **PASS** |
| **T4** | Both Occupied | Choose occupied vehicle and occupied driver | Rejected with clear reason (409) | `409 Conflict`: "Both vehicle and driver are unavailable or occupied" | `409 Conflict` | **PASS** |
| **T5** | Unavailable Driver | Set driver unavailable, then attempt assignment | Rejected (409) | `409 Conflict`: "Driver is currently marked unavailable" | `409 Conflict` | **PASS** |
| **T6** | Maintenance Vehicle | Select vehicle in maintenance status | Rejected (409) | `409 Conflict`: "Vehicle is currently under maintenance" | `409 Conflict` | **PASS** |
| **T7** | Unknown ID | Use missing vehicle, driver, or delivery ID | Rejected safely (404); no server crash | `404 Not Found`: "Delivery / Vehicle / Driver does not exist" | `404 Not Found` | **PASS** |
| **T8** | Complete Delivery | Mark assigned/in-transit delivery delivered | Delivery closes; vehicle & driver become available | Delivery status $\rightarrow$ `delivered`; both resources restored to `available` | `200 OK` | **PASS** |
| **T9** | Cancel Delivery | Cancel eligible assigned delivery | Status changes to cancelled; resources released | Delivery status $\rightarrow$ `cancelled`; vehicle & driver released | `200 OK` | **PASS** |
| **T10** | Invalid Transition | Mark pending delivery directly as delivered | Rejected (400) by state machine | `400 Bad Request`: "Cannot transition from 'pending' to 'delivered'" | `400 Bad Request` | **PASS** |
| **T11** | Duplicate Submit | Submit same assignment twice in rapid succession | First succeeds (200), duplicate rejected (409) | Exactly 1 assignment record created; second call rejected safely | `409 Conflict` | **PASS** |
| **T12** | Concurrent Request | Two simultaneous async requests attempt same vehicle | At most one succeeds; mutex blocks race | Request A received `200 OK`; Request B received `409 Conflict` | `409 Conflict` | **PASS** |

---

## 6. Team Work & Progress
- **Architecture & API**: Server setup, REST endpoints, mutex concurrency locking, state machine transitions.
- **Frontend & UX**: Interactive multi-role dashboard, real-time conflict prevention modal, live transit map.
- **Testing & Verification**: Automated T1–T12 test runner, judges demo flow, REPORT.md generation.
- **Dead End Encountered & Resolved**: Attempted optimistic client-side lock checking without a centralized backend mutex; during rapid duplicate clicks, both requests passed client validation before the first response arrived. Resolved by implementing a server-side async mutex queue in `fleetStore.ts`.

---

## 7. Limitations & Next Steps
- **Current Limitation**: In-memory state restarts on process termination.
  - *Next Step*: Attach persistent SQLite/PostgreSQL storage using Drizzle ORM while keeping the same mutex transaction layer.
- **Current Limitation**: Delivery routes are simulated based on hub coordinates.
  - *Next Step*: Integrate Google Maps Platform Directions & Routes API for turn-by-turn live navigation and dynamic traffic ETA.
- **Current Limitation**: Manual vehicle capacity assignment.
  - *Next Step*: Automated multi-stop bin packing algorithm to group multiple smaller deliveries into a single truck route.

---

## 8. How to Run & Verify
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server
npm run dev

# 3. Access Web UI
# Open http://localhost:3000

# 4. Run automated test suite via API
curl -X POST http://localhost:3000/api/tests/run-all

# 5. Check service health
curl http://localhost:3000/api/health
```
