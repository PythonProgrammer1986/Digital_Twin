import React from 'react';
import { SimConfig, SimResult } from '../types/simulation';
import { formatINR } from '../utils/currency';
import {
  FileText,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getMonteCarloOneLiner } from '../utils/monteCarloExplanation';

interface ReportViewProps {
  config: SimConfig;
  result: SimResult;
  onOpenOptimizer: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  config,
  result,
  onOpenOptimizer,
}) => {
  const { monteCarlo, losses } = result;

  // Export CSV of machine lead times
  const exportCsv = () => {
    const headers = ['Unit ID', 'Name', 'Release Time (h)', 'Finish Time (h)', 'Lead Time (h)', 'Material Delay (h)', 'Rework (h)', 'On Time'];
    const rows = result.machines.map((m) => [
      m.id,
      m.name,
      m.releaseTime.toFixed(2),
      m.finishTime.toFixed(2),
      m.leadTime.toFixed(2),
      m.totalDelay.toFixed(2),
      m.totalRework.toFixed(2),
      m.finishTime <= result.horizonHours ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MT65_Simulation_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full JSON config and results
  const exportJson = () => {
    const data = {
      timestamp: new Date().toISOString(),
      config,
      result: {
        completedCount: result.completedCount,
        horizonHours: result.horizonHours,
        taktHours: result.taktHours,
        losses: result.losses,
        primaryConstraint: result.primaryConstraint,
        lineBalanceEfficiency: result.lineBalanceEfficiency,
        monteCarlo: result.monteCarlo,
        totalCost: result.totalOperatingCost,
        netMargin: result.netMargin,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MT65_Simulation_Data_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Executive Plant Report & Engineering Recommendations
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprehensive production feasibility audit, bottleneck diagnostics, and optimization plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={exportJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={onOpenOptimizer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors ml-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Run Optimizer
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8 shadow-2xl text-slate-100 print:bg-white print:text-black print:border-none print:p-2">
        {/* Document Title Header */}
        <div className="border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-cyan-400 print:text-slate-600 uppercase tracking-widest block font-bold">
                OPERATIONS AUDIT & CAPACITY SIMULATION
              </span>
              <h2 className="text-2xl font-black text-slate-100 print:text-slate-900 mt-1">
                MT65 Production Line Digital Twin Report
              </h2>
              <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Nashik Heavy Equipment Manufacturing Facility · Discrete Event Simulation Audit
              </div>
            </div>

            <div className="text-right font-mono text-xs text-slate-400 print:text-slate-600">
              <div>Audit Date: October 2026</div>
              <div>Horizon: {result.horizonHours.toFixed(1)} Available Hours</div>
              <div>Demand: {config.demand} Units / Month</div>
            </div>
          </div>
        </div>

        {/* 1. Executive Performance Scorecard */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700 mb-3">
            1. Executive Performance Scorecard
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monthly Target</span>
              <span className="text-xl font-mono font-bold text-slate-100 print:text-slate-900">{config.demand} Trucks</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Required quota</span>
            </div>

            <div className="bg-slate-950/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Completed Output</span>
              <span className="text-xl font-mono font-bold text-cyan-400 print:text-blue-700">
                {result.completedCount} / {config.demand}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {((result.completedCount / config.demand) * 100).toFixed(0)}% achievement
              </span>
            </div>

            <div className="bg-slate-950/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Delivery Confidence</span>
              <span
                className={`text-xl font-mono font-bold ${
                  monteCarlo.pMeetTarget >= 85
                    ? 'text-emerald-400 print:text-emerald-700'
                    : 'text-amber-400 print:text-amber-700'
                }`}
              >
                {monteCarlo.pMeetTarget}%
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Monte Carlo probability</span>
            </div>

            <div className="bg-slate-950/70 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Line Balance Efficiency</span>
              <span className="text-xl font-mono font-bold text-slate-100 print:text-slate-900">
                {result.lineBalanceEfficiency.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Smoothness index: {result.smoothnessIndex.toFixed(1)}</span>
            </div>
          </div>

          {/* Plain-Language Monte Carlo Single-Line Explanation */}
          <div className="mt-3 p-3.5 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-lg flex items-start sm:items-center gap-3">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 print:hidden" />
            <div className="text-xs text-slate-300 print:text-slate-800 leading-relaxed">
              <span className="font-semibold text-cyan-400 print:text-slate-900 font-mono text-[10px] uppercase tracking-wider block sm:inline sm:mr-2">
                Monte Carlo Risk Result (Single-Line Summary):
              </span>
              {getMonteCarloOneLiner(monteCarlo, config.demand, config.mcRuns)}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Headcount</span>
            <span className="text-lg font-mono font-bold text-slate-200 print:text-slate-900">
              {result.totalPeople} Personnel
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {config.saStations * config.saPeople} Feeder +{' '}
              {config.stations.reduce((a, s) => a + s.copies * s.people, 0)} Main Line
            </span>
          </div>

          <div className="bg-slate-950/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Operating Cost (INR)</span>
            <span className="text-lg font-mono font-bold text-slate-200 print:text-slate-900">
              {formatINR(result.totalOperatingCost)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Labor + station tooling amortized</span>
          </div>

          <div className="bg-slate-950/50 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg p-3.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estimated Net Margin (INR)</span>
            <span className="text-lg font-mono font-bold text-emerald-400 print:text-emerald-700">
              {formatINR(result.netMargin)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Based on {result.completedCount} delivered trucks</span>
          </div>
        </div>

        {/* 2. Key Diagnostic Findings */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
            2. Detailed Diagnostic Findings
          </h4>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3.5 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg">
              <div className="font-bold text-slate-200 print:text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Primary Line Constraint: {result.primaryConstraint}
              </div>
              <p className="text-slate-300 print:text-slate-700 mt-1">
                The pacing bottleneck limits line speed to its effective cycle time. Any upstream station produces faster than this rate, causing work-in-progress (WIP) accumulation and queue delays, while downstream stations experience starvation.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg">
              <div className="font-bold text-slate-200 print:text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                Loss Pareto Analysis: {losses.total.toFixed(1)} Non-Value-Added Hours
              </div>
              <p className="text-slate-300 print:text-slate-700 mt-1">
                Material & subassembly shortages accounted for <strong>{losses.material.toFixed(1)} h</strong>, quality inspection defect reworks cost <strong>{losses.quality.toFixed(1)} h</strong>, shared overhead crane contention cost <strong>{losses.crane.toFixed(1)} h</strong>, and line transfer queue waits cost <strong>{losses.queue.toFixed(1)} h</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Actionable Engineering Recommendations */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
            3. Prioritized Recommendations for Plant Leadership
          </h4>

          <div className="space-y-2 text-xs">
            {monteCarlo.pMeetTarget < 80 ? (
              <div className="p-3 bg-red-950/30 print:bg-red-50 border border-red-800/40 print:border-red-200 rounded-lg text-slate-200 print:text-slate-900">
                <strong>CRITICAL: Resilience Deficit (&lt;80% target probability)</strong>
                <p className="text-slate-300 print:text-slate-700 mt-1">
                  The current configuration fails to reliably hit the monthly demand of {config.demand} units under natural variability. Add operators or parallel bays to the bottleneck station immediately using the Line Optimizer.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/30 print:bg-emerald-50 border border-emerald-800/40 print:border-emerald-200 rounded-lg text-slate-200 print:text-slate-900">
                <strong>TARGET ACHIEVABLE: Resilient Line (&ge;80% confidence)</strong>
                <p className="text-slate-300 print:text-slate-700 mt-1">
                  The line delivers a solid confidence buffer to absorb expected supplier delay spikes and worker absenteeism.
                </p>
              </div>
            )}

            <div className="p-3 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg">
              <strong className="text-slate-200 print:text-slate-900">1. Subassembly Kitting & Buffer Sizing</strong>
              <p className="text-slate-300 print:text-slate-700 mt-0.5">
                Increase safety stock for high-risk components (Cabin Module: 12% shortage risk, Engine Radiator: 10% risk) by maintaining 2 pre-kitted modules in buffer to prevent main line gate stoppages.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg">
              <strong className="text-slate-200 print:text-slate-900">2. Overhead Crane Contention Mitigation</strong>
              <p className="text-slate-300 print:text-slate-700 mt-0.5">
                Stagger heavy lifting windows between Chassis (S1) and Engine Drop (S3) by 4 hours to avoid dual-crane blocking locks.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-200 rounded-lg">
              <strong className="text-slate-200 print:text-slate-900">3. First-Time-Through Quality Hardening</strong>
              <p className="text-slate-300 print:text-slate-700 mt-0.5">
                Enforce in-station torque-angle and hydraulic pressure verification before advancing to PDI to drop gate rework from {config.qualityFailPercent}% down to &lt;2%.
              </p>
            </div>
          </div>
        </div>

        {/* Station-by-Station Configuration Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700 mb-2">
            4. Detailed Workstation Layout
          </h4>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-mono text-[10px] uppercase border-b border-slate-800 print:border-slate-200">
              <tr>
                <th className="py-2 px-3">Station</th>
                <th className="py-2 px-3">Work (MH)</th>
                <th className="py-2 px-3">Operators</th>
                <th className="py-2 px-3">Bays</th>
                <th className="py-2 px-3">Cycle Time</th>
                <th className="py-2 px-3">Status vs Takt</th>
                <th className="py-2 px-3 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-slate-200 font-mono">
              {config.stations.map((st, i) => {
                const ct = result.stationCycleTimes[i];
                const isOver = ct > result.taktHours;
                return (
                  <tr key={st.id}>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-200 print:text-slate-900">
                      S{i + 1}: {st.name}
                    </td>
                    <td className="py-2 px-3">{st.mh} MH</td>
                    <td className="py-2 px-3">{st.people} (max {st.maxPeople})</td>
                    <td className="py-2 px-3">{st.copies} bay(s)</td>
                    <td className="py-2 px-3 font-bold text-slate-200 print:text-slate-900">{ct.toFixed(1)} h</td>
                    <td className="py-2 px-3">
                      {isOver ? (
                        <span className="text-amber-400 print:text-amber-700 font-bold">Over (+{(ct - result.taktHours).toFixed(1)}h)</span>
                      ) : (
                        <span className="text-emerald-400 print:text-emerald-700">OK (-{(result.taktHours - ct).toFixed(1)}h)</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">{result.stationUtilization[i]}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
