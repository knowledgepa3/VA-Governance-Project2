/**
 * JOB PACK REGISTRY v1.0.0
 *
 * Central registry for discovering, loading, and managing Job Packs.
 * Foundation for:
 * - Multi-pack execution
 * - Pack versioning and compatibility
 * - Marketplace integration
 * - Pack dependency resolution
 */

import { JobPack, validateJobPack } from './JobPackSchema';
import {
  CertificationLevel,
  CertificationRecord,
  CERTIFICATION_LEVEL_NAMES,
  createCertificationRecord,
  calculateCertificationLevel
} from '../../governance/PackCertificationSchema';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface PackRegistryEntry {
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Metadata for discovery
  name: string;
  description: string;
  domain: string;           // e.g., "sam.gov", "grants.gov", "usajobs.gov"
  category: string;         // e.g., "procurement", "grants", "hiring"

  // Capabilities
  capabilities: string[];   // What this pack can do
  outputs: string[];        // What it produces

  // Requirements
  required_permissions: string[];
  mai_profile: {
    informational_count: number;
    advisory_count: number;
    mandatory_count: number;
  };

  // File location
  file_path: string;
  loaded_at: string;

  // Compatibility
  min_executor_version: string;
  max_executor_version?: string;
  dependencies?: string[];  // Other pack_ids this depends on

  // Certification status (added v1.1.0)
  certification: {
    level: CertificationLevel;
    level_name: string;
    certified_at?: string;
    certified_by?: string;
    record_path?: string;   // Path to full certification record
  };
}

export interface RegistryIndex {
  registry_version: string;
  updated_at: string;
  packs: PackRegistryEntry[];

  // Quick lookup indexes
  by_domain: Record<string, string[]>;      // domain -> pack_ids
  by_category: Record<string, string[]>;    // category -> pack_ids
  by_capability: Record<string, string[]>;  // capability -> pack_ids
  by_certification: Record<string, string[]>;  // certification level -> pack_ids (added v1.1.0)
}

export interface PackSearchCriteria {
  domain?: string;
  category?: string;
  capability?: string;
  keyword?: string;
  max_mandatory_actions?: number;
  min_certification_level?: CertificationLevel;  // Only return packs at or above this level
}

export interface PackLoadResult {
  success: boolean;
  pack?: JobPack;
  entry?: PackRegistryEntry;
  error?: string;
}

// =============================================================================
// REGISTRY CLASS
// =============================================================================

export class JobPackRegistry {
  private index: RegistryIndex;
  private packsDir: string;
  private loadedPacks: Map<string, JobPack> = new Map();

  constructor(packsDir: string) {
    this.packsDir = packsDir;
    this.index = {
      registry_version: '1.1.0',
      updated_at: new Date().toISOString(),
      packs: [],
      by_domain: {},
      by_category: {},
      by_capability: {},
      by_certification: {}
    };
  }

  // ===========================================================================
  // REGISTRATION
  // ===========================================================================

  /**
   * Register a Job Pack from file
   */
  registerFromFile(filePath: string): PackRegistryEntry | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const pack = JSON.parse(content) as JobPack;

      // Validate pack
      const validation = validateJobPack(pack);
      if (!validation.valid) {
        console.error(`Invalid pack at ${filePath}: ${validation.errors.join(', ')}`);
        return null;
      }

      // Compute pack hash
      const packHash = crypto.createHash('sha256')
        .update(content)
        .digest('hex');

      // Run certification checks
      const certRecord = createCertificationRecord(pack, packHash);

      // Build registry entry
      const entry: PackRegistryEntry = {
        pack_id: pack.pack_id,
        pack_version: pack.pack_version,
        pack_hash: packHash,

        name: pack.role.name,
        description: pack.role.description,
        domain: pack.ui_map.domain,
        category: this.inferCategory(pack),

        capabilities: pack.procedure_index.mini_index.map(e => e.task),
        outputs: pack.role.outputs,

        required_permissions: pack.permissions.allowed.map(p => p.action),
        mai_profile: {
          informational_count: pack.authority.informational_actions.length,
          advisory_count: pack.authority.advisory_actions.length,
          mandatory_count: pack.authority.mandatory_actions.length
        },

        file_path: filePath,
        loaded_at: new Date().toISOString(),

        min_executor_version: '1.0.0',

        // Certification status
        certification: {
          level: certRecord.current_level,
          level_name: CERTIFICATION_LEVEL_NAMES[certRecord.current_level],
          certified_at: certRecord.certification_history.length > 0
            ? certRecord.certification_history[certRecord.certification_history.length - 1].achieved_at
            : undefined,
          certified_by: certRecord.certification_history.length > 0
            ? certRecord.certification_history[certRecord.certification_history.length - 1].certified_by
            : undefined
        }
      };

      // Add to index
      this.addToIndex(entry);

      return entry;
    } catch (error: any) {
      console.error(`Failed to register pack from ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Scan directory for Job Packs and register all
   */
  scanAndRegister(): number {
    let registered = 0;

    const files = fs.readdirSync(this.packsDir);
    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('_')) {
        const filePath = path.join(this.packsDir, file);
        const entry = this.registerFromFile(filePath);
        if (entry) {
          registered++;
          console.log(`✓ Registered: ${entry.pack_id} (${entry.name})`);
        }
      }
    }

    this.index.updated_at = new Date().toISOString();
    return registered;
  }

  // ===========================================================================
  // LOOKUP & SEARCH
  // ===========================================================================

  /**
   * Get pack by ID
   */
  getPackEntry(packId: string): PackRegistryEntry | undefined {
    return this.index.packs.find(p => p.pack_id === packId);
  }

  /**
   * Search packs by criteria
   */
  search(criteria: PackSearchCriteria): PackRegistryEntry[] {
    let results = [...this.index.packs];

    if (criteria.domain) {
      const packIds = this.index.by_domain[criteria.domain] || [];
      results = results.filter(p => packIds.includes(p.pack_id));
    }

    if (criteria.category) {
      const packIds = this.index.by_category[criteria.category] || [];
      results = results.filter(p => packIds.includes(p.pack_id));
    }

    if (criteria.capability) {
      const packIds = this.index.by_capability[criteria.capability] || [];
      results = results.filter(p => packIds.includes(p.pack_id));
    }

    if (criteria.keyword) {
      const kw = criteria.keyword.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.description.toLowerCase().includes(kw) ||
        p.capabilities.some(c => c.toLowerCase().includes(kw))
      );
    }

    if (criteria.max_mandatory_actions !== undefined) {
      results = results.filter(p =>
        p.mai_profile.mandatory_count <= criteria.max_mandatory_actions!
      );
    }

    if (criteria.min_certification_level !== undefined) {
      results = results.filter(p =>
        p.certification.level >= criteria.min_certification_level!
      );
    }

    return results;
  }

  /**
   * Find pack for a specific task
   */
  findPackForTask(task: string, domain?: string): PackRegistryEntry | undefined {
    const taskLower = task.toLowerCase();

    let candidates = this.index.packs;
    if (domain) {
      const packIds = this.index.by_domain[domain] || [];
      candidates = candidates.filter(p => packIds.includes(p.pack_id));
    }

    // Score each pack by how well it matches the task
    const scored = candidates.map(pack => {
      let score = 0;

      // Check capabilities
      for (const cap of pack.capabilities) {
        if (cap.toLowerCase().includes(taskLower)) score += 10;
        if (taskLower.includes(cap.toLowerCase())) score += 5;
      }

      // Check description
      if (pack.description.toLowerCase().includes(taskLower)) score += 3;

      // Prefer packs with fewer mandatory actions (safer)
      score -= pack.mai_profile.mandatory_count;

      return { pack, score };
    });

    // Return best match
    const best = scored.sort((a, b) => b.score - a.score)[0];
    return best?.score > 0 ? best.pack : undefined;
  }

  // ===========================================================================
  // LOADING
  // ===========================================================================

  /**
   * Load a Job Pack into memory
   */
  loadPack(packId: string): PackLoadResult {
    // Check if already loaded
    if (this.loadedPacks.has(packId)) {
      const pack = this.loadedPacks.get(packId)!;
      const entry = this.getPackEntry(packId);
      return { success: true, pack, entry };
    }

    // Find entry
    const entry = this.getPackEntry(packId);
    if (!entry) {
      return { success: false, error: `Pack not found: ${packId}` };
    }

    // Load from file
    try {
      const content = fs.readFileSync(entry.file_path, 'utf-8');
      const pack = JSON.parse(content) as JobPack;

      // Verify hash
      const currentHash = crypto.createHash('sha256')
        .update(content)
        .digest('hex');

      if (currentHash !== entry.pack_hash) {
        return {
          success: false,
          error: `Pack hash mismatch - file may have been modified. Expected ${entry.pack_hash.substring(0, 16)}..., got ${currentHash.substring(0, 16)}...`
        };
      }

      this.loadedPacks.set(packId, pack);
      return { success: true, pack, entry };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unload a pack from memory
   */
  unloadPack(packId: string): void {
    this.loadedPacks.delete(packId);
  }

  // ===========================================================================
  // INDEX MANAGEMENT
  // ===========================================================================

  private addToIndex(entry: PackRegistryEntry): void {
    // Remove existing if present
    this.index.packs = this.index.packs.filter(p => p.pack_id !== entry.pack_id);

    // Add entry
    this.index.packs.push(entry);

    // Update domain index
    if (!this.index.by_domain[entry.domain]) {
      this.index.by_domain[entry.domain] = [];
    }
    if (!this.index.by_domain[entry.domain].includes(entry.pack_id)) {
      this.index.by_domain[entry.domain].push(entry.pack_id);
    }

    // Update category index
    if (!this.index.by_category[entry.category]) {
      this.index.by_category[entry.category] = [];
    }
    if (!this.index.by_category[entry.category].includes(entry.pack_id)) {
      this.index.by_category[entry.category].push(entry.pack_id);
    }

    // Update capability index
    for (const cap of entry.capabilities) {
      const capKey = cap.toLowerCase().replace(/\s+/g, '_');
      if (!this.index.by_capability[capKey]) {
        this.index.by_capability[capKey] = [];
      }
      if (!this.index.by_capability[capKey].includes(entry.pack_id)) {
        this.index.by_capability[capKey].push(entry.pack_id);
      }
    }

    // Update certification index
    const certLevel = entry.certification.level_name;
    if (!this.index.by_certification[certLevel]) {
      this.index.by_certification[certLevel] = [];
    }
    if (!this.index.by_certification[certLevel].includes(entry.pack_id)) {
      this.index.by_certification[certLevel].push(entry.pack_id);
    }
  }

  private inferCategory(pack: JobPack): string {
    const domain = pack.ui_map.domain.toLowerCase();
    const mission = pack.role.mission.toLowerCase();

    if (domain.includes('sam.gov') || mission.includes('procurement') || mission.includes('contract')) {
      return 'procurement';
    }
    if (domain.includes('grants.gov') || mission.includes('grant')) {
      return 'grants';
    }
    if (domain.includes('usajobs') || mission.includes('hiring') || mission.includes('recruit')) {
      return 'hiring';
    }
    if (mission.includes('compliance') || mission.includes('audit')) {
      return 'compliance';
    }

    return 'general';
  }

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  /**
   * Save index to file
   */
  saveIndex(filePath?: string): void {
    const indexPath = filePath || path.join(this.packsDir, '_registry_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(this.index, null, 2));
  }

  /**
   * Load index from file
   */
  loadIndex(filePath?: string): boolean {
    const indexPath = filePath || path.join(this.packsDir, '_registry_index.json');

    if (!fs.existsSync(indexPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      this.index = JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  getIndex(): RegistryIndex {
    return this.index;
  }

  getAllDomains(): string[] {
    return Object.keys(this.index.by_domain);
  }

  getAllCategories(): string[] {
    return Object.keys(this.index.by_category);
  }

  getPackCount(): number {
    return this.index.packs.length;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a quick summary of a pack for display
 */
export function packSummary(entry: PackRegistryEntry): string {
  const certBadge = getCertificationBadge(entry.certification.level);

  return `
${entry.name} (${entry.pack_id}) ${certBadge}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain:        ${entry.domain}
Category:      ${entry.category}
Version:       ${entry.pack_version}
Certification: ${entry.certification.level_name}${entry.certification.certified_by ? ` (by ${entry.certification.certified_by})` : ''}

Capabilities (${entry.capabilities.length}):
${entry.capabilities.map(c => `  • ${c}`).join('\n')}

MAI Profile:
  Informational: ${entry.mai_profile.informational_count} (auto-execute)
  Advisory:      ${entry.mai_profile.advisory_count} (suggest)
  Mandatory:     ${entry.mai_profile.mandatory_count} (human approval)

Outputs:
${entry.outputs.map(o => `  → ${o}`).join('\n')}
`.trim();
}

/**
 * Get visual badge for certification level
 */
export function getCertificationBadge(level: CertificationLevel): string {
  switch (level) {
    case CertificationLevel.DRAFT:
      return '[DRAFT]';
    case CertificationLevel.VALIDATED:
      return '[✓ VALIDATED]';
    case CertificationLevel.TESTED:
      return '[✓✓ TESTED]';
    case CertificationLevel.CERTIFIED:
      return '[★ CERTIFIED]';
    case CertificationLevel.PRODUCTION:
      return '[★★ PRODUCTION]';
    default:
      return '[?]';
  }
}

/**
 * Compare two packs for compatibility
 */
export function comparePackVersions(
  entry1: PackRegistryEntry,
  entry2: PackRegistryEntry
): { compatible: boolean; differences: string[] } {
  const differences: string[] = [];

  if (entry1.pack_id !== entry2.pack_id) {
    return { compatible: false, differences: ['Different pack IDs'] };
  }

  if (entry1.pack_version !== entry2.pack_version) {
    differences.push(`Version: ${entry1.pack_version} vs ${entry2.pack_version}`);
  }

  if (entry1.pack_hash !== entry2.pack_hash) {
    differences.push('Content hash differs');
  }

  if (entry1.mai_profile.mandatory_count !== entry2.mai_profile.mandatory_count) {
    differences.push(`Mandatory actions: ${entry1.mai_profile.mandatory_count} vs ${entry2.mai_profile.mandatory_count}`);
  }

  return {
    compatible: differences.length === 0,
    differences
  };
}

export default JobPackRegistry;
