import React, { useState } from 'react';
import { SimConfig, SimResult, ParameterRecommendation } from '../types/simulation';
import { optimizeProductionLine } from '../engine/simulationEngine';
import { formatINR } from '../utils/currency';
import {
  Sparkles,
  X,
  CheckCircle2,
  DollarSign,
  Users,
  ShieldCheck,
  Zap,
  Calendar,
  Truck,
  Cpu,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

interface OptimizerModalProps {
  isOpen: boolean;
  config: SimConfig;
  currentResult: SimResult;
  onApply: (newConfig: SimConfig) => void;
  onClose: () => void;
}

export const OptimizerModal: React.FC<OptimizerModalProps> = ({
  isOpen,
  config,
  currentResult,
  onApply,
  onClose,
}) => {
  const [strategy, setStrategy] = useState<'cost-effective' | 'high-resilience' | 'balanced'>('cost-effective');
  const [selectedPatches, setSelectedPatches] = useState<Record<string, Partial<SimConfig>>>({});

  if (!isOpen) return null;

  // Compute merged config if user toggled any parameter recommendation
  const effectiveConfig: SimConfig = {
    ...config,
    ...Object.values(selectedPatches).reduce((acc, p) => ({ ...acc, ...p }), {}),
  };

  const recommendation = optimizeProductionLine(effectiveConfig, strategy);

  const toggleParameterRecommendation = (rec: ParameterRecommendation) => {
    setSelectedPatches((prev) => {
      const next = { ...prev };
      if (next[rec.id]) {
        delete next[rec.id];
      } else {
        next[rec.id] = rec.patch;
      }
      return next;
    });
  };

  const applyRecommendation = (additionalPatch?: Partial<SimConfig>) => {
    // Strictly preserve Monthly Target and Multi-Variant Product Mix unless explicitly patched!
    const newConfig: SimConfig = {
      ...config,
      stations: recommendation.optimizedStations,
      saStations: recommendation.optimizedSaStations,
      saPeople: recommendation.optimizedSaPeople,
      ...Object.values(selectedPatches).reduce((acc, p) => ({ ...acc, ...p }), {}),
      ...(additionalPatch || {}),
    };
    onApply(newConfig);
    onClose();
  };

  const activeVariantsCount = config.variants?.length || 0;
  const isCompleted = recommendation.isCompletedBeforeWorkingDays;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-600/20 text-cyan-400 rounded-lg border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Monthly Target Line Optimizer
              </h3>
              <p className="text-xs text-slate-400">
                Optimized specifically for Monthly Target Requirement of{' '}
                <strong className="text-cyan-400">{config.demand} units/month</strong> completed before Working Days.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Target & Mix Preservation Notice */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Monthly Target:{' '}
                <strong className="text-cyan-400 font-mono">{config.demand} units/mo</strong>{' '}
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  Preserved
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Product Mix:{' '}
                <strong className="text-emerald-400 font-mono">{activeVariantsCount} models</strong>{' '}
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  Preserved
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Optimizing: Operators, SA Cells & SA Techs</span>
            </div>
          </div>

          {/* CRITICAL SCHEDULE STATUS BANNER: Completed Before Working Days Per Month */}
          {isCompleted ? (
            <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-xl shadow-md">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Output Completed Before Working Days Per Month
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 rounded">
                      On-Time Guaranteed
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    All <strong className="text-white font-mono">{config.demand} machines</strong> will be
                    completed on{' '}
                    <strong className="text-emerald-300 font-mono">
                      Day {recommendation.workingDaysRequired.toFixed(1)}
                    </strong>{' '}
                    of your scheduled{' '}
                    <strong className="text-slate-100 font-mono">
                      {recommendation.workingDaysAvailable} Working Days
                    </strong>{' '}
                    (
                    <span className="text-emerald-400 font-semibold font-mono">
                      +{recommendation.daysMargin.toFixed(1)} days ahead of schedule
                    </span>
                    ). Line output will finish before the monthly working cutoff.
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                    <span>
                      Working Days Available:{' '}
                      <strong className="text-slate-200">
                        {recommendation.workingDaysAvailable} days
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Days Needed for Demand:{' '}
                      <strong className="text-emerald-300">
                        {recommendation.workingDaysRequired.toFixed(1)} days
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Completion Lead Margin:{' '}
                      <strong className="text-emerald-400">
                        +{recommendation.daysMargin.toFixed(1)} days
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/60 rounded-xl shadow-md">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Cannot Complete Target Before Working Days With Staffing Alone
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60 rounded">
                      Parameter Change Required
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Even with maximum station operators and parallel subassembly cells, completing{' '}
                    <strong className="text-white font-mono">{config.demand} units</strong> requires{' '}
                    <strong className="text-amber-300 font-mono">
                      {recommendation.workingDaysRequired.toFixed(1)} working days
                    </strong>{' '}
                    (schedule deficit:{' '}
                    <span className="text-rose-400 font-semibold font-mono">
                      {Math.abs(recommendation.daysMargin).toFixed(1)} days overdue
                    </span>
                    ). Within the current {recommendation.workingDaysAvailable} working days, only{' '}
                    <strong className="text-amber-400 font-mono">
                      {recommendation.estimatedOutput} of {config.demand} units
                    </strong>{' '}
                    can be finished.
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5 font-mono">
                    <span>
                      Working Days Scheduled:{' '}
                      <strong className="text-slate-200">
                        {recommendation.workingDaysAvailable} days
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Days Needed for Demand:{' '}
                      <strong className="text-amber-300">
                        {recommendation.workingDaysRequired.toFixed(1)} days
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Deficit:{' '}
                      <strong className="text-rose-400">
                        {Math.abs(recommendation.daysMargin).toFixed(1)} days
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RECOMMENDATION OF CHANGE IN PARAMETERS TO GET DEMAND */}
          {(!isCompleted || recommendation.parameterRecommendations.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Recommendations of Change in Parameters to Get Demand ({config.demand} Units)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">
                  Select or apply directly to guarantee on-time completion
                </span>
              </div>

              <div className="space-y-2.5">
                {recommendation.parameterRecommendations.map((rec) => {
                  const isPatchSelected = !!selectedPatches[rec.id];
                  return (
                    <div
                      key={rec.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isPatchSelected
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-750'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200">
                              {rec.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                              {rec.currentValue} →{' '}
                              <strong className="text-cyan-400">{rec.recommendedValue}</strong>
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {rec.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span>{rec.impactDescription}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleParameterRecommendation(rec)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                              isPatchSelected
                                ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm'
                                : 'bg-slate-900 border-slate-750 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${
                                isPatchSelected ? 'text-white' : 'text-slate-500'
                              }`}
                            />
                            {isPatchSelected ? 'Included in Plan' : 'Include Lever'}
                          </button>

                          <button
                            onClick={() => applyRecommendation(rec.patch)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1"
                            title="Apply this parameter change immediately along with optimized staffing"
                          >
                            Apply This
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategy Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
              Optimization Resilience Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'cost-effective',
                  title: 'Cost-Effective',
                  desc: 'Hit required Takt with minimum headcount & capital additions.',
                  icon: DollarSign,
                },
                {
                  id: 'high-resilience',
                  title: 'High Resilience',
                  desc: '18% safety buffer to guarantee >90% probability under delays.',
                  icon: ShieldCheck,
                },
                {
                  id: 'balanced',
                  title: 'Lean Balance',
                  desc: 'Level cycle times across stations to eliminate buffer WIP.',
                  icon: Zap,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = strategy === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setStrategy(opt.id as any)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500 text-slate-100 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-300 mb-1">
                      <Icon className="w-3.5 h-3.5" />
                      {opt.title}
                    </div>
                    <div className="text-[11px] leading-snug">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Single-Line Monte Carlo Plain-Language Explanation */}
          <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/50 rounded-xl flex items-start gap-3 shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-cyan-300 block">
                Monte Carlo Stochastic Result (Single-Line Plain Language):
              </span>
              <p className="text-xs text-cyan-100 leading-relaxed font-medium">
                {recommendation.monteCarloOneLiner}
              </p>
            </div>
          </div>

          {/* Before & After Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Target Output
              </span>
              <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                {currentResult.completedCount} →{' '}
                <span className={isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                  {recommendation.estimatedOutput}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Target: {config.demand} units</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Days to Finish Output
              </span>
              <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                <span className={isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                  {recommendation.workingDaysRequired.toFixed(1)} days
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Limit: {recommendation.workingDaysAvailable} working days
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Total Headcount
              </span>
              <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                {recommendation.totalPeopleBefore} →{' '}
                <span className="text-amber-400">{recommendation.totalPeopleAfter}</span>
              </div>
              <span className="text-[10px] text-slate-400">Operators & techs</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Cost Impact (INR)
              </span>
              <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                {recommendation.costDelta >= 0 ? '+' : ''}
                {formatINR(recommendation.costDelta)}
              </div>
              <span className="text-[10px] text-slate-400">Operating cost delta</span>
            </div>
          </div>

          {/* Core Optimization Levers Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Staffing Levers Adjusted for Monthly Target ({config.demand} units)
            </h4>

            {/* Lever 1: Operators Assigned across Assembly Stations */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>1. Operators Assigned (Main Assembly Stations)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Target Takt: {currentResult.taktHours.toFixed(1)} h / truck
                </span>
              </div>

              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Station</th>
                    <th className="py-2 px-3">Operators Assigned</th>
                    <th className="py-2 px-3">Cycle Time</th>
                    <th className="py-2 px-3 text-right">Status vs Takt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {recommendation.cycleTimeImprovements.map((imp, idx) => {
                    const opAlloc = recommendation.operatorAllocations[idx];
                    const meetsTakt = imp.afterCycle <= currentResult.taktHours;
                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-200">
                          {imp.stationName}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-slate-400">
                            {opAlloc?.beforeOperators || imp.beforeOperators}
                          </span>
                          <span className="text-slate-500 mx-1">→</span>
                          <strong className="text-cyan-400 font-bold">
                            {opAlloc?.afterOperators || imp.afterOperators} ops
                          </strong>
                          <span className="text-[10px] text-slate-500 ml-1">
                            (max {opAlloc?.maxAllowed || 6})
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-slate-400">{imp.beforeCycle.toFixed(1)}h</span>
                          <span className="text-slate-500 mx-1">→</span>
                          <span className="font-bold text-emerald-400">
                            {imp.afterCycle.toFixed(1)}h
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {meetsTakt ? (
                            <span className="text-emerald-400 text-[11px] font-sans inline-flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Within Takt
                            </span>
                          ) : (
                            <span className="text-amber-400 text-[11px] font-sans font-semibold">
                              {(imp.afterCycle - currentResult.taktHours).toFixed(1)}h Over
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Levers 2 & 3: Parallel Subassembly Cells & Technicians Per SA Cell */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>2 & 3. Subassembly Feeder Cells Configuration</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Parallel Subassembly Cells
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-200 mt-1">
                    {recommendation.subassemblySummary.beforeCells}{' '}
                    <span className="text-slate-500 font-normal">→</span>{' '}
                    <span className="text-cyan-400">
                      {recommendation.subassemblySummary.afterCells} parallel feeder cells
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Feeder stations supplying chassis bay
                  </span>
                </div>

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Technicians Per SA Cell
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-200 mt-1">
                    {recommendation.subassemblySummary.beforeTechsPerCell}{' '}
                    <span className="text-slate-500 font-normal">→</span>{' '}
                    <span className="text-amber-400">
                      {recommendation.subassemblySummary.afterTechsPerCell} technicians / cell
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Total crew: {recommendation.subassemblySummary.totalPersonnelAfter} technicians
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Action Plan to Achieve {config.demand} Units/Month
            </h4>
            <div className="space-y-2">
              {recommendation.actions.map((act, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center gap-2.5 text-xs text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => applyRecommendation()}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply Optimized Configuration (Preserve Target & Mix)
          </button>
        </div>
      </div>
    </div>
  );
};
