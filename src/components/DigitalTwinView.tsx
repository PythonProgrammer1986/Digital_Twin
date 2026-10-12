import React, { useState, useEffect, useRef } from 'react';
import { SimConfig, SimResult, MachineResult } from '../types/simulation';
import { VehicleGraphic } from './VehicleGraphic';
import { VehicleDossierModal } from './VehicleDossierModal';
import { getMonteCarloOneLiner } from '../utils/monteCarloExplanation';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Info,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  Users,
  Anchor,
  Package,
  Boxes,
  ShieldCheck,
} from 'lucide-react';

interface DigitalTwinViewProps {
  config: SimConfig;
  result: SimResult;
  onOpenOptimizer: () => void;
}

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({
  config,
  result,
  onOpenOptimizer,
}) => {
  const [simTime, setSimTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10); // Simulated hours per second
  const [selectedMachine, setSelectedMachine] = useState<MachineResult | null>(null);

  const requestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const maxSimTime = Math.max(
    result.horizonHours * 1.1,
    ...result.machines.map((m) => m.finishTime)
  );

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current !== null) {
        const deltaSeconds = (timestamp - lastTimestampRef.current) / 1000;
        setSimTime((prev) => {
          const next = prev + deltaSeconds * playbackSpeed;
          if (next >= maxSimTime) {
            setIsPlaying(false);
            return maxSimTime;
          }
          return next;
        });
      }
      lastTimestampRef.current = timestamp;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, maxSimTime]);

  const togglePlay = () => {
    if (simTime >= maxSimTime) {
      setSimTime(0);
    }
    setIsPlaying((p) => !p);
  };
  const resetSim = () => {
    setIsPlaying(false);
    setSimTime(0);
  };
  const stepForward = (hours: number) => {
    setSimTime((prev) => Math.min(maxSimTime, prev + hours));
  };

  // Calculate current production progress metrics
  const completedCount = result.machines.filter((m) => simTime >= m.finishTime).length;
  const currentShift = Math.floor(simTime / config.shiftHours) + 1;
  const currentDay = Math.floor(simTime / (config.shiftHours * config.shifts)) + 1;

  // Active cranes tracking
  const activeCraneStations: number[] = [];
  result.machines.forEach((m) => {
    m.ops.forEach((op) => {
      if (simTime >= op.queueTime && simTime < op.startTime && op.craneWaitTime > 0) {
        activeCraneStations.push(op.stationIndex);
      }
    });
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Top Playback & Control Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Playback buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs transition-colors shadow-sm ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play Live Twin'}
          </button>

          <button
            onClick={resetSim}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Reset to 0.0 h"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => stepForward(config.shiftHours)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors font-mono"
            title={`Step forward 1 shift (${config.shiftHours}h)`}
          >
            <FastForward className="w-3.5 h-3.5" />
            +1 Shift
          </button>
        </div>

        {/* Time Slider & Scrubber */}
        <div className="flex-1 max-w-xl w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-12 text-right">0.0h</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={maxSimTime}
              step={0.1}
              value={simTime}
              onChange={(e) => setSimTime(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
            />
            {/* Horizon marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 pointer-events-none"
              style={{ left: `${(result.horizonHours / maxSimTime) * 100}%` }}
              title={`Monthly Horizon: ${result.horizonHours.toFixed(1)}h`}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 w-16">
            {maxSimTime.toFixed(0)}h
          </span>
        </div>

        {/* Speed Toggles */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[1, 5, 15, 30, 60].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                playbackSpeed === spd
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Digital Telemetry Readout */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Simulated Time</div>
            <div className="text-sm font-mono font-bold text-cyan-400">
              {simTime.toFixed(1)} h
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Calendar</div>
            <div className="text-xs font-mono text-slate-300">
              Day {currentDay} · S{currentShift % config.shifts || config.shifts}
            </div>
          </div>
          <div className="text-right bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Completed</div>
            <div className="text-sm font-mono font-bold text-emerald-400">
              {completedCount} / {config.demand}
            </div>
          </div>
        </div>
      </div>

      {/* Main Floor Visual Digital Twin Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
        {/* Floor Canvas Top Banner */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">
              MT65 Heavy Mine Truck Assembly Line — Nashik Facility Floor
            </span>
            <span className="text-slate-400 text-[11px]">· Interactive 2D Digital Twin</span>
          </div>

          {/* Status color legends */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              Heavy Crane Lift
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Material Starvation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
              Quality Rework
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Gated / Complete
            </span>
          </div>
        </div>

        {/* Floor Interactive Layout Canvas */}
        <div className="p-6 overflow-x-auto space-y-6 min-w-[980px] bg-gradient-to-b from-slate-900 to-slate-950">
          {/* 1. SUBASSEMBLY FEEDER AREA */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded bg-purple-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Feeder Subassembly Cells (Pre-Assembly Preparation)
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {config.saStations} parallel cells · {config.saPeople} tech/cell · Cycle:{' '}
                  {result.subassemblyCycleTime.toFixed(1)}h
                </span>
                <span className="text-[10px] bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  2 Material Buffers/Cell (SA Cells Never Empty)
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Supplies chassis frames, hydraulic manifolds, radiators, cabs & wire harnesses with dual material buffers
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: config.saStations }).map((_, saIdx) => {
                // Find subassemblies currently being fabricated at this time
                const activeSubs = result.machines.flatMap((m) =>
                  m.subassemblies
                    .filter(
                      (sub) => simTime >= sub.startTime && simTime < sub.readyTime
                    )
                    .map((s) => ({ ...s, machineName: m.name }))
                );
                const currentJob = activeSubs[saIdx];

                // Determine next queued material kits for the 2 material buffers
                const futureSubs = result.machines.flatMap((m) =>
                  m.subassemblies
                    .filter((sub) => sub.startTime >= simTime)
                    .map((s) => ({ ...s, machineName: m.name }))
                );
                const buffer1Kit = currentJob
                  ? `Staged: ${currentJob.name}`
                  : (futureSubs[saIdx * 2]?.name ? `Buffer 1: ${futureSubs[saIdx * 2].name}` : 'Buffer 1: Kit Ready');
                const buffer2Kit = futureSubs[saIdx * 2 + 1]?.name
                  ? `Buffer 2: ${futureSubs[saIdx * 2 + 1].name}`
                  : 'Buffer 2: Replenished Standby';

                return (
                  <div
                    key={saIdx}
                    className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                      currentJob
                        ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">SA Cell {saIdx + 1}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-purple-300">
                            {config.saPeople} Techs
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 min-h-[42px] flex flex-col justify-center">
                        {currentJob ? (
                          <div className="text-xs">
                            <div className="text-slate-200 font-medium truncate">
                              {currentJob.name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>For {currentJob.machineName}</span>
                              <span className="text-purple-400">
                                → Target S{currentJob.dueStationIndex + 1}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Continuous Pre-Assembly Flow
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2 Material Buffers to keep SA cells supplied and never empty */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Boxes className="w-3 h-3 text-emerald-400" />
                          2 Material Buffers
                        </span>
                        <span className="text-emerald-400 font-mono text-[9px] font-semibold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/50">
                          NEVER EMPTY
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                        <div className="bg-slate-950/90 border border-emerald-500/30 rounded px-1.5 py-1 text-slate-300 truncate flex items-center gap-1" title={buffer1Kit}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="truncate">{buffer1Kit}</span>
                        </div>
                        <div className="bg-slate-950/90 border border-emerald-500/30 rounded px-1.5 py-1 text-slate-300 truncate flex items-center gap-1" title={buffer2Kit}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="truncate">{buffer2Kit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. OVERHEAD HEAVY CRANE GANTRY TRACK */}
          <div className="relative py-2">
            <div className="h-2 bg-slate-800 rounded-full border border-slate-700/60 relative overflow-hidden flex items-center">
              <div className="absolute inset-0 bg-yellow-500/10" />
            </div>

            {/* Crane Trolleys */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1 px-2">
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Anchor className="w-3.5 h-3.5" />
                <span>Overhead Cranes: {config.sharedCranes} Heavy Gantry Units</span>
              </div>
              <div className="text-slate-400">
                {activeCraneStations.length > 0 ? (
                  <span className="text-purple-400 font-semibold">
                    Crane Active at Station(s):{' '}
                    {activeCraneStations.map((st) => `S${st + 1}`).join(', ')}
                  </span>
                ) : (
                  <span>All Cranes Standby / Staged</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. MAIN ASSEMBLY STATIONS FLOW */}
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {config.stations.map((station, sIdx) => {
              const cycleTime = result.stationCycleTimes[sIdx];
              const isBottleneck = sIdx === result.bottleneckStationIndex;
              const isOverTakt = cycleTime > result.taktHours;

              // Find machines currently inside this station's bays
              const activeOpsInStation = result.machines
                .map((m) => {
                  const op = m.ops[sIdx];
                  if (op && simTime >= op.queueTime && simTime < op.gateTime) {
                    return { machine: m, op };
                  }
                  return null;
                })
                .filter(Boolean) as { machine: MachineResult; op: any }[];

              // Separate queued machines vs currently being worked on
              const queuedMachines = activeOpsInStation.filter(
                (item) => simTime < item.op.startTime
              );
              const workingMachines = activeOpsInStation.filter(
                (item) => simTime >= item.op.startTime
              );

              return (
                <React.Fragment key={station.id}>
                  {/* Station Column */}
                  <div
                    className={`flex-1 min-w-[240px] max-w-[320px] rounded-xl border flex flex-col bg-slate-900 shadow-md ${
                      isBottleneck
                        ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Station Header */}
                    <div
                      className="p-3.5 rounded-t-xl border-b border-slate-800"
                      style={{
                        background: `linear-gradient(to right, ${station.color}15, rgba(15, 23, 42, 0.6))`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold font-mono px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: station.color }}
                        >
                          S{sIdx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <span
                            className={
                              isOverTakt
                                ? 'text-amber-400 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {cycleTime.toFixed(1)}h
                          </span>
                          <span className="text-slate-400">/ {result.taktHours.toFixed(1)}h takt</span>
                        </div>
                      </div>

                      <div className="mt-1">
                        <h4 className="text-sm font-bold text-slate-100 truncate" title={station.name}>
                          {station.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{station.mh} MH content</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3 text-cyan-400" />
                            {station.people} tech / bay ({station.copies} bays)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Work Bays Area */}
                    <div className="p-3 space-y-3 flex-1 flex flex-col justify-start">
                      {Array.from({ length: station.copies }).map((_, bayIdx) => {
                        const occupant = workingMachines[bayIdx];

                        return (
                          <div
                            key={bayIdx}
                            className={`min-h-[110px] rounded-lg border p-2 flex flex-col items-center justify-center transition-colors ${
                              occupant
                                ? 'bg-slate-950/70 border-cyan-500/30 shadow-sm'
                                : 'bg-slate-950/30 border-dashed border-slate-800/80'
                            }`}
                          >
                            <div className="text-[10px] font-mono text-slate-400 self-start mb-1">
                              Bay {bayIdx + 1} of {station.copies}
                            </div>

                            {occupant ? (
                              (() => {
                                const m = occupant.machine;
                                const op = occupant.op;
                                let status: 'working' | 'rework' | 'crane' | 'material' = 'working';
                                let progress = 0;

                                if (simTime < op.finishTime) {
                                  status = 'working';
                                  progress = Math.min(
                                    100,
                                    ((simTime - op.startTime) / Math.max(0.01, op.duration)) * 100
                                  );
                                } else {
                                  status = 'rework';
                                  progress = 100;
                                }

                                return (
                                  <VehicleGraphic
                                    stage={sIdx}
                                    status={status}
                                    label={m.name}
                                    variantType={m.variant?.type}
                                    variantCode={m.variant?.code}
                                    icon={m.variant?.icon}
                                    progressPercent={progress}
                                    color={station.color}
                                    onClick={() => setSelectedMachine(m)}
                                  />
                                );
                              })()
                            ) : (
                              <div className="text-center py-4 text-slate-400 text-xs">
                                <span className="block text-[11px] italic">Bay Empty / Ready</span>
                                <span className="text-[9px] font-mono text-slate-400">
                                  Capacity: {station.people} workers
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Inbound WIP Buffer Queue */}
                      <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800/60 mt-auto">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span>WIP Inbound Buffer</span>
                          <span>
                            {queuedMachines.length} / {station.bufferCapacity} Max
                          </span>
                        </div>
                        {queuedMachines.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {queuedMachines.map((qItem, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => setSelectedMachine(qItem.machine)}
                                className="px-2 py-1 bg-amber-950/40 text-amber-300 border border-amber-800/40 rounded text-[10px] font-mono hover:bg-amber-900/60 transition-colors flex items-center gap-1"
                                title={`Queued: ${qItem.machine.name} (${qItem.machine.variant?.name || 'STD'}) - ${qItem.op.waitTime.toFixed(1)}h wait`}
                              >
                                <span>{qItem.machine.variant?.icon || '🛢️'}</span>
                                <span>{qItem.machine.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No vehicles in queue</div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Station Telemetry */}
                    <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 rounded-b-xl flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Utilization</span>
                      <span
                        className={
                          result.stationUtilization[sIdx] > 85
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-300'
                        }
                      >
                        {result.stationUtilization[sIdx]}%
                      </span>
                    </div>
                  </div>

                  {/* Flow Arrow between stations */}
                  {sIdx < config.stations.length - 1 && (
                    <div className="flex items-center self-center px-1 text-slate-600">
                      <div className="w-6 h-0.5 bg-slate-700 relative">
                        <div className="absolute right-0 -top-1 border-solid border-l-slate-600 border-l-8 border-y-transparent border-y-4 border-r-0" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Transfer to Finished Dispatch Yard */}
            <div className="flex items-center self-center px-1 text-slate-600">
              <div className="w-6 h-0.5 bg-slate-700 relative">
                <div className="absolute right-0 -top-1 border-solid border-l-slate-600 border-l-8 border-y-transparent border-y-4 border-r-0" />
              </div>
            </div>

            {/* 4. FINISHED GOODS & DISPATCH YARD */}
            <div className="flex-1 min-w-[240px] max-w-[300px] rounded-xl border border-emerald-500/40 bg-slate-900 shadow-md flex flex-col">
              <div className="p-3.5 bg-emerald-950/20 border-b border-emerald-500/20 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-600 text-white">
                    PDI DONE
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {completedCount} / {config.demand} units
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-1">Finished Goods Yard</h4>
                <div className="text-[10px] text-slate-400">
                  Ready for Mine Site Delivery & Dispatch
                </div>
              </div>

              <div className="p-3 space-y-2 flex-1 max-h-[300px] overflow-y-auto">
                {result.machines
                  .filter((m) => simTime >= m.finishTime)
                  .map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachine(m)}
                      className="p-2 bg-slate-950/70 border border-emerald-800/40 rounded-lg hover:border-emerald-500 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.variant?.icon || '🛢️'}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200">{m.name}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                          {m.variant?.code || 'STD'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {m.finishTime.toFixed(1)}h
                      </span>
                    </div>
                  ))}

                {completedCount === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    Awaiting first unit validation completion...
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 rounded-b-xl text-[11px] text-slate-400 flex items-center justify-between">
                <span>Monthly Target</span>
                <span className="font-mono text-slate-200">{config.demand} Units</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottleneck & Quick Optimization Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-lg text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">
              Current Pacing Constraint: <span className="text-amber-400">{result.primaryConstraint}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              <span className="text-cyan-400 font-semibold font-mono text-[11px] uppercase tracking-wider mr-1.5">
                Monte Carlo Result:
              </span>
              {getMonteCarloOneLiner(result.monteCarlo, config.demand, config.mcRuns)}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenOptimizer}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow transition-all whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Auto-Optimize Line Balance
        </button>
      </div>

      {/* Machine Inspection Dossier */}
      <VehicleDossierModal
        machine={selectedMachine}
        config={config}
        currentTime={simTime}
        onClose={() => setSelectedMachine(null)}
      />
    </div>
  );
};
