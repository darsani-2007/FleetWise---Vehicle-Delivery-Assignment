import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Code,
  Flame,
  Zap,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { TestCaseResult, Vehicle, Driver, Delivery } from '../types';
import { runSingleTest, runAllTests } from '../api';

interface TestSuiteRunnerProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  deliveries: Delivery[];
  onRefreshData: () => Promise<void>;
}

const INITIAL_TEST_METADATA: Array<{
  id: string;
  name: string;
  action: string;
  expected_result: string;
}> = [
  {
    id: 'T1',
    name: 'Valid Assignment',
    action: 'Assign available vehicle and driver to pending delivery.',
    expected_result: 'Success (200/201); all three records reflect assignment.',
  },
  {
    id: 'T2',
    name: 'Vehicle Conflict',
    action: 'Assign same vehicle to second active delivery.',
    expected_result: 'Rejected (409 Conflict); no records partially changed.',
  },
  {
    id: 'T3',
    name: 'Driver Conflict',
    action: 'Assign same driver to second active delivery.',
    expected_result: 'Rejected (409 Conflict); no records partially changed.',
  },
  {
    id: 'T4',
    name: 'Both Occupied',
    action: 'Choose occupied vehicle and occupied driver.',
    expected_result: 'Rejected with clear reason (409 Conflict).',
  },
  {
    id: 'T5',
    name: 'Unavailable Driver',
    action: 'Set driver unavailable, then assign.',
    expected_result: 'Rejected (409 Conflict: Driver unavailable).',
  },
  {
    id: 'T6',
    name: 'Maintenance Vehicle',
    action: 'Select vehicle in maintenance.',
    expected_result: 'Rejected (409 Conflict: Vehicle in maintenance).',
  },
  {
    id: 'T7',
    name: 'Unknown ID',
    action: 'Use missing vehicle, driver or delivery ID.',
    expected_result: 'Rejected safely with 404; no crash.',
  },
  {
    id: 'T8',
    name: 'Complete Delivery',
    action: 'Mark assigned/in-transit delivery delivered.',
    expected_result: 'Delivery closes; vehicle and driver become available.',
  },
  {
    id: 'T9',
    name: 'Cancel Delivery',
    action: 'Cancel eligible delivery.',
    expected_result: 'Status changes; resources released consistently.',
  },
  {
    id: 'T10',
    name: 'Invalid Transition',
    action: 'Mark pending delivery delivered directly.',
    expected_result: 'Rejected (400) by documented workflow.',
  },
  {
    id: 'T11',
    name: 'Duplicate Submit',
    action: 'Submit same assignment twice quickly.',
    expected_result: 'No duplicate or inconsistent active assignment.',
  },
  {
    id: 'T12',
    name: 'Concurrent Request Race',
    action: 'Two requests attempt same vehicle at once.',
    expected_result: 'At most one succeeds (409 mutex lock).',
  },
];

export const TestSuiteRunner: React.FC<TestSuiteRunnerProps> = ({
  vehicles,
  drivers,
  deliveries,
  onRefreshData,
}) => {
  const [testResults, setTestResults] = useState<Record<string, TestCaseResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Manual Conflict Sandbox
  const [sandboxVehicleId, setSandboxVehicleId] = useState(vehicles[0]?.vehicle_id || '');
  const [sandboxDriverId, setSandboxDriverId] = useState(drivers[0]?.driver_id || '');
  const [sandboxDeliveryId, setSandboxDeliveryId] = useState(deliveries[0]?.delivery_id || '');
  const [sandboxOutput, setSandboxOutput] = useState<{ status: number; body: any } | null>(null);
  const [isSandboxTesting, setIsSandboxTesting] = useState(false);

  const handleRunAll = async () => {
    setIsRunningAll(true);
    try {
      const response = await runAllTests();
      const resultsMap: Record<string, TestCaseResult> = {};
      for (const res of response.results) {
        resultsMap[res.id] = res;
      }
      setTestResults(resultsMap);
      await onRefreshData();
    } catch (err) {
      console.error('Failed to run all tests:', err);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleRunSingle = async (testId: string) => {
    setRunningTestId(testId);
    try {
      const res = await runSingleTest(testId);
      setTestResults((prev) => ({ ...prev, [testId]: res }));
      setExpandedTestId(testId);
      await onRefreshData();
    } catch (err) {
      console.error(`Failed to run test ${testId}:`, err);
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunSandbox = async () => {
    if (!sandboxDeliveryId || !sandboxVehicleId || !sandboxDriverId) return;
    setIsSandboxTesting(true);
    setSandboxOutput(null);
    try {
      const res = await fetch(`/api/deliveries/${sandboxDeliveryId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: sandboxVehicleId,
          driver_id: sandboxDriverId,
          actor: 'Manual QA Sandbox',
        }),
      });
      const body = await res.json();
      setSandboxOutput({ status: res.status, body });
      await onRefreshData();
    } catch (err: any) {
      setSandboxOutput({ status: 500, body: { error: err.message } });
    } finally {
      setIsSandboxTesting(false);
    }
  };

  const totalRun = Object.keys(testResults).length;
  const passedCount = Object.values(testResults).filter((r) => r.status === 'passed').length;

  return (
    <div className="space-y-6">
      {/* Header & Run All Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              Automated Business Rules & Edge-Case Test Suite
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official IT HAPPENS @ RAALE #13 Part 5 specifications (T1 through T12). Proves zero double-booking and concurrency isolation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalRun > 0 && (
            <div className="text-right">
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {passedCount}/{totalRun} Passed
              </span>
              <div className="text-[10px] text-slate-400">
                {Math.round((passedCount / totalRun) * 100)}% Pass Rate
              </div>
            </div>
          )}

          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            {isRunningAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run All 12 Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800">
          {INITIAL_TEST_METADATA.map((test) => {
            const result = testResults[test.id];
            const isPassed = result?.status === 'passed';
            const isFailed = result?.status === 'failed';
            const isRunning = runningTestId === test.id;
            const isExpanded = expandedTestId === test.id;

            return (
              <div key={test.id} className="transition-colors hover:bg-slate-800/40">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: ID & Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
                      {test.id}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{test.name}</h4>
                        {result && (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border ${
                              isPassed
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}
                          >
                            {isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        )}
                        {result?.http_status && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            HTTP {result.http_status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{test.action}</p>
                      <p className="text-[11px] text-slate-500">
                        <strong className="text-slate-400">Expected:</strong> {test.expected_result}
                      </p>
                      {result?.observed_result && (
                        <p className={`text-[11px] font-medium ${isPassed ? 'text-emerald-400/90' : 'text-rose-400'}`}>
                          <strong>Observed:</strong> {result.observed_result}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {result && (
                      <button
                        onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Payload</span>
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    )}

                    <button
                      onClick={() => handleRunSingle(test.id)}
                      disabled={isRunning || isRunningAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition active:scale-95 disabled:opacity-50"
                    >
                      {isRunning ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>Run Test</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Inspection Drawer */}
                {isExpanded && result && (
                  <div className="bg-slate-950 p-4 border-t border-slate-800 text-xs font-mono space-y-3">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        API Request / Input Payload:
                      </span>
                      <pre className="bg-slate-900 p-2.5 rounded-lg text-cyan-300 overflow-x-auto text-[11px]">
                        {JSON.stringify(result.payload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                        Server HTTP Response (Status: {result.http_status}):
                      </span>
                      <pre className="bg-slate-900 p-2.5 rounded-lg text-emerald-300 overflow-x-auto text-[11px]">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    </div>
                    {result.duration_ms !== undefined && (
                      <p className="text-[10px] text-slate-500">
                        Execution Latency: {result.duration_ms}ms · Tested at {result.run_at}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Conflict Sandbox for Judges & Operators */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h4 className="text-base font-bold text-white">Live Conflict Simulator Sandbox</h4>
        </div>
        <p className="text-xs text-slate-400">
          Try to manually force an assignment using an already-assigned or unavailable vehicle/driver. Watch how the server-side mutex and business rules reject double-bookings immediately with HTTP 409 Conflict.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
              Target Delivery
            </label>
            <select
              value={sandboxDeliveryId}
              onChange={(e) => setSandboxDeliveryId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
            >
              {deliveries.map((d) => (
                <option key={d.delivery_id} value={d.delivery_id}>
                  {d.delivery_id} ({d.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
              Select Vehicle
            </label>
            <select
              value={sandboxVehicleId}
              onChange={(e) => setSandboxVehicleId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_id} — {v.status.toUpperCase()} ({v.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[10px]">
              Select Driver
            </label>
            <select
              value={sandboxDriverId}
              onChange={(e) => setSandboxDriverId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500"
            >
              {drivers.map((d) => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.name} — {d.availability_status.toUpperCase()} ({d.driver_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRunSandbox}
          disabled={isSandboxTesting}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition active:scale-95 disabled:opacity-50"
        >
          <Terminal className="w-4 h-4" />
          <span>Execute Sandbox Assignment Request</span>
        </button>

        {sandboxOutput && (
          <div
            className={`p-4 rounded-2xl border text-xs font-mono space-y-1 ${
              sandboxOutput.status === 200
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border-rose-800 text-rose-200'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              <span>HTTP Status: {sandboxOutput.status}</span>
              <span>{sandboxOutput.status === 200 ? 'SUCCESS' : 'REJECTED (SAFE GUARD)'}</span>
            </div>
            <pre className="text-[11px] overflow-x-auto">
              {JSON.stringify(sandboxOutput.body, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
