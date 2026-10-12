import React from 'react';
import { MachineResult, SimConfig } from '../types/simulation';
import { VehicleGraphic } from './VehicleGraphic';
import { X, Clock, AlertTriangle, ShieldCheck, Wrench, ArrowRight } from 'lucide-react';

interface VehicleDossierModalProps {
  machine: MachineResult | null;
  config: SimConfig;
  currentTime: number;
  onClose: () => void;
}

export const VehicleDossierModal: React.FC<VehicleDossierModalProps> = ({
  machine,
  config,
  currentTime,
  onClose,
}) => {
  if (!machine) return null;

  const currentOpIndex = machine.ops.findIndex((op) => currentTime >= op.queueTime && currentTime < op.gateTime);
  const isCompleted = currentTime >= machine.finishTime;
  const isWaitingRelease = currentTime < machine.releaseTime;

  let overallStatus: 'wait' | 'working' | 'crane' | 'material' | 'rework' | 'done' = 'wait';
  if (isCompleted) {
    overallStatus = 'done';
  } else if (currentOpIndex >= 0) {
    const activeOp = machine.ops[currentOpIndex];
    if (currentTime < activeOp.startTime) {
      if (activeOp.materialDelay > 0) overallStatus = 'material';
      else if (activeOp.craneWaitTime > 0) overallStatus = 'crane';
      else overallStatus = 'wait';
    } else if (currentTime < activeOp.finishTime) {
      overallStatus = 'working';
    } else {
      overallStatus = 'rework';
    }
  }

  const stage = isCompleted ? 3 : Math.min(3, Math.max(0, currentOpIndex));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl" title={machine.variant?.name}>
                  {machine.variant?.icon || '🛢️'}
                </span>
                <h3 className="text-lg font-bold text-slate-100 tracking-tight">{machine.name}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                  {machine.variant?.badge || machine.variant?.code || 'Baseline'}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Unit #{machine.id} of {config.demand}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {machine.variant?.name || 'Heavy Underground Dump Truck'} (Nashik Production Facility)
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Visual Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <VehicleGraphic
                stage={stage}
                status={overallStatus}
                label={machine.name}
                variantType={machine.variant?.type}
                variantCode={machine.variant?.code}
                icon={machine.variant?.icon}
                width={120}
                height={70}
              />
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Current Status</div>
                <div className="text-sm font-semibold text-slate-200">
                  {isWaitingRelease && 'Awaiting Line Release'}
                  {isCompleted && 'Passed Final Quality Validation'}
                  {!isWaitingRelease && !isCompleted && currentOpIndex >= 0 && (
                    <span>
                      In Station {currentOpIndex + 1}: {config.stations[currentOpIndex]?.name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Variant Delta: {machine.variant?.mhDelta ? `${machine.variant.mhDelta > 0 ? '+' : ''}${machine.variant.mhDelta} MH` : '0 MH'}</span>
                  <span>·</span>
                  <span>Lead Time: {machine.leadTime.toFixed(1)} hrs</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Released At</div>
                <div className="text-xs font-mono font-medium text-slate-200">{machine.releaseTime.toFixed(1)} h</div>
              </div>
              <div className="bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Completed At</div>
                <div className="text-xs font-mono font-medium text-emerald-400">{machine.finishTime.toFixed(1)} h</div>
              </div>
            </div>
          </div>

          {/* Station Operations Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Main Assembly Line Progression
            </h4>
            <div className="space-y-2.5">
              {machine.ops.map((op, idx) => {
                const station = config.stations[idx];
                const isOpDone = currentTime >= op.gateTime;
                const isOpActive = currentTime >= op.queueTime && currentTime < op.gateTime;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition-colors ${
                      isOpActive
                        ? 'bg-cyan-950/20 border-cyan-500/40'
                        : isOpDone
                        ? 'bg-slate-950/40 border-slate-800/80'
                        : 'bg-slate-900/30 border-slate-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: station?.color || '#0284c7' }}
                        />
                        <span className="text-xs font-semibold text-slate-200">
                          S{idx + 1}: {op.stationName}
                        </span>
                        {isOpActive && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-300">
                        {op.duration.toFixed(1)} hrs work
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Queued</span>
                        {op.queueTime.toFixed(1)}h
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Started</span>
                        {op.startTime.toFixed(1)}h
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Finished</span>
                        {op.finishTime.toFixed(1)}h
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Gate Release</span>
                        <span className={op.reworkTime > 0 ? 'text-amber-400' : 'text-slate-200'}>
                          {op.gateTime.toFixed(1)}h
                        </span>
                      </div>
                    </div>

                    {/* Delay & Rework warnings */}
                    {(op.reworkTime > 0 || op.materialDelay > 0 || op.craneWaitTime > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                        {op.materialDelay > 0 && (
                          <span className="inline-flex items-center gap-1 text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-800/40">
                            <AlertTriangle className="w-3 h-3" />
                            Material Shortage: +{op.materialDelay.toFixed(1)}h
                          </span>
                        )}
                        {op.craneWaitTime > 0 && (
                          <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-950/30 px-1.5 py-0.5 rounded border border-purple-800/40">
                            <Clock className="w-3 h-3" />
                            Crane Wait: +{op.craneWaitTime.toFixed(1)}h
                          </span>
                        )}
                        {op.reworkTime > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-800/40">
                            <ShieldCheck className="w-3 h-3" />
                            Quality Rework: +{op.reworkTime.toFixed(1)}h
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subassemblies Checklist */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Feeder Subassemblies Prepared
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {machine.subassemblies.map((sa, i) => (
                <div
                  key={i}
                  className="bg-slate-950/40 border border-slate-800/80 rounded p-2 flex items-center justify-between"
                >
                  <div className="truncate">
                    <span className="text-slate-200 font-medium">{sa.name}</span>
                    <span className="text-[10px] text-slate-400 block">
                      Target: S{sa.dueStationIndex + 1} · {sa.duration.toFixed(1)}h duration
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-emerald-400 text-[11px]">
                      {sa.readyTime.toFixed(1)}h
                    </span>
                    {sa.delay > 0 && (
                      <span className="block text-[9px] text-red-400 font-mono">
                        +{sa.delay.toFixed(1)}h delay
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
