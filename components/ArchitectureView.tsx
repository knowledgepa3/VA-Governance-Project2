/**
 * ARCHITECTURE VIEW - Cognitive Governance Framework
 * Visual representation of the 7-layer governance model
 */

import React from 'react';
import {
  Brain,
  GitBranch,
  Users,
  ShieldCheck,
  Eye,
  BookOpen,
  Scale,
  Layers,
  ArrowDown,
  CheckCircle2
} from 'lucide-react';

const LAYERS = [
  {
    id: 1,
    name: 'Cognitive Intent Layer',
    subtitle: 'What the system is allowed to think about',
    icon: Brain,
    color: 'from-violet-600 to-violet-700',
    borderColor: 'border-violet-500',
    principle: 'No cognition without declared scope',
    mappings: ['Blueprint Catalog', 'Domain Selection', 'Jurisdiction Boundaries']
  },
  {
    id: 2,
    name: 'Cognitive Workflow Layer',
    subtitle: 'How reasoning is structured',
    icon: GitBranch,
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500',
    principle: 'Reasoning must follow an inspectable path',
    mappings: ['Workflow Orchestration', 'Stage Sequencing', 'Evidence Flow']
  },
  {
    id: 3,
    name: 'Cognitive Workforce Layer',
    subtitle: 'Who/what is allowed to reason',
    icon: Users,
    color: 'from-cyan-600 to-cyan-700',
    borderColor: 'border-cyan-500',
    principle: 'Separation of cognitive duties',
    mappings: ['Agent Population', 'Role Segmentation', 'Human Actors']
  },
  {
    id: 4,
    name: 'Cognitive Control Plane',
    subtitle: 'Who is allowed to authorize cognition',
    icon: ShieldCheck,
    color: 'from-emerald-600 to-emerald-700',
    borderColor: 'border-emerald-500',
    principle: 'Cognition requires authorization, not trust',
    mappings: ['UAC Policy', 'RBAC', 'Session Management']
  },
  {
    id: 5,
    name: 'Cognitive Oversight Layer',
    subtitle: 'How cognition is supervised in real time',
    icon: Eye,
    color: 'from-amber-600 to-amber-700',
    borderColor: 'border-amber-500',
    principle: 'Cognition is observable, not opaque',
    mappings: ['Monitoring Dashboard', 'Live Activity', 'Integrity Scoring']
  },
  {
    id: 6,
    name: 'Cognitive Ledger Layer',
    subtitle: 'How cognition is remembered and audited',
    icon: BookOpen,
    color: 'from-orange-600 to-orange-700',
    borderColor: 'border-orange-500',
    principle: 'No cognitive action without accountability',
    mappings: ['Audit Trail', 'Non-Repudiation', 'Forensic Record']
  },
  {
    id: 7,
    name: 'Advisory Boundary Layer',
    subtitle: 'What cognition may recommend vs decide',
    icon: Scale,
    color: 'from-rose-600 to-rose-700',
    borderColor: 'border-rose-500',
    principle: 'Intelligence may advise — authority decides',
    mappings: ['MAI Classification', 'Human Gates', 'Escalation Policy']
  }
];

const FOUNDATIONAL_CONTROLS = [
  'Zero Trust',
  'RBAC v2',
  'MFA',
  'Policy-as-Code',
  'Audit-First Design',
  'NIST AI RMF',
  'EU AI Act',
  'Evidence-Based Decisioning'
];

// EU AI Act & NIST AI RMF Alignment
const REGULATORY_ALIGNMENT = [
  {
    framework: 'EU AI Act',
    requirements: [
      { article: 'Art. 9', name: 'Risk Management', layer: 1, status: 'aligned' },
      { article: 'Art. 10', name: 'Data Governance', layer: 2, status: 'aligned' },
      { article: 'Art. 11', name: 'Technical Documentation', layer: 6, status: 'aligned' },
      { article: 'Art. 12', name: 'Record-Keeping', layer: 6, status: 'aligned' },
      { article: 'Art. 13', name: 'Transparency', layer: 5, status: 'aligned' },
      { article: 'Art. 14', name: 'Human Oversight', layer: 7, status: 'aligned' },
      { article: 'Art. 15', name: 'Accuracy & Robustness', layer: 3, status: 'aligned' }
    ]
  },
  {
    framework: 'NIST AI RMF',
    requirements: [
      { article: 'GOVERN', name: 'Governance', layer: 4, status: 'aligned' },
      { article: 'MAP', name: 'Context & Risk', layer: 1, status: 'aligned' },
      { article: 'MEASURE', name: 'Analysis & Tracking', layer: 5, status: 'aligned' },
      { article: 'MANAGE', name: 'Response & Recovery', layer: 7, status: 'aligned' }
    ]
  }
];

export const ArchitectureView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-full mb-6">
          <Layers size={20} className="text-white" />
          <span className="text-xs font-black text-white uppercase tracking-widest">Reference Architecture</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
          Cognitive Governance Architecture
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          A governance-first control plane for cognitive systems, enforcing jurisdiction,
          authorization, oversight, and non-repudiation across human and AI actors.
        </p>
      </div>

      {/* 7-Layer Stack */}
      <div className="space-y-3">
        {LAYERS.map((layer, index) => {
          const Icon = layer.icon;
          return (
            <div key={layer.id} className="relative">
              {/* Connection Arrow */}
              {index < LAYERS.length - 1 && (
                <div className="absolute left-1/2 -bottom-3 transform -translate-x-1/2 z-10">
                  <ArrowDown size={16} className="text-slate-300" />
                </div>
              )}

              {/* Layer Card */}
              <div className={`bg-gradient-to-r ${layer.color} rounded-2xl p-5 shadow-lg border-l-4 ${layer.borderColor}`}>
                <div className="flex items-start justify-between gap-6">
                  {/* Left: Layer Info */}
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Icon size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white/60 text-xs font-black">LAYER {layer.id}</span>
                        <h3 className="text-white font-black text-lg">{layer.name}</h3>
                      </div>
                      <p className="text-white/70 text-sm">{layer.subtitle}</p>
                    </div>
                  </div>

                  {/* Right: Principle & Mappings */}
                  <div className="text-right flex-shrink-0">
                    <div className="bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm mb-2">
                      <p className="text-white text-sm font-bold italic">"{layer.principle}"</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {layer.mappings.map((mapping) => (
                        <span key={mapping} className="px-2 py-0.5 bg-white/20 rounded text-[10px] text-white font-medium">
                          {mapping}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulatory Alignment */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        {REGULATORY_ALIGNMENT.map((reg) => (
          <div key={reg.framework} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-1.5 rounded-lg ${reg.framework === 'EU AI Act' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                <Scale size={16} className={reg.framework === 'EU AI Act' ? 'text-blue-600' : 'text-emerald-600'} />
              </div>
              <h4 className="font-black text-slate-900">{reg.framework}</h4>
              <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded uppercase">Aligned</span>
            </div>
            <div className="space-y-2">
              {reg.requirements.map((req) => (
                <div key={req.article} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 w-16">{req.article}</span>
                    <span className="text-xs text-slate-700">{req.name}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">L{req.layer}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Foundational Controls */}
      <div className="bg-slate-900 rounded-2xl p-6 mt-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">
          Foundational Controls (Spanning All Layers)
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {FOUNDATIONAL_CONTROLS.map((control) => (
            <div key={control} className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">{control}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Designed to enable cognitive intelligence without autonomous authority.
        </p>
        <p className="text-[10px] text-slate-300 mt-2">
          ACE Cognitive Governance Platform v1.0
        </p>
      </div>
    </div>
  );
};

export default ArchitectureView;
