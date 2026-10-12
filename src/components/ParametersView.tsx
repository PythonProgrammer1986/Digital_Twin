import React, { useState } from 'react';
import { SimConfig, Station, Subassembly, ProductVariant, VariantType } from '../types/simulation';
import { SCENARIO_PRESETS, STATION_COLORS, DEFAULT_CONFIG } from '../engine/defaultConfig';
import { ConfirmConfigResetModal } from './ConfirmConfigResetModal';
import { formatINR } from '../utils/currency';
import {
  Settings2,
  Plus,
  Trash2,
  Calendar,
  Users,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ShieldAlert,
  DollarSign,
  Cpu,
  Truck,
  CheckCircle2,
  Shield,
  Zap,
  Wrench,
  Radio,
  Anchor,
  Sliders,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import { VehicleGraphic } from './VehicleGraphic';

export const AVAILABLE_MACHINE_ICONS = ['🛢️', '⚡', '🛡️', '📡', '🏋️', '🚜', '⚙️', '🚛', '⛏️', '🔋', '🤖', '🚨'];

export const MACHINE_PRESETS: {
  type: VariantType;
  icon: string;
  name: string;
  code: string;
  badge: string;
  description: string;
  mhDelta: number;
  targetStationIndex: number;
  color: string;
}[] = [
  {
    type: 'diesel',
    icon: '🛢️',
    name: 'MT65 Standard Heavy Diesel',
    code: 'STD-DIESEL',
    badge: 'Baseline',
    description: 'High-payload Cummins 16-cylinder diesel powertrain with heavy rock tipper.',
    mhDelta: 0,
    targetStationIndex: -1,
    color: '#eab308',
  },
  {
    type: 'electric',
    icon: '⚡',
    name: 'MT65 Zero-Emission Battery-Electric',
    code: 'BEV-ELECTRIC',
    badge: 'BEV',
    description: 'High-voltage 680 kWh LFP battery packs, dual inverters & regenerative braking (+35 MH).',
    mhDelta: 35,
    targetStationIndex: 1,
    color: '#06b6d4',
  },
  {
    type: 'flameproof',
    icon: '🛡️',
    name: 'MT65 Flameproof & Explosion-Proof Coal Spec',
    code: 'FLAMEPROOF',
    badge: 'Flameproof',
    description: 'DGMS-certified flameproof enclosure, wet scrubber exhaust & automated fire suppression (+20 MH).',
    mhDelta: 20,
    targetStationIndex: 0,
    color: '#f97316',
  },
  {
    type: 'autonomous',
    icon: '📡',
    name: 'MT65 Autonomous & Tele-Remote Hauler',
    code: 'AUTO-ROBOTIC',
    badge: 'Auto-LiDAR',
    description: 'Roof LiDAR scanner, dual GNSS antennas, radar collision avoidance & tele-remote automation (+25 MH).',
    mhDelta: 25,
    targetStationIndex: 2,
    color: '#a855f7',
  },
  {
    type: 'high_capacity',
    icon: '🏋️',
    name: 'MT65 High-Capacity Extra Heavy 75T',
    code: 'HD-75T-ROCK',
    badge: 'HD-75T',
    description: 'Reinforced double-box frame, dual hydraulic hoist rams, heavy hard-rock wear liner (+40 MH).',
    mhDelta: 40,
    targetStationIndex: 0,
    color: '#ea580c',
  },
  {
    type: 'articulated',
    icon: '🚜',
    name: 'MT65 Articulated Low-Profile Spec',
    code: 'ARTIC-LOW',
    badge: 'Articulated',
    description: 'Oscillating center articulation hitch, ultra-low profile chassis for narrow stopes (+18 MH).',
    mhDelta: 18,
    targetStationIndex: 1,
    color: '#ca8a04',
  },
  {
    type: 'custom',
    icon: '⚙️',
    name: 'MT65 Custom Engineering Spec',
    code: 'CUSTOM-SPEC',
    badge: 'Custom',
    description: 'Special customized mining package with customer-requested options & auxiliary PTO (+15 MH).',
    mhDelta: 15,
    targetStationIndex: -1,
    color: '#8b5cf6',
  },
];

interface ParametersViewProps {
  config: SimConfig;
  onChange: (newConfig: SimConfig) => void;
  onOptimize: () => void;
  onReset: () => void;
}

export const ParametersView: React.FC<ParametersViewProps> = ({
  config,
  onChange,
  onOptimize,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'stations' | 'subassembly' | 'mix' | 'variability' | 'cost'>(
    'calendar'
  );

  // Safeguard modal state to ask Yes/No before resetting Monthly Target or Multi-Variant Product Mix
  const [pendingPreset, setPendingPreset] = useState<{
    name: string;
    config: SimConfig;
  } | null>(null);

  const handleApplyPresetRequest = (preset: { name: string; config: Partial<SimConfig> }) => {
    const targetConfig = { ...config, ...preset.config } as SimConfig;
    const hasDemandDiff = targetConfig.demand !== config.demand;
    const hasVariantsDiff =
      preset.config.variants &&
      JSON.stringify(preset.config.variants) !== JSON.stringify(config.variants);

    if (hasDemandDiff || hasVariantsDiff) {
      setPendingPreset({ name: preset.name, config: targetConfig });
    } else {
      onChange(targetConfig);
    }
  };

  const handleResetAllRequest = () => {
    setPendingPreset({
      name: 'Factory Baseline Reset',
      config: DEFAULT_CONFIG,
    });
  };

  const baseShiftHours = config.workingDays * config.shifts * config.shiftHours;
  const overtimeHours = (config.overtimeHoursPerShift || 0) * config.workingDays * config.shifts;
  const weekendHours = (config.weekendShifts || 0) * config.shiftHours;
  const totalAvailableRaw = baseShiftHours + overtimeHours + weekendHours;
  const horizon = (totalAvailableRaw * config.opePercent) / 100;
  const takt = horizon / Math.max(1, config.demand);

  // Helper to update scalar config with interlocks
  const updateField = <K extends keyof SimConfig>(key: K, value: SimConfig[K]) => {
    let sanitizedVal = value;
    if (key === 'demand') sanitizedVal = Math.max(1, Number(value) || 1) as any;
    if (key === 'shifts') sanitizedVal = Math.min(3, Math.max(1, Number(value) || 1)) as any;
    if (key === 'shiftHours') sanitizedVal = Math.min(16, Math.max(4, Number(value) || 8)) as any;
    if (key === 'workingDays') sanitizedVal = Math.min(31, Math.max(1, Number(value) || 26)) as any;
    if (key === 'opePercent') sanitizedVal = Math.min(100, Math.max(10, Number(value) || 80)) as any;
    if (key === 'saStations') sanitizedVal = Math.min(12, Math.max(1, Number(value) || 1)) as any;
    if (key === 'saPeople') sanitizedVal = Math.min(20, Math.max(1, Number(value) || 1)) as any;

    onChange({
      ...config,
      [key]: sanitizedVal,
    });
  };

  // Station helpers with strict interlocks
  const updateStation = (index: number, updates: Partial<Station>) => {
    const updated = [...config.stations];
    const prev = updated[index];
    if (!prev) return;

    let next = { ...prev, ...updates };

    // Interlock: Max people & assigned people integrity
    if (updates.maxPeople !== undefined) {
      next.maxPeople = Math.max(1, Math.min(20, next.maxPeople));
      if (next.people > next.maxPeople) {
        next.people = next.maxPeople;
      }
    }
    if (updates.people !== undefined) {
      next.people = Math.max(1, Math.min(next.maxPeople, next.people));
    }

    // Interlock: copies must be between 1 and 8
    if (updates.copies !== undefined) {
      next.copies = Math.max(1, Math.min(8, next.copies));
    }

    // Interlock: bufferCapacity must be >= 0
    if (updates.bufferCapacity !== undefined) {
      next.bufferCapacity = Math.max(0, Math.min(20, next.bufferCapacity));
    }

    // Interlock: mh must be positive
    if (updates.mh !== undefined) {
      next.mh = Math.max(1, next.mh);
    }

    updated[index] = next;
    onChange({ ...config, stations: updated });
  };

  const addStation = () => {
    const nextIdx = config.stations.length + 1;
    const newStation: Station = {
      id: `st-${Date.now()}`,
      name: `Assembly Station ${nextIdx}`,
      mh: 80,
      people: 3,
      copies: 1,
      maxPeople: 4,
      bufferCapacity: 2,
      color: STATION_COLORS[(nextIdx - 1) % STATION_COLORS.length],
    };
    onChange({ ...config, stations: [...config.stations, newStation] });
  };

  const removeStation = (index: number) => {
    if (config.stations.length <= 1) return;
    const updated = config.stations.filter((_, i) => i !== index);
    // Fix subassembly dueStationIndex if out of bounds
    const updatedSubs = config.subassemblies.map((sa) => ({
      ...sa,
      dueStationIndex: Math.min(updated.length - 1, sa.dueStationIndex),
    }));
    onChange({ ...config, stations: updated, subassemblies: updatedSubs });
  };

  // Subassembly helpers
  const updateSubassembly = (index: number, updates: Partial<Subassembly>) => {
    const updated = [...config.subassemblies];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...config, subassemblies: updated });
  };

  const addSubassembly = () => {
    const newSub: Subassembly = {
      id: `sa-${Date.now()}`,
      name: `Auxiliary Module ${config.subassemblies.length + 1}`,
      mh: 30,
      dueStationIndex: Math.min(config.stations.length - 1, 1),
      riskPercent: 8,
      meanDelayHours: 4,
    };
    onChange({ ...config, subassemblies: [...config.subassemblies, newSub] });
  };

  const removeSubassembly = (index: number) => {
    if (config.subassemblies.length <= 1) return;
    onChange({
      ...config,
      subassemblies: config.subassemblies.filter((_, i) => i !== index),
    });
  };

  // Product Variant helpers
  const updateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const updated = [...(config.variants || [])];
    if (!updated[index]) return;
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...config, variants: updated });
  };

  const applyMachinePreset = (index: number, presetType: VariantType) => {
    const preset = MACHINE_PRESETS.find((p) => p.type === presetType);
    if (!preset) return;
    updateVariant(index, {
      type: preset.type,
      icon: preset.icon,
      name: preset.name,
      code: preset.code,
      badge: preset.badge,
      description: preset.description,
      mhDelta: preset.mhDelta,
      targetStationIndex: preset.targetStationIndex,
      color: preset.color,
    });
  };

  const addVariant = (presetType?: VariantType) => {
    const currentVars = config.variants || [];
    const nextIdx = currentVars.length + 1;
    const preset = presetType ? MACHINE_PRESETS.find((p) => p.type === presetType) : null;
    const newVariant: ProductVariant = preset
      ? {
          id: `var-${Date.now()}`,
          name: `${preset.name} #${nextIdx}`,
          code: `${preset.code}-${nextIdx}`,
          type: preset.type,
          icon: preset.icon,
          description: preset.description,
          mhDelta: preset.mhDelta,
          targetStationIndex: preset.targetStationIndex,
          quantity: 1,
          color: preset.color,
          badge: preset.badge,
        }
      : {
          id: `var-${Date.now()}`,
          name: `Special Mining Spec ${nextIdx}`,
          code: `SPEC-${nextIdx}`,
          type: 'custom',
          icon: '⚙️',
          description: 'Special customized mining package with customer-requested options.',
          mhDelta: 15,
          targetStationIndex: -1,
          quantity: 1,
          color: '#8b5cf6',
          badge: `Spec ${nextIdx}`,
        };
    onChange({ ...config, variants: [...currentVars, newVariant] });
  };

  const removeVariant = (index: number) => {
    const currentVars = config.variants || [];
    if (currentVars.length <= 1) return;
    onChange({
      ...config,
      variants: currentVars.filter((_, i) => i !== index),
    });
  };

  const balanceVariantQuantities = () => {
    const currentVars = [...(config.variants || [])];
    if (currentVars.length === 0) return;
    const currentTotal = currentVars.reduce((sum, v) => sum + v.quantity, 0);
    const diff = config.demand - currentTotal;
    currentVars[0].quantity = Math.max(0, currentVars[0].quantity + diff);
    onChange({ ...config, variants: currentVars });
  };

  const totalVariantQuantity = (config.variants || []).reduce((acc, v) => acc + (v.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Presets & Live Calculation Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-1 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">Factory Parameters & Calibration</h3>
          </div>
          <p className="text-xs text-slate-400">
            Configure line stations, feeder cells, workforce skills, disruption risks and monthly targets.
          </p>
        </div>

        {/* Live Horizon & Takt Calculation Badge */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Available Time</span>
            <span className="text-sm font-mono font-bold text-cyan-400">{horizon.toFixed(1)} h</span>
          </div>

          <div className="bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Required Takt Time</span>
            <span className="text-sm font-mono font-bold text-amber-400">{takt.toFixed(1)} h / truck</span>
          </div>

          <button
            onClick={onOptimize}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Optimize Configuration
          </button>
        </div>
      </div>

      {/* Preset Scenarios Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 whitespace-nowrap mr-2">Presets:</span>
        {SCENARIO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleApplyPresetRequest(preset)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span>{preset.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-mono">
              {preset.badge}
            </span>
          </button>
        ))}
        <button
          onClick={handleResetAllRequest}
          className="ml-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          title="Reset to initial factory baseline (asks Yes/No for target & mix)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      {/* Confirmation Modal: Ask Yes/No before resetting Monthly Target or Multi-Variant Product Mix */}
      {pendingPreset && (
        <ConfirmConfigResetModal
          isOpen={true}
          presetName={pendingPreset.name}
          incomingConfig={pendingPreset.config}
          currentConfig={config}
          onConfirm={(finalCfg) => {
            onChange(finalCfg);
            setPendingPreset(null);
          }}
          onClose={() => setPendingPreset(null)}
        />
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
        {[
          { id: 'calendar', label: 'Monthly Target & Schedule', icon: Calendar },
          { id: 'stations', label: 'Main Assembly Stations', icon: Layers },
          { id: 'subassembly', label: 'Subassembly Feeder Cells', icon: Cpu },
          { id: 'mix', label: 'Product Mix & Variants', icon: Truck },
          { id: 'variability', label: 'Skills & Disruptions', icon: ShieldAlert },
          { id: 'cost', label: 'Costs & Monte Carlo', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MONTHLY TARGET & CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-100">Monthly Production Demand & Operating Schedule</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Defines the net operating window and required cycle speed (Takt = Available Time / Demand).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Monthly Target */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Monthly Target Requirement</span>
                <span className="font-mono text-cyan-400 font-bold">{config.demand} Trucks</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={config.demand}
                  onChange={(e) => updateField('demand', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.demand}
                  onChange={(e) => updateField('demand', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-right text-slate-100"
                />
              </div>
              <span className="text-[11px] text-slate-400">Total finished mining trucks required per monthly cycle.</span>
            </div>

            {/* Shifts per Day */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Shifts Per Day</span>
                <span className="font-mono text-cyan-400 font-bold">{config.shifts} Shifts</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateField('shifts', s)}
                    className={`py-2 text-xs rounded-lg border font-mono transition-colors ${
                      config.shifts === s
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s} {s === 1 ? 'Shift' : 'Shifts'}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400">Production shifts operated daily.</span>
            </div>

            {/* Shift Duration */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Hours Per Shift</span>
                <span className="font-mono text-cyan-400 font-bold">{config.shiftHours} Hours</span>
              </label>
              <input
                type="range"
                min={4}
                max={12}
                step={0.5}
                value={config.shiftHours}
                onChange={(e) => updateField('shiftHours', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">Nominal shift length (typically 8.0 or 10.0 hrs).</span>
            </div>

            {/* Working Days */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Working Days Per Month</span>
                <span className="font-mono text-cyan-400 font-bold">{config.workingDays} Days</span>
              </label>
              <input
                type="range"
                min={15}
                max={31}
                step={1}
                value={config.workingDays}
                onChange={(e) => updateField('workingDays', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">Plant active calendar days (Nashik standard is 26 days).</span>
            </div>

            {/* Overall Plant Effectiveness (OPE %) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Overall Plant Effectiveness (OPE)</span>
                <span className="font-mono text-cyan-400 font-bold">{config.opePercent}%</span>
              </label>
              <input
                type="range"
                min={40}
                max={100}
                step={1}
                value={config.opePercent}
                onChange={(e) => updateField('opePercent', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">
                Accounts for planned breaks, shift handovers, and line changeovers.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MAIN ASSEMBLY STATIONS */}
      {activeTab === 'stations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100">Main Assembly Stations</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Sequential line bays where the truck is progressively assembled and inspected.
              </p>
            </div>
            <button
              onClick={addStation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sequential Station
            </button>
          </div>

          <div className="space-y-4">
            {config.stations.map((st, idx) => (
              <div
                key={st.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-750"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-850 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: st.color }}
                    >
                      S{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={st.name}
                      onChange={(e) => updateStation(idx, { name: e.target.value })}
                      className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 text-sm font-bold text-slate-100 px-1 py-0.5 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {config.stations.length > 1 && (
                      <button
                        onClick={() => removeStation(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                        title="Remove Station"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Granular Station Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                  {/* Work Content MH */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Work Content (MH)</label>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={st.mh}
                      onChange={(e) => updateStation(idx, { mh: Math.max(1, parseFloat(e.target.value) || 1) })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Assigned Operators */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Operators Assigned</label>
                    <input
                      type="number"
                      min={1}
                      max={st.maxPeople}
                      value={st.people}
                      onChange={(e) =>
                        updateStation(idx, {
                          people: Math.min(st.maxPeople, Math.max(1, parseInt(e.target.value) || 1)),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Max People Ergonomic Limit */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Max Ergonomic Limit</label>
                    <input
                      type="number"
                      min={st.people}
                      max={12}
                      value={st.maxPeople}
                      onChange={(e) =>
                        updateStation(idx, {
                          maxPeople: Math.max(st.people, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Parallel Bays (Copies) */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Parallel Bays (Copies)</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={st.copies}
                      onChange={(e) =>
                        updateStation(idx, {
                          copies: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* WIP Buffer Capacity */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">WIP Buffer Slots</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={st.bufferCapacity}
                      onChange={(e) =>
                        updateStation(idx, {
                          bufferCapacity: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUBASSEMBLY FEEDER CELLS */}
      {activeTab === 'subassembly' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100">Subassembly Routing & Feeder Cells</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-fabrication feeder cells supplying subassemblies to designated main line stations.
              </p>
            </div>
            <button
              onClick={addSubassembly}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subassembly Module
            </button>
          </div>

          {/* Feeder Cell Capacity & Dual Material Buffers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Parallel Subassembly Cells: <span className="text-purple-400 font-mono font-bold">{config.saStations}</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={config.saStations}
                onChange={(e) => updateField('saStations', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[11px] text-slate-400">Total concurrent subassembly workstations.</span>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Technicians Per SA Cell: <span className="text-purple-400 font-mono font-bold">{config.saPeople}</span>
              </label>
              <input
                type="range"
                min={1}
                max={15}
                value={config.saPeople}
                onChange={(e) => updateField('saPeople', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[11px] text-slate-400">Staffing dedicated per feeder cell.</span>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Material Buffers Per SA Cell: <span className="text-emerald-400 font-mono font-bold">{config.saBuffers ?? 2} Buffers</span>
              </label>
              <input
                type="range"
                min={2}
                max={6}
                value={config.saBuffers ?? 2}
                onChange={(e) => updateField('saBuffers', Math.max(2, parseInt(e.target.value) || 2))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                2 buffers keep material ready so SA cells will not be empty.
              </span>
            </div>
          </div>

          {/* Subassemblies Table */}
          <div className="space-y-3">
            {config.subassemblies.map((sub, idx) => (
              <div
                key={sub.id}
                className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="sm:col-span-4">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Subassembly Name</span>
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => updateSubassembly(idx, { name: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Work Content</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={sub.mh}
                      onChange={(e) => updateSubassembly(idx, { mh: Math.max(1, parseFloat(e.target.value) || 1) })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 text-xs"
                    />
                    <span className="text-[10px] text-slate-400">MH</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Due Main Station</span>
                  <select
                    value={sub.dueStationIndex}
                    onChange={(e) => updateSubassembly(idx, { dueStationIndex: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                  >
                    {config.stations.map((st, sIdx) => (
                      <option key={st.id} value={sIdx}>
                        S{sIdx + 1}: {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Shortage Risk %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={sub.riskPercent}
                    onChange={(e) => updateSubassembly(idx, { riskPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 text-xs"
                  />
                </div>

                <div className="sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Delay (h)</span>
                  <input
                    type="number"
                    min={0.1}
                    max={50}
                    step={0.5}
                    value={sub.meanDelayHours}
                    onChange={(e) => updateSubassembly(idx, { meanDelayHours: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-200 text-xs"
                  />
                </div>

                <div className="sm:col-span-1 text-right">
                  <button
                    onClick={() => removeSubassembly(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                    title="Remove Subassembly"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PRODUCT MIX & VARIANTS BUILDER */}
      {activeTab === 'mix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          {/* Header & Quick Preset Add Bar */}
          <div className="space-y-4 border-b border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-slate-100">
                    Multi-Variant Product Mix Builder
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure mixed-model vehicle options with distinct machine icons (🛢️ Diesel, ⚡ Electric BEV, 🛡️ Flameproof, 📡 Autonomous, 🏋️ High-Capacity, 🚜 Articulated).
                </p>
              </div>

              <button
                onClick={() => addVariant()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Machine
              </button>
            </div>

            {/* Quick Add Presets Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Quick Add Machine:</span>
              {MACHINE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => addVariant(preset.type)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title={`Add ${preset.name} (+${preset.mhDelta} MH)`}
                >
                  <span className="text-sm">{preset.icon}</span>
                  <span>{preset.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mix Allocation Status Bar */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              totalVariantQuantity === config.demand
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {totalVariantQuantity === config.demand ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>
                Total Allocated Mix: <strong className="font-mono">{totalVariantQuantity}</strong> /{' '}
                <strong className="font-mono">{config.demand}</strong> Monthly Demand Units
                {totalVariantQuantity === config.demand
                  ? ' (Mix sequence perfectly balanced with monthly quota)'
                  : ` (Allocation mismatch: ${totalVariantQuantity > config.demand ? '+' : ''}${totalVariantQuantity - config.demand} units)`}
              </span>
            </div>

            {totalVariantQuantity !== config.demand && (
              <button
                onClick={balanceVariantQuantities}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow transition-colors"
              >
                Auto-Balance to {config.demand} Units
              </button>
            )}
          </div>

          {/* Variant Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(config.variants || []).map((variant, idx) => {
              const pctOfDemand = config.demand > 0 ? (variant.quantity / config.demand) * 100 : 0;
              const currentIcon = variant.icon || (variant.type === 'electric' ? '⚡' : variant.type === 'flameproof' ? '🛡️' : variant.type === 'autonomous' ? '📡' : variant.type === 'high_capacity' ? '🏋️' : variant.type === 'articulated' ? '🚜' : variant.type === 'custom' ? '⚙️' : '🛢️');

              return (
                <div
                  key={variant.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Top Preset Dropdown & Remove Button */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <span className="text-lg shrink-0">{currentIcon}</span>
                        <select
                          value={variant.type}
                          onChange={(e) => applyMachinePreset(idx, e.target.value as VariantType)}
                          className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1 font-mono font-bold w-full truncate focus:outline-none focus:border-cyan-500"
                          title="Apply Machine Preset Template"
                        >
                          <option value="diesel">🛢️ Heavy Diesel (STD)</option>
                          <option value="electric">⚡ Battery Electric (BEV)</option>
                          <option value="flameproof">🛡️ Flameproof Coal Spec</option>
                          <option value="autonomous">📡 Autonomous Tele-Remote</option>
                          <option value="high_capacity">🏋️ High-Capacity 75T</option>
                          <option value="articulated">🚜 Articulated Low-Profile</option>
                          <option value="custom">⚙️ Custom Engineering Spec</option>
                        </select>
                      </div>

                      {(config.variants || []).length > 1 && (
                        <button
                          onClick={() => removeVariant(idx)}
                          className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                          title="Remove Variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Live SVG Machine Graphic & Physical Features Preview */}
                    <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <VehicleGraphic
                          stage={3}
                          status="done"
                          label={variant.code}
                          variantType={variant.type}
                          variantCode={variant.code}
                          icon={variant.icon}
                          width={110}
                          height={58}
                        />
                      </div>
                      <div className="text-right space-y-1 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 block">
                          {variant.badge || variant.code}
                        </span>
                        <span className="text-slate-400 block">
                          {variant.mhDelta >= 0 ? `+${variant.mhDelta}` : variant.mhDelta} MH Work
                        </span>
                      </div>
                    </div>

                    {/* Interactive Machine Icon Picker */}
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Machine Icon Selector
                      </label>
                      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
                        {AVAILABLE_MACHINE_ICONS.map((ico) => {
                          const isSelected = currentIcon === ico;
                          return (
                            <button
                              key={ico}
                              type="button"
                              onClick={() => updateVariant(idx, { icon: ico })}
                              className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-all ${
                                isSelected
                                  ? 'bg-cyan-500/20 border border-cyan-500 text-white scale-110 shadow'
                                  : 'hover:bg-slate-800 text-slate-300 opacity-70 hover:opacity-100'
                              }`}
                              title={`Select icon ${ico}`}
                            >
                              {ico}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Variant Name & Code Inputs */}
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                          Variant Name
                        </label>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(idx, { name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                            Code Badge
                          </label>
                          <input
                            type="text"
                            value={variant.code}
                            onChange={(e) => updateVariant(idx, { code: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                            Work Delta (MH)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={-50}
                              max={150}
                              value={variant.mhDelta}
                              onChange={(e) =>
                                updateVariant(idx, { mhDelta: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-[10px] text-slate-400">MH</span>
                          </div>
                        </div>
                      </div>

                      {/* Primary Station Impacted */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                          Primary Station Impacted
                        </label>
                        <select
                          value={variant.targetStationIndex}
                          onChange={(e) =>
                            updateVariant(idx, { targetStationIndex: parseInt(e.target.value) })
                          }
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                        >
                          <option value={-1}>Distributed across all stations</option>
                          {config.stations.map((st, sIdx) => (
                            <option key={st.id} value={sIdx}>
                              S{sIdx + 1}: {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Allocation Slider */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-850">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Monthly Allocation</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={config.demand}
                          value={variant.quantity}
                          onChange={(e) =>
                            updateVariant(idx, { quantity: Math.max(0, parseInt(e.target.value) || 0) })
                          }
                          className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-right text-slate-100"
                        />
                        <span className="font-mono text-slate-400">
                          ({pctOfDemand.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={config.demand}
                      value={variant.quantity}
                      onChange={(e) =>
                        updateVariant(idx, { quantity: parseInt(e.target.value) || 0 })
                      }
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: VARIABILITY & SHARED RESOURCES */}
      {activeTab === 'variability' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-100">Workforce Dynamics, Quality & Shared Equipment</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Stochastic distributions for human skills, process variance, quality defects, material shortages and overhead crane contention.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Workforce Skill Mean */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Technician Skill Mean</span>
                <span className="font-mono text-cyan-400 font-bold">{config.skillMean}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={130}
                value={config.skillMean}
                onChange={(e) => updateField('skillMean', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">Baseline worker proficiency (100% = standard rate).</span>
            </div>

            {/* Skill Variation */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Skill Variance Std.Dev</span>
                <span className="font-mono text-cyan-400 font-bold">±{config.skillVar}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={config.skillVar}
                onChange={(e) => updateField('skillVar', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">Spread of operator experience across shifts.</span>
            </div>

            {/* Absenteeism */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Operator Absenteeism Rate</span>
                <span className="font-mono text-amber-400 font-bold">{config.absenteeismPercent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={25}
                value={config.absenteeismPercent}
                onChange={(e) => updateField('absenteeismPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[11px] text-slate-400">Unscheduled worker absence per shift.</span>
            </div>

            {/* Process Time Variance */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Process Time Noise</span>
                <span className="font-mono text-cyan-400 font-bold">±{config.processVariancePercent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={config.processVariancePercent}
                onChange={(e) => updateField('processVariancePercent', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">Tolerance variations in manual assembly times.</span>
            </div>

            {/* Product Mix Variance */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Product Option Mix Variance</span>
                <span className="font-mono text-cyan-400 font-bold">±{config.productMixVariance}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={config.productMixVariance}
                onChange={(e) => updateField('productMixVariance', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[11px] text-slate-400">Work content swings due to optional customer packages.</span>
            </div>

            {/* Quality Defect Rate */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Quality Gate Defect Rate</span>
                <span className="font-mono text-red-400 font-bold">{config.qualityFailPercent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={config.qualityFailPercent}
                onChange={(e) => updateField('qualityFailPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <span className="text-[11px] text-slate-400">Probability of failing quality gate inspection.</span>
            </div>

            {/* Mean Rework Hours */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Mean Rework Duration</span>
                <span className="font-mono text-red-400 font-bold">{config.meanReworkHours} Hours</span>
              </label>
              <input
                type="range"
                min={0.5}
                max={20}
                step={0.5}
                value={config.meanReworkHours}
                onChange={(e) => updateField('meanReworkHours', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <span className="text-[11px] text-slate-400">Expected rectification time when defect is caught.</span>
            </div>

            {/* Shared Overhead Cranes */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Shared Overhead Cranes</span>
                <span className="font-mono text-purple-400 font-bold">{config.sharedCranes} Units</span>
              </label>
              <input
                type="range"
                min={1}
                max={6}
                value={config.sharedCranes}
                onChange={(e) => updateField('sharedCranes', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[11px] text-slate-400">Heavy lifting gantry cranes shared along the line.</span>
            </div>

            {/* Crane Downtime / Delay */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Crane Delay Risk</span>
                <span className="font-mono text-purple-400 font-bold">{config.craneRiskPercent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={config.craneRiskPercent}
                onChange={(e) => updateField('craneRiskPercent', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[11px] text-slate-400">Risk of crane mechanical breakdown or queue wait.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COSTS & MONTE CARLO */}
      {activeTab === 'cost' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-100">Financial Model & Monte Carlo Engine</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Unit manufacturing economics, resource costs and stochastic simulation iterations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cost Per Person-Shift */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Labor Cost Per Person-Shift (INR)</span>
                <span className="font-mono text-cyan-400 font-bold">{formatINR(config.costPerPersonShift)}</span>
              </label>
              <input
                type="number"
                min={100}
                max={50000}
                step={100}
                value={config.costPerPersonShift}
                onChange={(e) => updateField('costPerPersonShift', Math.max(100, parseFloat(e.target.value) || 100))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-slate-200"
              />
              <span className="text-[11px] text-slate-400">Direct operator wage plus benefits per 8h shift in ₹.</span>
            </div>

            {/* Cost Per Physical Station Bay */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Fixed Station Bay Cost (INR)</span>
                <span className="font-mono text-cyan-400 font-bold">{formatINR(config.costPerStation)}</span>
              </label>
              <input
                type="number"
                min={1000}
                max={10000000}
                step={10000}
                value={config.costPerStation}
                onChange={(e) => updateField('costPerStation', Math.max(1000, parseFloat(e.target.value) || 1000))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-slate-200"
              />
              <span className="text-[11px] text-slate-400">Tooling amortization, utilities, and floor space cost in ₹.</span>
            </div>

            {/* Unit Selling Price / Value */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Finished Truck Value (INR)</span>
                <span className="font-mono text-emerald-400 font-bold">{formatINR(config.revenuePerUnit, true)}</span>
              </label>
              <input
                type="number"
                min={1000000}
                max={500000000}
                step={500000}
                value={config.revenuePerUnit}
                onChange={(e) => updateField('revenuePerUnit', Math.max(1000000, parseFloat(e.target.value) || 1000000))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-slate-200"
              />
              <span className="text-[11px] text-slate-400">Contract value per delivered MT65 mining truck ({formatINR(config.revenuePerUnit)}).</span>
            </div>

            {/* Monte Carlo Runs */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Monte Carlo Iterations</span>
                <span className="font-mono text-purple-400 font-bold">{config.mcRuns} Runs</span>
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={config.mcRuns}
                onChange={(e) => updateField('mcRuns', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-[11px] text-slate-400">Number of stochastic monthly simulations for statistical confidence.</span>
            </div>

            {/* Random Seed */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Simulation PRNG Seed</span>
                <span className="font-mono text-cyan-400 font-bold">{config.randomSeed}</span>
              </label>
              <input
                type="number"
                min={1}
                max={999999}
                value={config.randomSeed}
                onChange={(e) => updateField('randomSeed', parseInt(e.target.value) || 1)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-slate-200"
              />
              <span className="text-[11px] text-slate-400">Deterministic seed for reproducible runs (Nashik standard: 65).</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
