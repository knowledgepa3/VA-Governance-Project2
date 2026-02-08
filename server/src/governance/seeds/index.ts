/**
 * Governance Library Seeds — Barrel Export
 *
 * Aggregates all NIST 800-53 control family seed arrays
 * into a single export for the expanded library seeder.
 *
 * 14 families, ~92 controls total.
 */

export type { ControlSeed } from './types';

export { AT_CONTROLS } from './nist-AT';
export { IA_CONTROLS } from './nist-IA';
export { MA_CONTROLS } from './nist-MA';
export { MP_CONTROLS } from './nist-MP';
export { PE_CONTROLS } from './nist-PE';
export { PL_CONTROLS } from './nist-PL';
export { PM_CONTROLS } from './nist-PM';
export { PS_CONTROLS } from './nist-PS';
export { SA_CONTROLS } from './nist-SA';
export { SC_CONTROLS } from './nist-SC';
export { SI_CONTROLS } from './nist-SI';
export { CP_CONTROLS } from './nist-CP';
export { PT_CONTROLS } from './nist-PT';
export { SR_CONTROLS } from './nist-SR';

// Combined array for bulk seeding
import { AT_CONTROLS } from './nist-AT';
import { IA_CONTROLS } from './nist-IA';
import { MA_CONTROLS } from './nist-MA';
import { MP_CONTROLS } from './nist-MP';
import { PE_CONTROLS } from './nist-PE';
import { PL_CONTROLS } from './nist-PL';
import { PM_CONTROLS } from './nist-PM';
import { PS_CONTROLS } from './nist-PS';
import { SA_CONTROLS } from './nist-SA';
import { SC_CONTROLS } from './nist-SC';
import { SI_CONTROLS } from './nist-SI';
import { CP_CONTROLS } from './nist-CP';
import { PT_CONTROLS } from './nist-PT';
import { SR_CONTROLS } from './nist-SR';

export const ALL_EXPANDED_CONTROLS = [
  ...AT_CONTROLS,
  ...IA_CONTROLS,
  ...MA_CONTROLS,
  ...MP_CONTROLS,
  ...PE_CONTROLS,
  ...PL_CONTROLS,
  ...PM_CONTROLS,
  ...PS_CONTROLS,
  ...SA_CONTROLS,
  ...SC_CONTROLS,
  ...SI_CONTROLS,
  ...CP_CONTROLS,
  ...PT_CONTROLS,
  ...SR_CONTROLS,
];
