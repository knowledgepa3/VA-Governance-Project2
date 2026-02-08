/**
 * Red Teaming Module — Barrel Export
 *
 * Adversarial probe engine + finding persistence.
 * Integrates with complianceAnalytics for risk boost + drift synthesis.
 */

// Engine (orchestrator)
export { executeRedTeamRun, ingestConsoleFindings } from './redTeamEngine';
export type { RedTeamRunConfig, RedTeamRunResult, ConsoleProbeResult } from './redTeamEngine';

// Store (CRUD)
export {
  createFinding,
  updateFindingStatus,
  getFinding,
  queryFindings,
  getOpenFindingCounts,
  getWorkerFindingCounts,
  getRedTeamStats,
} from './redTeamStore';

export type {
  RedTeamFinding,
  RedTeamStats,
  FindingStatus,
  FindingSeverity,
  OpenFindingCount,
  WorkerFindingCount,
} from './redTeamStore';

// Probes (definitions + evaluation)
export { RED_TEAM_PROBES, evaluateResponse, runStructuralProbe } from './redTeamProbes';
export type { ProbeDefinition, ProbeResult, ProbeType } from './redTeamProbes';
