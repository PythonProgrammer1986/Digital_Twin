import { SimConfig } from '../types/simulation';

export const STATION_COLORS = [
  '#0284c7', // Sky / Cyan
  '#0d9488', // Teal
  '#ea580c', // Orange
  '#16a34a', // Emerald Green
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#ca8a04', // Amber
  '#2563eb', // Blue
];

export const DEFAULT_CONFIG: SimConfig = {
  demand: 10,
  saStations: 2,
  saPeople: 4,
  saBuffers: 2,
  shifts: 2,
  shiftHours: 8,
  workingDays: 26,
  overtimeHoursPerShift: 0,
  weekendShifts: 0,
  opePercent: 80,
  skillMean: 95,
  skillVar: 8,
  absenteeismPercent: 4,
  processVariancePercent: 7,
  productMixVariance: 8,
  materialRiskPercent: 8,
  materialDelayHours: 5,
  qualityFailPercent: 5,
  meanReworkHours: 4,
  sharedCranes: 2,
  craneRiskPercent: 3,
  craneDelayHours: 2,
  costPerPersonShift: 1500,       // ₹1,500 per person per shift (INR)
  costPerStation: 150000,          // ₹1,50,000 monthly tooling & maintenance per bay (INR)
  revenuePerUnit: 32000000,        // ₹3.20 Crore per MT65 mining truck (INR)
  mcRuns: 60,
  randomSeed: 65,
  stations: [
    {
      id: 'st-1',
      name: 'Chassis & Driveline',
      mh: 110,
      people: 3,
      copies: 1,
      maxPeople: 4,
      bufferCapacity: 2,
      color: STATION_COLORS[0],
    },
    {
      id: 'st-2',
      name: 'Hydraulic & Electrical',
      mh: 100,
      people: 3,
      copies: 1,
      maxPeople: 4,
      bufferCapacity: 2,
      color: STATION_COLORS[1],
    },
    {
      id: 'st-3',
      name: 'Engine, Cabin & Structures',
      mh: 110,
      people: 3,
      copies: 1,
      maxPeople: 4,
      bufferCapacity: 2,
      color: STATION_COLORS[2],
    },
    {
      id: 'st-4',
      name: 'Final & Validation (PDI)',
      mh: 96,
      people: 3,
      copies: 1,
      maxPeople: 3,
      bufferCapacity: 2,
      color: STATION_COLORS[3],
    },
  ],
  subassemblies: [
    { id: 'sa-1', name: 'Load Frame', mh: 55, dueStationIndex: 0, riskPercent: 8, meanDelayHours: 4 },
    { id: 'sa-2', name: 'Front Axle', mh: 30, dueStationIndex: 0, riskPercent: 8, meanDelayHours: 6 },
    { id: 'sa-3', name: 'Hydraulic Valve Module', mh: 40, dueStationIndex: 1, riskPercent: 10, meanDelayHours: 6 },
    { id: 'sa-4', name: 'Main Harness Kit', mh: 35, dueStationIndex: 1, riskPercent: 8, meanDelayHours: 4 },
    { id: 'sa-5', name: 'Engine Radiator Module', mh: 55, dueStationIndex: 2, riskPercent: 10, meanDelayHours: 8 },
    { id: 'sa-6', name: 'ROPS/FOPS Cabin Module', mh: 45, dueStationIndex: 2, riskPercent: 12, meanDelayHours: 10 },
    { id: 'sa-7', name: 'Pre-Delivery Inspection Kit', mh: 25, dueStationIndex: 3, riskPercent: 6, meanDelayHours: 4 },
  ],
  variants: [
    {
      id: 'var-std',
      name: 'MT65 Standard Heavy Diesel',
      code: 'STD-DIESEL',
      type: 'diesel',
      icon: '🛢️',
      description: 'High-payload Cummins 16-cylinder diesel powertrain with heavy rock tipper.',
      mhDelta: 0,
      targetStationIndex: -1,
      quantity: 5,
      color: '#eab308',
      badge: 'Baseline',
    },
    {
      id: 'var-bev',
      name: 'MT65 Zero-Emission Battery-Electric',
      code: 'BEV-ELECTRIC',
      type: 'electric',
      icon: '⚡',
      description: 'High-voltage 680 kWh LFP battery packs, dual inverters & regenerative braking (+35 MH).',
      mhDelta: 35,
      targetStationIndex: 1,
      quantity: 3,
      color: '#06b6d4',
      badge: 'BEV',
    },
    {
      id: 'var-flame',
      name: 'MT65 Flameproof & Explosion-Proof Coal Spec',
      code: 'FLAMEPROOF',
      type: 'flameproof',
      icon: '🛡️',
      description: 'DGMS-certified flameproof enclosure, wet scrubber exhaust & automated fire suppression (+20 MH).',
      mhDelta: 20,
      targetStationIndex: 0,
      quantity: 1,
      color: '#f97316',
      badge: 'Flameproof',
    },
    {
      id: 'var-auto',
      name: 'MT65 Autonomous & Tele-Remote Hauler',
      code: 'AUTO-ROBOTIC',
      type: 'autonomous',
      icon: '📡',
      description: 'Roof LiDAR scanner, dual GNSS antennas, radar collision avoidance & tele-remote automation (+25 MH).',
      mhDelta: 25,
      targetStationIndex: 2,
      quantity: 1,
      color: '#a855f7',
      badge: 'Auto-LiDAR',
    },
  ],
};

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  config: Partial<SimConfig>;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'baseline-mt65',
    name: 'MT65 Nashik Baseline',
    description: 'Factory baseline setup with 10 mining trucks monthly demand across 4 primary assembly bays.',
    badge: 'Baseline',
    config: DEFAULT_CONFIG,
  },
  {
    id: 'surge-demand',
    name: 'High Demand Surge (16 Units)',
    description: 'Demand ramp-up to 16 trucks/month. Tests whether current line capacity can absorb 60% surge without parallel bays.',
    badge: 'Demand Surge',
    config: {
      ...DEFAULT_CONFIG,
      demand: 16,
      shifts: 3,
      opePercent: 85,
    },
  },
  {
    id: 'supply-crunch',
    name: 'Global Supply Chain Disruption',
    description: 'Material shortages elevate risk to 24% with 9h average delivery delay and high subassembly starvation.',
    badge: 'High Disruption',
    config: {
      ...DEFAULT_CONFIG,
      materialRiskPercent: 24,
      materialDelayHours: 9,
      craneRiskPercent: 8,
      craneDelayHours: 4,
    },
  },
  {
    id: 'lean-optimized',
    name: 'Lean Balanced Flow',
    description: 'Optimized station copies and work leveling for low WIP, 98% skill stability, and minimal bottleneck queues.',
    badge: 'Lean Flow',
    config: {
      ...DEFAULT_CONFIG,
      opePercent: 88,
      skillMean: 105,
      skillVar: 4,
      absenteeismPercent: 2,
      processVariancePercent: 4,
      qualityFailPercent: 2,
    },
  },
];
