/**
 * Shared ControlSeed interface for all NIST 800-53 seed files.
 *
 * Mirrors the interface defined in governanceLibrary.seed.ts.
 * Exported here so individual family files can import it.
 */

export interface ControlSeed {
  policyId: string;
  controlFamily: string;
  title: string;
  description: string;
  requirements: {
    requirementId: string;
    description: string;
    checkType: 'automated' | 'manual' | 'evidence';
    isMandatory: boolean;
  }[];
  evidenceArtifacts: string[];
  riskLevel: string;
  maiLevel: string;
  implementationStatus: string;
  applicableWorkerTypes: string[];
  evidenceTemplates: {
    templateId: string;
    name: string;
    templateType: string;
    isRequired: boolean;
  }[];
}
