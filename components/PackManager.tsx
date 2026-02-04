/**
 * Pack Manager UI
 *
 * Admin interface for managing governance and instruction packs.
 * Allows installation, configuration, and monitoring of packs.
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Settings,
  Download,
  Trash2,
  Power,
  PowerOff,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Info,
  Shield,
  FileText,
  RefreshCw,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Save,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

// =============================================================================
// TYPES (simplified for frontend)
// =============================================================================

interface PackInfo {
  id: string;
  name: string;
  type: 'governance' | 'instruction';
  category: string;
  version: string;
  description: string;
  status: 'available' | 'installed' | 'disabled' | 'update_available';
  pricing?: {
    type: 'free' | 'paid';
    perpetual?: number;
    annual?: number;
  };
  compliance?: string[];
  installed?: {
    installedAt: Date;
    enabledPolicies: number;
    totalPolicies: number;
  };
}

interface PolicyInfo {
  id: string;
  name: string;
  description: string;
  classification: 'MANDATORY' | 'ADVISORY' | 'INFORMATIONAL';
  enabled: boolean;
  canDisable: boolean;
  thresholds?: ThresholdInfo[];
}

interface ThresholdInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min?: number;
  max?: number;
}

interface ConfigField {
  id: string;
  label: string;
  description?: string;
  type: string;
  value: any;
  options?: { value: any; label: string }[];
}

interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  fields: ConfigField[];
}

// =============================================================================
// MOCK DATA (would come from packRegistry in production)
// =============================================================================

const mockPacks: PackInfo[] = [
  {
    id: 'federal-bd',
    name: 'Federal BD Governance Pack',
    type: 'governance',
    category: 'federal',
    version: '1.0.0',
    description: 'Complete governance for federal business development including opportunity qualification, competitive analysis, and bid/no-bid decisions.',
    status: 'installed',
    pricing: { type: 'paid', perpetual: 15000, annual: 5000 },
    compliance: ['FAR', 'NIST 800-171'],
    installed: {
      installedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      enabledPolicies: 6,
      totalPolicies: 7
    }
  },
  {
    id: 'pii-shield',
    name: 'PII Shield',
    type: 'instruction',
    category: 'security',
    version: '1.0.0',
    description: 'Detects, redacts, and logs all PII handling with configurable sensitivity levels.',
    status: 'available',
    pricing: { type: 'paid', annual: 2000 },
    compliance: ['NIST 800-53']
  },
  {
    id: 'human-checkpoint',
    name: 'Human Checkpoint',
    type: 'instruction',
    category: 'general',
    version: '1.0.0',
    description: 'Configurable approval gates for AI actions requiring human oversight.',
    status: 'installed',
    pricing: { type: 'paid', annual: 1000 },
    installed: {
      installedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      enabledPolicies: 3,
      totalPolicies: 3
    }
  },
  {
    id: 'va-claims',
    name: 'VA Claims Governance Pack',
    type: 'governance',
    category: 'federal',
    version: '1.0.0',
    description: 'Evidence chain validation, C&P exam analysis, and nexus letter review for VA claims processing.',
    status: 'available',
    pricing: { type: 'paid', perpetual: 20000, annual: 7500 },
    compliance: ['38 CFR', 'HIPAA']
  },
  {
    id: 'cyber-ir',
    name: 'Cyber IR Governance Pack',
    type: 'governance',
    category: 'security',
    version: '1.0.0',
    description: 'Incident classification, evidence preservation, and red team test orchestration.',
    status: 'available',
    pricing: { type: 'paid', perpetual: 18000, annual: 6500 },
    compliance: ['NIST CSF', 'NIST 800-61']
  }
];

const mockPolicies: PolicyInfo[] = [
  {
    id: 'bd-data-source-verification',
    name: 'Data Source Verification',
    description: 'Ensures all opportunity data comes from verified government sources.',
    classification: 'MANDATORY',
    enabled: true,
    canDisable: false
  },
  {
    id: 'bd-win-probability-review',
    name: 'Win Probability Review',
    description: 'Requires human review when AI-calculated win probability exceeds threshold.',
    classification: 'MANDATORY',
    enabled: true,
    canDisable: false,
    thresholds: [
      { id: 'review-threshold', name: 'Review Threshold', description: 'Win probability that triggers review', type: 'percentage', value: 50, min: 0, max: 100 }
    ]
  },
  {
    id: 'bd-bid-decision-approval',
    name: 'Bid Decision Approval',
    description: 'All final bid/no-bid decisions must be approved by authorized personnel.',
    classification: 'MANDATORY',
    enabled: true,
    canDisable: false
  },
  {
    id: 'bd-high-value-escalation',
    name: 'High Value Escalation',
    description: 'Opportunities above threshold require executive review.',
    classification: 'MANDATORY',
    enabled: true,
    canDisable: true,
    thresholds: [
      { id: 'high-value-threshold', name: 'Value Threshold', description: 'Dollar amount triggering escalation', type: 'number', value: 5000000, min: 100000 }
    ]
  },
  {
    id: 'bd-competitor-analysis-logging',
    name: 'Competitor Analysis Audit',
    description: 'All competitor intelligence gathering is logged for audit purposes.',
    classification: 'INFORMATIONAL',
    enabled: true,
    canDisable: true
  },
  {
    id: 'bd-teaming-recommendation-review',
    name: 'Teaming Recommendation Review',
    description: 'AI teaming partner recommendations should be reviewed before outreach.',
    classification: 'ADVISORY',
    enabled: true,
    canDisable: true
  },
  {
    id: 'bd-deadline-warning',
    name: 'Deadline Warning',
    description: 'Alerts when opportunity deadline is approaching.',
    classification: 'ADVISORY',
    enabled: false,
    canDisable: true,
    thresholds: [
      { id: 'deadline-warning-days', name: 'Warning Days', description: 'Days before deadline to warn', type: 'number', value: 14, min: 1, max: 90 }
    ]
  }
];

const mockConfig: ConfigSection[] = [
  {
    id: 'company-profile',
    title: 'Company Profile',
    description: 'Your company information for win probability calculations',
    fields: [
      { id: 'companyName', label: 'Company Name', type: 'text', value: 'Storey Governance Solutions' },
      { id: 'yearsInBusiness', label: 'Years in Business', type: 'number', value: 10 },
      { id: 'naicsCodes', label: 'NAICS Codes', description: 'Comma-separated', type: 'text', value: '541512,541511' }
    ]
  },
  {
    id: 'opportunity-filters',
    title: 'Opportunity Filters',
    description: 'Default filters for opportunity discovery',
    fields: [
      { id: 'minContractValue', label: 'Minimum Contract Value', type: 'number', value: 100000 },
      { id: 'maxContractValue', label: 'Maximum Contract Value', type: 'number', value: 50000000 }
    ]
  },
  {
    id: 'analysis-settings',
    title: 'Analysis Settings',
    fields: [
      { id: 'competitorAnalysisYears', label: 'Competitor Analysis Years', type: 'number', value: 3 },
      { id: 'strictDataMode', label: 'Strict Data Mode', description: 'Fail if real data unavailable', type: 'boolean', value: true }
    ]
  }
];

// =============================================================================
// COMPONENT
// =============================================================================

export const PackManager: React.FC = () => {
  const [packs, setPacks] = useState<PackInfo[]>(mockPacks);
  const [selectedPack, setSelectedPack] = useState<PackInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'installed'>('installed');
  const [detailView, setDetailView] = useState<'overview' | 'policies' | 'config'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'governance' | 'instruction'>('all');
  const [policies, setPolicies] = useState<PolicyInfo[]>(mockPolicies);
  const [config, setConfig] = useState<ConfigSection[]>(mockConfig);
  const [hasChanges, setHasChanges] = useState(false);

  const installedPacks = packs.filter(p => p.status === 'installed' || p.status === 'disabled');
  const availablePacks = packs.filter(p => p.status === 'available');

  const filteredPacks = (activeTab === 'installed' ? installedPacks : availablePacks)
    .filter(p => filterType === 'all' || p.type === filterType)
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'MANDATORY': return 'bg-red-600 text-white';
      case 'ADVISORY': return 'bg-yellow-600 text-white';
      case 'INFORMATIONAL': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'installed': return 'bg-emerald-600 text-white';
      case 'disabled': return 'bg-slate-600 text-white';
      case 'available': return 'bg-blue-600 text-white';
      case 'update_available': return 'bg-amber-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const handlePolicyToggle = (policyId: string) => {
    setPolicies(prev => prev.map(p =>
      p.id === policyId && p.canDisable
        ? { ...p, enabled: !p.enabled }
        : p
    ));
    setHasChanges(true);
  };

  const handleThresholdChange = (policyId: string, thresholdId: string, value: number) => {
    setPolicies(prev => prev.map(p =>
      p.id === policyId
        ? {
            ...p,
            thresholds: p.thresholds?.map(t =>
              t.id === thresholdId ? { ...t, value } : t
            )
          }
        : p
    ));
    setHasChanges(true);
  };

  const handleConfigChange = (sectionId: string, fieldId: string, value: any) => {
    setConfig(prev => prev.map(s =>
      s.id === sectionId
        ? {
            ...s,
            fields: s.fields.map(f =>
              f.id === fieldId ? { ...f, value } : f
            )
          }
        : s
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In production, this would call packConfigService
    console.log('Saving configuration...');
    setHasChanges(false);
  };

  const handleInstall = (packId: string) => {
    setPacks(prev => prev.map(p =>
      p.id === packId
        ? { ...p, status: 'installed' as const, installed: { installedAt: new Date(), enabledPolicies: 3, totalPolicies: 5 } }
        : p
    ));
  };

  const handleUninstall = (packId: string) => {
    setPacks(prev => prev.map(p =>
      p.id === packId
        ? { ...p, status: 'available' as const, installed: undefined }
        : p
    ));
    setSelectedPack(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Pack Manager</h1>
              <p className="text-xs text-slate-400">Install and configure governance packs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-emerald-900/50 border border-emerald-700 rounded-lg text-xs text-emerald-300">
              {installedPacks.length} Installed
            </span>
            <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">
              {availablePacks.length} Available
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Panel - Pack List */}
        <div className="col-span-1 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('installed')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'installed'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              Installed
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                activeTab === 'catalog'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              Catalog
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search packs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            >
              <option value="all">All</option>
              <option value="governance">Governance</option>
              <option value="instruction">Instruction</option>
            </select>
          </div>

          {/* Pack List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredPacks.map(pack => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPack?.id === pack.id
                    ? 'bg-purple-900/30 border-purple-600'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      pack.type === 'governance' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'
                    }`}>
                      {pack.type.toUpperCase()}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getStatusColor(pack.status)}`}>
                      {pack.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">v{pack.version}</span>
                </div>
                <h3 className="text-white font-medium text-sm mb-1">{pack.name}</h3>
                <p className="text-slate-400 text-xs line-clamp-2">{pack.description}</p>
                {pack.installed && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                    <Shield size={10} />
                    {pack.installed.enabledPolicies}/{pack.installed.totalPolicies} policies enabled
                  </div>
                )}
              </div>
            ))}

            {filteredPacks.length === 0 && (
              <div className="p-8 text-center">
                <Package size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No packs found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Pack Details */}
        <div className="col-span-2">
          {selectedPack ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {/* Pack Header */}
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedPack.type === 'governance' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'
                      }`}>
                        {selectedPack.type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(selectedPack.status)}`}>
                        {selectedPack.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {selectedPack.compliance?.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300">
                          {c}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedPack.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">{selectedPack.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPack.status === 'available' ? (
                      <button
                        onClick={() => handleInstall(selectedPack.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500"
                      >
                        <Download size={14} />
                        Install
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleUninstall(selectedPack.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
                        >
                          <Trash2 size={14} />
                          Uninstall
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Detail Tabs */}
                {selectedPack.status !== 'available' && (
                  <div className="flex gap-2 mt-4">
                    {['overview', 'policies', 'config'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setDetailView(tab as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${
                          detailView === tab
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {selectedPack.status === 'available' ? (
                  // Available Pack Info
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Pricing</h4>
                        {selectedPack.pricing?.perpetual && (
                          <p className="text-white">
                            <span className="text-2xl font-bold">${selectedPack.pricing.perpetual.toLocaleString()}</span>
                            <span className="text-slate-400 text-sm"> perpetual</span>
                          </p>
                        )}
                        {selectedPack.pricing?.annual && (
                          <p className="text-slate-400 text-sm">
                            or ${selectedPack.pricing.annual.toLocaleString()}/year subscription
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Compliance</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPack.compliance?.map(c => (
                            <span key={c} className="px-2 py-1 bg-slate-800 rounded text-sm text-white">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : detailView === 'overview' ? (
                  // Installed Pack Overview
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Installed</h4>
                        <p className="text-white text-lg">
                          {selectedPack.installed?.installedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Policies</h4>
                        <p className="text-white text-lg">
                          {selectedPack.installed?.enabledPolicies}/{selectedPack.installed?.totalPolicies} enabled
                        </p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Version</h4>
                        <p className="text-white text-lg">v{selectedPack.version}</p>
                      </div>
                    </div>
                  </div>
                ) : detailView === 'policies' ? (
                  // Policy Configuration
                  <div className="space-y-3">
                    {policies.map(policy => (
                      <div key={policy.id} className="bg-slate-900 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getClassificationColor(policy.classification)}`}>
                                {policy.classification}
                              </span>
                              <h4 className="text-white font-medium text-sm">{policy.name}</h4>
                            </div>
                            <p className="text-slate-400 text-xs">{policy.description}</p>

                            {/* Thresholds */}
                            {policy.thresholds && policy.thresholds.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {policy.thresholds.map(threshold => (
                                  <div key={threshold.id} className="flex items-center gap-3">
                                    <label className="text-xs text-slate-400 w-32">{threshold.name}:</label>
                                    <input
                                      type="number"
                                      value={threshold.value}
                                      onChange={(e) => handleThresholdChange(policy.id, threshold.id, Number(e.target.value))}
                                      min={threshold.min}
                                      max={threshold.max}
                                      disabled={!policy.enabled}
                                      className="w-32 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white disabled:opacity-50"
                                    />
                                    <span className="text-xs text-slate-500">{threshold.type === 'percentage' ? '%' : ''}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handlePolicyToggle(policy.id)}
                            disabled={!policy.canDisable}
                            className={`p-2 rounded-lg transition-colors ${
                              policy.enabled
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-400'
                            } ${!policy.canDisable ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                            title={policy.canDisable ? (policy.enabled ? 'Disable' : 'Enable') : 'Cannot disable mandatory policy'}
                          >
                            {policy.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Configuration
                  <div className="space-y-6">
                    {config.map(section => (
                      <div key={section.id}>
                        <h3 className="text-white font-bold text-sm mb-1">{section.title}</h3>
                        {section.description && (
                          <p className="text-slate-400 text-xs mb-3">{section.description}</p>
                        )}
                        <div className="space-y-3">
                          {section.fields.map(field => (
                            <div key={field.id} className="flex items-center gap-4">
                              <label className="text-sm text-slate-300 w-48">{field.label}</label>
                              {field.type === 'boolean' ? (
                                <button
                                  onClick={() => handleConfigChange(section.id, field.id, !field.value)}
                                  className={`p-2 rounded-lg ${
                                    field.value ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                                  }`}
                                >
                                  {field.value ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                </button>
                              ) : field.type === 'number' ? (
                                <input
                                  type="number"
                                  value={field.value}
                                  onChange={(e) => handleConfigChange(section.id, field.id, Number(e.target.value))}
                                  className="w-48 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => handleConfigChange(section.id, field.id, e.target.value)}
                                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Bar */}
                {hasChanges && selectedPack.status !== 'available' && (
                  <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-amber-400 text-xs flex items-center gap-2">
                      <AlertTriangle size={14} />
                      You have unsaved changes
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHasChanges(false)}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500"
                      >
                        <Save size={14} />
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // No Pack Selected
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
              <Package size={48} className="text-slate-600 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Select a Pack</h3>
              <p className="text-slate-400 text-sm">Choose a pack from the list to view details and configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackManager;
