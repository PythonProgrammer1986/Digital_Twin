import React, { useState, useEffect } from 'react';
import { SimConfig, SimResult } from '../types/simulation';
import { SensitivityTornadoView } from './SensitivityTornadoView';
import {
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Gauge,
  Sparkles,
  Target,
} from 'lucide-react';

interface YamazumiViewProps {
  config: SimConfig;
  result: SimResult;
  onApplyConfig: (updated: SimConfig) => void;
  onOpenOptimizer: () => void;
}

export const YamazumiView: React.FC<YamazumiViewProps> = ({
  config,
  result,
  onApplyConfig,
  onOpenOptimizer,
}) => {
  const [subView, setSubView] = useState<'yamazumi' | 'tornado'>('yamazumi');

  // Working copy of station MH for live what-if rebalancing
  const [stationMhDraft, setStationMhDraft] = useState<number[]>(
    config.stations.map((s) => s.mh)
  );

  // Synchronize draft if configuration stations change externally
  useEffect(() => {
    setStationMhDraft(config.stations.map((s) => s.mh));
  }, [config.stations]);

  const nominalEff = Math.max(
    0.4,
    (config.skillMean / 100) * (1 - config.absenteeismPercent / 100)
  );

  // Compute what-if draft cycle times
  const draftCycleTimes = config.stations.map((st, i) => {
    const mh = stationMhDraft[i] ?? st.mh;
    const capacity = st.copies * Math.min(st.people, st.maxPeople) * nominalEff;
    return mh / Math.max(0.1, capacity);
  });

  const draftMaxCycle = Math.max(...draftCycleTimes);
  const draftSumCycles = draftCycleTimes.reduce((a, b) => a + b, 0);
  const draftEfficiency = draftMaxCycle > 0
    ? (draftSumCycles / (draftCycleTimes.length * draftMaxCycle)) * 100
    : 100;

  const isDraftModified = stationMhDraft.some((mh, i) => mh !== config.stations[i].mh);

  const applyDraftMh = () => {
    const updatedStations = config.stations.map((st, i) => ({
      ...st,
      mh: stationMhDraft[i],
    }));
    onApplyConfig({ ...config, stations: updatedStations });
  };

  const resetDraftMh = () => {
    setStationMhDraft(config.stations.map((s) => s.mh));
  };

  // SVG Chart Dimensions
  const chartHeight = 320;
  const chartWidth = 720;
  const maxAxisVal = Math.max(result.taktHours * 1.5, ...result.stationCycleTimes, result.subassemblyCycleTime, 50);

  const getY = (val: number) => {
    return chartHeight - (val / maxAxisVal) * (chartHeight - 40) - 25;
  };

  const taktY = getY(result.taktHours);

  return (
    <div className="space-y-6">
      {/* Sub-view Segmented Toggle */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setSubView('yamazumi')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            subView === 'yamazumi'
              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Yamazumi Line Balancing
        </button>
        <button
          onClick={() => setSubView('tornado')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            subView === 'tornado'
              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          Sensitivity "Tornado" Levers
        </button>
      </div>

      {subView === 'tornado' ? (
        <SensitivityTornadoView
          config={config}
          result={result}
          onOpenOptimizer={onOpenOptimizer}
        />
      ) : (
        <>
          {/* Top Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Yamazumi Operator & Station Line Balancing
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare station cycle times against customer Takt Time ({result.taktHours.toFixed(1)} h).
                Stations exceeding the red line are bottlenecks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onOpenOptimizer}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Balance Stations
              </button>
            </div>
          </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Required Takt Time</div>
          <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
            {result.taktHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">h / truck</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Based on {config.demand} units / month
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Line Balance Efficiency</div>
          <div className="text-lg font-mono font-bold text-slate-100 mt-1 flex items-center gap-2">
            <span>{result.lineBalanceEfficiency.toFixed(1)}%</span>
            {result.lineBalanceEfficiency >= 85 ? (
              <span className="text-[10px] text-emerald-400 font-normal">Optimal</span>
            ) : (
              <span className="text-[10px] text-amber-400 font-normal">Imbalanced</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Industry target: &gt; 85%
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Balance Delay (Waste)</div>
          <div className="text-lg font-mono font-bold text-amber-400 mt-1">
            {(100 - result.lineBalanceEfficiency).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Idle waiting time loss
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Primary Bottleneck</div>
          <div className="text-sm font-bold text-red-400 mt-1 truncate" title={result.primaryConstraint}>
            {result.primaryConstraint}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Pacing constraint
          </div>
        </div>
      </div>

      {/* Yamazumi SVG Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-slate-200">
            Station Cycle Time vs Required Takt Time (Hours / Machine)
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500 inline-block" />
              Customer Takt ({result.taktHours.toFixed(1)}h)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
              Below Takt (Flows)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
              Over Takt (Bottleneck)
            </span>
          </div>
        </div>

        <div className="min-w-[680px] flex justify-center">
          <svg width={chartWidth} height={chartHeight} className="overflow-visible select-none">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1.0, 1.25].map((factor) => {
              const val = result.taktHours * factor;
              const y = getY(val);
              if (y < 20 || y > chartHeight - 25) return null;
              return (
                <g key={factor}>
                  <line x1="50" y1={y} x2={chartWidth - 20} y2={y} stroke="#334155" strokeDasharray="2 3" />
                  <text x="42" y={y + 3} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                    {val.toFixed(0)}h
                  </text>
                </g>
              );
            })}

            {/* Zero Axis */}
            <line x1="50" y1={chartHeight - 25} x2={chartWidth - 20} y2={chartHeight - 25} stroke="#475569" strokeWidth="1" />

            {/* Customer Takt Line (Red Dashed) */}
            <line
              x1="50"
              y1={taktY}
              x2={chartWidth - 20}
              y2={taktY}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <rect x={chartWidth - 110} y={taktY - 18} width="85" height="16" rx="3" fill="#ef4444" />
            <text
              x={chartWidth - 68}
              y={taktY - 6}
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              TAKT {result.taktHours.toFixed(1)}h
            </text>

            {/* Subassembly Aggregate Bar */}
            {(() => {
              const barX = 70;
              const barW = 55;
              const ct = result.subassemblyCycleTime;
              const barY = getY(ct);
              const barH = chartHeight - 25 - barY;
              const isOver = ct > result.taktHours;

              return (
                <g key="sa-bar">
                  <rect
                    x={barX}
                    y={barY}
                    width={barW}
                    height={Math.max(2, barH)}
                    rx="4"
                    fill={isOver ? '#f59e0b' : '#a855f7'}
                    fillOpacity="0.85"
                    stroke={isOver ? '#d97706' : '#9333ea'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={barX + barW / 2}
                    y={barY - 6}
                    fill={isOver ? '#fbbf24' : '#c084fc'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {ct.toFixed(1)}h
                  </text>
                  <text
                    x={barX + barW / 2}
                    y={chartHeight - 10}
                    fill="#cbd5e1"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Subassembly
                  </text>
                  <text
                    x={barX + barW / 2}
                    y={chartHeight + 2}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {config.saStations}x{config.saPeople} ppl
                  </text>
                </g>
              );
            })()}

            {/* Main Assembly Stations Bars */}
            {config.stations.map((st, i) => {
              const spacing = (chartWidth - 190) / config.stations.length;
              const barX = 160 + i * spacing;
              const barW = Math.min(65, spacing - 20);
              const ct = result.stationCycleTimes[i];
              const barY = getY(ct);
              const barH = chartHeight - 25 - barY;
              const isOver = ct > result.taktHours;

              return (
                <g key={st.id}>
                  {/* Station Bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barW}
                    height={Math.max(2, barH)}
                    rx="4"
                    fill={isOver ? '#f59e0b' : '#10b981'}
                    fillOpacity="0.85"
                    stroke={isOver ? '#d97706' : '#059669'}
                    strokeWidth="1.5"
                  />
                  {/* Value label */}
                  <text
                    x={barX + barW / 2}
                    y={barY - 6}
                    fill={isOver ? '#fbbf24' : '#34d399'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {ct.toFixed(1)}h
                  </text>
                  {/* Station label */}
                  <text
                    x={barX + barW / 2}
                    y={chartHeight - 10}
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    S{i + 1}
                  </text>
                  <text
                    x={barX + barW / 2}
                    y={chartHeight + 2}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {st.copies}stn x {st.people}p
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Interactive What-If Work Balancing Playground */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-100">
                Interactive What-If Work-Content Leveling
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust work content (MH) between stations to shift tasks away from bottlenecks.
            </p>
          </div>

          {isDraftModified && (
            <div className="flex items-center gap-2">
              <button
                onClick={resetDraftMh}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Reset Draft
              </button>
              <button
                onClick={applyDraftMh}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
              >
                Apply Rebalanced Work
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.stations.map((st, i) => {
            const currentMh = stationMhDraft[i] ?? st.mh;
            const draftCt = draftCycleTimes[i];
            const isOverTakt = draftCt > result.taktHours;

            return (
              <div
                key={st.id}
                className={`p-3.5 rounded-xl border bg-slate-950/70 ${
                  isOverTakt ? 'border-amber-500/50' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-200">
                    S{i + 1}: {st.name}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isOverTakt ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {draftCt.toFixed(1)}h CT
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Work Content</span>
                    <span className="font-mono text-slate-200">{currentMh} MH</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={2}
                    value={currentMh}
                    onChange={(e) => {
                      const next = [...stationMhDraft];
                      next[i] = parseInt(e.target.value);
                      setStationMhDraft(next);
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Projected Line Efficiency after draft adjustment:
          </span>
          <span className="font-mono font-bold text-cyan-400">
            {draftEfficiency.toFixed(1)}% (
            {draftEfficiency >= result.lineBalanceEfficiency ? '+' : ''}
            {(draftEfficiency - result.lineBalanceEfficiency).toFixed(1)}%)
          </span>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
