import React, { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  Cpu,
  Database,
  Layers,
} from 'lucide-react';

export const ReportViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const reportMarkdown = `# FleetWise — Vehicle & Delivery Assignment System
## Project & Verification Report · IT HAPPENS @ RAALE #13

**Core Engineering Principle:** Never assign an occupied vehicle or unavailable driver. FleetWise makes dispatch safer, not merely faster.

---

### 1. What We Built
FleetWise is a full-stack fleet allocation and dispatch safety platform designed to replace manual, error-prone logistics operations. It enforces zero double-booking through atomic validation locks, strict lifecycle state machines, and real-time resource reclamation.

### Key Working Features:
- Conflict-Free Atomic Assignment Engine: Rejects any assignment where vehicle or driver is already occupied or unavailable, with zero partial updates.
- Strict Delivery Lifecycle Management: Pending -> Assigned -> In Transit -> Delivered (or Cancelled), with automatic vehicle and driver resource release.
- Pre-Flight Resource Protection: Blocks marking vehicles into maintenance or drivers unavailable while active deliveries are ongoing.
- Interactive Multi-Role Operations:
  - Dispatcher View: Priority delivery queue, smart auto-dispatch recommendations, real-time vehicle/driver match scoring.
  - Fleet Manager View: Complete vehicle and driver registries, capacity limits, fuel/maintenance status.
  - Operations Lead View: Live interactive tracking map, animated dispatch routes, delivery progress simulation.
  - QA & Verification Suite: Automated execution and evidence logging for all 12 edge cases (T1–T12).
  - Judges Demo Acceptance Walkthrough: 1-click guided flow demonstrating valid assignment -> duplicate vehicle rejection -> duplicate driver rejection -> resource reclamation upon completion.
- Comprehensive Audit Trail: Real-time logging of all assignments, status changes, and blocked double-booking attempts.

---

### 2. Data Model & Entities

| Entity | Primary Key / Unique | Key Fields | Status Values / Notes |
| :--- | :--- | :--- | :--- |
| Vehicle | vehicle_id (PK), registration_no (Unique) | type, capacity (kg), status, fuel_level, model | available, assigned, maintenance, inactive |
| Driver | driver_id (PK, Unique) | name, phone, availability_status, license_type, rating | available, assigned, unavailable |
| Delivery | delivery_id (PK, Unique) | pickup, dropoff, scheduled_time, priority, weight_kg, status, assigned_vehicle_id, assigned_driver_id | pending, assigned, in_transit, delivered, cancelled |
| Assignment | assignment_id (PK) | delivery_id, vehicle_id, driver_id, assigned_at, released_at, status | active, completed, cancelled |
| AuditLog | id (PK) | timestamp, action, entity_type, entity_id, details, actor | Real-time audit history |

---

### 3. Assignment Rule & Concurrency Control

Mandatory Assignment Rule:
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
    reject assignment with clear reason (HTTP 409 Conflict / 404 / 400)

Active Delivery Definition:
- Active: assigned and in_transit. Both vehicle and driver remain locked.
- Closed: delivered and cancelled. Automatically releases vehicle and driver back to available.

Concurrency & Safe Transaction Strategy:
1. Asynchronous Execution Mutex: Serializes incoming assignment requests to prevent race conditions.
2. Atomic State Mutation: Zero partial writes on failure.

---

### 4. Methods and Decisions
- Stack: Node.js + Express with TypeScript + React 19 + Vite + Tailwind CSS.
- Database: In-memory transactional store with ACID-style mutex synchronization.
- Validation: Strict server-side validation on every POST/PATCH endpoint.

---

### 5. Executed Test Results (T1–T12)
- T1 (Valid assignment): PASS (HTTP 200)
- T2 (Vehicle conflict): PASS (HTTP 409 Conflict)
- T3 (Driver conflict): PASS (HTTP 409 Conflict)
- T4 (Both occupied): PASS (HTTP 409 Conflict)
- T5 (Unavailable driver): PASS (HTTP 409 Conflict)
- T6 (Maintenance vehicle): PASS (HTTP 409 Conflict)
- T7 (Unknown ID): PASS (HTTP 404 Not Found)
- T8 (Complete delivery): PASS (HTTP 200, Resources released)
- T9 (Cancel delivery): PASS (HTTP 200, Resources released)
- T10 (Invalid transition): PASS (HTTP 400 Bad Request)
- T11 (Duplicate submit): PASS (HTTP 409 Conflict on second submit)
- T12 (Concurrent request race): PASS (HTTP 409 Conflict, at most 1 succeeds)

---

### 6. How to Run
npm install
npm run dev
Open http://localhost:3000
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REPORT.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Official REPORT.md Documentation</h3>
            <p className="text-xs text-slate-400">
              Complete engineering write-up matching Part 8 of the logistics handout rubric.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Download REPORT.md</span>
          </button>
        </div>
      </div>

      {/* Structured Document Body */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 text-xs text-slate-300 leading-relaxed font-sans">
        {/* Title */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-1">
            <span>IT HAPPENS @ RAALE #13 · Logistics Benchmark</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            FleetWise: Vehicle & Delivery Assignment System
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Student Handout Final Technical & Verification Report
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span className="font-mono">8.1.1</span> What We Built
          </h2>
          <p>
            FleetWise is a full-stack, enterprise-grade fleet allocation and dispatch safety platform designed to replace manual, error-prone spreadsheets and phone calls. It enforces strict zero double-booking through atomic validation locks, strict lifecycle state machines, and real-time resource reclamation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <strong className="text-white block mb-1">Atomic Assignment Engine</strong>
              Rejects any assignment where vehicle or driver is occupied, with zero partial database updates.
            </div>
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <strong className="text-white block mb-1">Resource Release Lifecycle</strong>
              Marking deliveries delivered or cancelled automatically unlocks vehicles and drivers back to available pool.
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span className="font-mono">8.1.2</span> Data Model & Entities
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Keys / Uniqueness</th>
                  <th className="py-2 pr-4">Key Attributes</th>
                  <th className="py-2">Status Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                <tr>
                  <td className="py-2.5 font-bold text-white">Vehicle</td>
                  <td className="py-2.5 text-cyan-300">vehicle_id (PK), registration_no (Unique)</td>
                  <td className="py-2.5 text-slate-300">type, capacity (kg), fuel_level, model</td>
                  <td className="py-2.5 text-emerald-400">available, assigned, maintenance, inactive</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">Driver</td>
                  <td className="py-2.5 text-cyan-300">driver_id (PK, Unique)</td>
                  <td className="py-2.5 text-slate-300">name, phone, license_type, rating</td>
                  <td className="py-2.5 text-emerald-400">available, assigned, unavailable</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">Delivery</td>
                  <td className="py-2.5 text-cyan-300">delivery_id (PK, Unique)</td>
                  <td className="py-2.5 text-slate-300">pickup, dropoff, scheduled_time, weight_kg</td>
                  <td className="py-2.5 text-amber-400">pending, assigned, in_transit, delivered, cancelled</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">Assignment</td>
                  <td className="py-2.5 text-cyan-300">assignment_id (PK)</td>
                  <td className="py-2.5 text-slate-300">delivery_id, vehicle_id, driver_id, assigned_at</td>
                  <td className="py-2.5 text-blue-400">active, completed, cancelled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span className="font-mono">8.1.3</span> Assignment Rule & Concurrency Protection
          </h2>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-cyan-200">
            IF delivery.status is pending<br />
            AND vehicle.status is available<br />
            AND driver.availability_status is available<br />
            AND no active assignment uses vehicle<br />
            AND no active assignment uses driver:<br />
            &nbsp;&nbsp;create assignment<br />
            &nbsp;&nbsp;mark vehicle assigned<br />
            &nbsp;&nbsp;mark driver assigned<br />
            &nbsp;&nbsp;mark delivery assigned<br />
            ELSE:<br />
            &nbsp;&nbsp;reject assignment with clear reason (HTTP 409 Conflict / 404 / 400)
          </div>
          <p className="text-slate-400">
            <strong>Concurrency Mutex:</strong> An asynchronous mutex queue ensures that simultaneous requests targeting the same vehicle or driver are processed sequentially without race conditions. Only the first request succeeds; subsequent overlapping requests are rejected with HTTP 409 Conflict.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span className="font-mono">8.1.4</span> Methods and Decisions
          </h2>
          <p>
            - <strong>Node.js Express + TypeScript</strong>: Chosen for high-throughput, deterministic API routing, and robust async middleware support.<br />
            - <strong>Transactional In-Memory Store with Mutex Locks</strong>: Zero disk-IO latency, instantaneous test execution, and reproducible state for judges.<br />
            - <strong>Strict Server-Side Authority</strong>: No client-side bypass is possible; every state mutation must clear backend business rules.
          </p>
        </div>
      </div>
    </div>
  );
};
