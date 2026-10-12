import React from 'react';
import { SimConfig, SimResult } from '../types/simulation';
import {
  TrendingUp,
  AlertCircle,
  Clock,
  PieChart,
  Activity,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { getMonteCarloOneLiner } from '../utils/monteCarloExplanation';

interface RiskAnalyticsViewProps {
  config: SimConfig;
  result: SimResult;
}

export const RiskAnalyticsView: React.FC<RiskAnalyticsViewProps> = ({ config, result }) => {
  const { monteCarlo, losses } = result;

  // 1. Monte Carlo Histogram computation
  const minVal = Math.max(0, monteCarlo.min - 1);
  const maxVal = Math.max(config.demand + 3, monteCarlo.max + 1);
  const binsCount = maxVal - minVal + 1;
  const binCounts = Array(binsCount).fill(0);

  monteCarlo.outputs.forEach((val) => {
    const idx = val - minVal;
    if (idx >= 0 && idx < binsCount) {
      binCounts[idx]++;
    }
  });

  const maxBinCount = Math.max(1, ...binCounts);

  // 2. Loss Pareto breakdown data
  const lossItems = [
    { key: 'material', label: 'Material & Subassembly Shortages', hours: losses.material, color: '#ef4444' },
    { key: 'quality', label: 'Quality Defects & Rework', hours: losses.quality, color: '#f97316' },
    { key: 'crane', label: 'Overhead Crane Contention', hours: losses.crane, color: '#a855f7' },
    { key: 'queue', label: 'Line Transfer & Queue Wait', hours: losses.queue, color: '#0ea5e9' },
  ].sort((a, b) => b.hours - a.hours);

  const totalLoss = Math.max(0.1, losses.total);
  let runningPercent = 0;
  const paretoWithCumulative = lossItems.map((item) => {
    const pct = (item.hours / totalLoss) * 100;
    runningPercent += pct;
    return {
      ...item,
      pct,
      cumulative: runningPercent,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Monte Carlo Confidence Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Stochastic Risk & Monte Carlo Analysis
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {config.mcRuns} simulated monthly runs modeling skill spreads, material delays, and quality reworks.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">P(Meet Monthly Demand)</div>
            <div
              className={`text-xl font-mono font-bold ${
                monteCarlo.pMeetTarget >= 85
                  ? 'text-emerald-400'
                  : monteCarlo.pMeetTarget >= 60
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {monteCarlo.pMeetTarget}%
            </div>
          </div>

          <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">P50 Expected Output</div>
            <div className="text-xl font-mono font-bold text-cyan-400">
              {monteCarlo.p50} <span className="text-xs text-slate-400 font-normal">/ {config.demand}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Single-Line Plain-Language Monte Carlo Explanation */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-800/40 rounded-xl p-4 shadow-md flex items-start sm:items-center gap-3.5">
        <div className="p-2 bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/30 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-0.5">
            Monte Carlo Stochastic Result (Single-Line Plain Language Explanation):
          </span>
          <p className="text-sm font-medium text-slate-100 leading-snug">
            {getMonteCarloOneLiner(monteCarlo, config.demand, config.mcRuns)}
          </p>
        </div>
      </div>

      {/* Grid: Histogram + Loss Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: MONTE CARLO OUTPUT DISTRIBUTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                Monthly Completed Trucks Distribution
              </h4>
              <p className="text-xs text-slate-400">
                Target: {config.demand} trucks · Mean: {monteCarlo.mean.toFixed(1)} · Std Dev: ±
                {monteCarlo.std.toFixed(1)}
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
              {config.mcRuns} Runs
            </span>
          </div>

          {/* Histogram SVG */}
          <div className="flex-1 flex flex-col justify-end min-h-[220px] pt-4">
            <div className="h-44 flex items-end gap-1.5 px-2 border-b border-slate-700 relative">
              {/* Target Line */}
              {(() => {
                const targetIdx = config.demand - minVal;
                if (targetIdx >= 0 && targetIdx < binsCount) {
                  const leftPct = ((targetIdx + 0.5) / binsCount) * 100;
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                      style={{ left: `${leftPct}%` }}
                    >
                      <span className="absolute -top-3 -translate-x-1/2 text-[10px] font-mono font-bold text-red-400 bg-slate-950 px-1 rounded border border-red-800">
                        Target {config.demand}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {binCounts.map((count, i) => {
                const unitCount = minVal + i;
                const heightPct = (count / maxBinCount) * 100;
                const isTargetOrAbove = unitCount >= config.demand;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-slate-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-20">
                      {unitCount} units: {count} runs ({((count / config.mcRuns) * 100).toFixed(0)}%)
                    </div>

                    <div
                      className={`w-full rounded-t transition-all ${
                        isTargetOrAbove
                          ? 'bg-cyan-500 hover:bg-cyan-400'
                          : 'bg-red-500/70 hover:bg-red-500'
                      }`}
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
              <span>{minVal} units</span>
              <span>P10: {monteCarlo.p10}</span>
              <span className="text-cyan-400 font-bold">P50: {monteCarlo.p50}</span>
              <span>P90: {monteCarlo.p90}</span>
              <span>{maxVal} units</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Risk Assessment:</span>
            <span className="font-semibold text-slate-200">
              {monteCarlo.pMeetTarget >= 85
                ? 'High Resilience (Robust line buffer)'
                : monteCarlo.pMeetTarget >= 60
                ? 'Moderate Vulnerability (Disruptions erode quota)'
                : 'Severe Shortfall Risk (Structural bottleneck)'}
            </span>
          </div>
        </div>

        {/* CHART 2: LOSS PARETO BREAKDOWN */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Loss Pareto Analysis</h4>
              <p className="text-xs text-slate-400">
                Total simulated loss: <strong className="text-slate-200">{losses.total.toFixed(1)} h</strong> across month.
              </p>
            </div>
            <span className="text-xs text-slate-400">Ranked by Impact</span>
          </div>

          {/* Loss Bars */}
          <div className="space-y-3.5 flex-1">
            {paretoWithCumulative.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-200 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-200 font-bold">{item.hours.toFixed(1)} h</span>
                    <span className="text-slate-400">({item.pct.toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Primary Loss Driver:</span>
            <span className="font-semibold text-red-400">
              {paretoWithCumulative[0]?.label} (
              {paretoWithCumulative[0]?.pct.toFixed(0)}% of total loss)
            </span>
          </div>
        </div>
      </div>

      {/* S-CURVE: CUMULATIVE PRODUCTION TIMELINE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-200">
              Cumulative Production S-Curve Profile
            </h4>
            <p className="text-xs text-slate-400">
              Completion timestamp of each individual MT65 unit vs monthly deadline horizon ({result.horizonHours.toFixed(1)}h).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
              Simulated Completion
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-3 h-0.5 border-t border-dashed border-red-500 inline-block" />
              Deadline Horizon
            </span>
          </div>
        </div>

        {/* Units Timeline Table / Waterfall */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Release (h)</th>
                <th className="py-2.5 px-3">Finish (h)</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3">Delays</th>
                <th className="py-2.5 px-3">Rework</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {result.machines.map((m) => {
                const isOnTime = m.finishTime <= result.horizonHours;
                return (
                  <tr key={m.id} className="hover:bg-slate-950/50 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-200 font-sans">{m.name}</td>
                    <td className="py-2 px-3 text-slate-400">{m.releaseTime.toFixed(1)}</td>
                    <td className="py-2 px-3 font-semibold text-slate-100">{m.finishTime.toFixed(1)}</td>
                    <td className="py-2 px-3 text-cyan-400">{m.leadTime.toFixed(1)}h</td>
                    <td className="py-2 px-3 text-slate-300">
                      {m.totalDelay > 0 ? (
                        <span className="text-red-400">+{m.totalDelay.toFixed(1)}h</span>
                      ) : (
                        '0h'
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {m.totalRework > 0 ? (
                        <span className="text-amber-400">+{m.totalRework.toFixed(1)}h</span>
                      ) : (
                        '0h'
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isOnTime ? (
                        <span className="text-emerald-400 font-sans font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> On Time
                        </span>
                      ) : (
                        <span className="text-red-400 font-sans font-semibold inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Late (+{(m.finishTime - result.horizonHours).toFixed(1)}h)
                        </span>
                      )}
                    </td>
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
