/**
 * Demo Canon Selector Component
 * Allows users to select and run frozen demo scenarios
 */

import React, { useState } from 'react';
import {
  DEMO_CANON,
  DemoScenario,
  getScenarioSummary,
  loadDemoArtifacts,
  getScenariosForWorkforce
} from '../demoCanon';
import { WorkforceType } from '../types';
import {
  Play,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Shield
} from 'lucide-react';

interface DemoCanonSelectorProps {
  currentWorkforce: WorkforceType;
  onSelectScenario: (scenario: DemoScenario, artifacts: any[], enabledFailures: Record<string, boolean>) => void;
  onClose: () => void;
}

export const DemoCanonSelector: React.FC<DemoCanonSelectorProps> = ({
  currentWorkforce,
  onSelectScenario,
  onClose
}) => {
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [showAllWorkforces, setShowAllWorkforces] = useState(false);
  const [enabledFailures, setEnabledFailures] = useState<Record<string, boolean>>({});

  const scenarios = showAllWorkforces
    ? DEMO_CANON
    : getScenariosForWorkforce(currentWorkforce);

  // Toggle failure injection
  const toggleFailure = (failureId: string) => {
    setEnabledFailures(prev => ({
      ...prev,
      [failureId]: !prev[failureId]
    }));
  };

  const getDifficultyColor = (difficulty: DemoScenario['difficulty']) => {
    switch (difficulty) {
      case 'SIMPLE': return 'bg-green-100 text-green-800';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLEX': return 'bg-red-100 text-red-800';
    }
  };

  const getWorkforceLabel = (workforce: WorkforceType) => {
    switch (workforce) {
      case WorkforceType.VA_CLAIMS: return 'VA Claims';
      case WorkforceType.FINANCIAL_AUDIT: return 'Financial Audit';
      case WorkforceType.CYBER_IR: return 'Cyber IR';
      case WorkforceType.BD_CAPTURE: return 'BD Capture';
      case WorkforceType.GRANT_WRITING: return 'Grant Writing';
    }
  };

  const handleRunScenario = () => {
    if (selectedScenario) {
      const artifacts = loadDemoArtifacts(selectedScenario);
      onSelectScenario(selectedScenario, artifacts, enabledFailures);
    }
  };

  // Reset enabled failures when scenario changes
  const handleScenarioSelect = (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setEnabledFailures({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Target size={28} />
                Demo Canon
              </h2>
              <p className="text-blue-100 mt-1">
                Frozen scenarios for testing, demos, and validation
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Toggle */}
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showAllWorkforces}
                onChange={(e) => setShowAllWorkforces(e.target.checked)}
                className="rounded"
              />
              Show all workforces
            </label>
            <span className="text-blue-200 text-sm">
              {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} available
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => handleScenarioSelect(scenario)}
                className={`
                  border-2 rounded-xl p-4 cursor-pointer transition-all
                  ${selectedScenario?.id === scenario.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">
                      {scenario.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getDifficultyColor(scenario.difficulty)}`}>
                        {scenario.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {getWorkforceLabel(scenario.workforce)}
                      </span>
                    </div>
                  </div>
                  {selectedScenario?.id === scenario.id && (
                    <CheckCircle className="text-blue-500" size={20} />
                  )}
                </div>

                <p className="text-slate-600 text-xs leading-relaxed mb-3">
                  {scenario.description}
                </p>

                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {scenario.expectedDuration}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {scenario.inputArtifacts.length} files
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield size={12} />
                    {scenario.validationChecks.length} checks
                  </span>
                </div>
              </div>
            ))}
          </div>

          {scenarios.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Target size={48} className="mx-auto mb-4 opacity-30" />
              <p>No demo scenarios available for this workforce.</p>
              <button
                onClick={() => setShowAllWorkforces(true)}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                Show all workforces
              </button>
            </div>
          )}
        </div>

        {/* Selected Scenario Details */}
        {selectedScenario && (
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-2">
                  {selectedScenario.name}
                </h4>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Key Demonstrations:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedScenario.highlights.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-600">Input Artifacts</p>
                    <ul className="mt-1 space-y-0.5">
                      {selectedScenario.inputArtifacts.slice(0, 3).map((a, i) => (
                        <li key={i} className="text-slate-500 truncate">{a.name}</li>
                      ))}
                      {selectedScenario.inputArtifacts.length > 3 && (
                        <li className="text-slate-400">+{selectedScenario.inputArtifacts.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600 flex items-center gap-2">
                      Failure Injections
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-normal">
                        {Object.values(enabledFailures).filter(Boolean).length} active
                      </span>
                    </p>
                    <ul className="mt-1 space-y-1">
                      {selectedScenario.failureInjectionPoints.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFailure(f.type)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
                              enabledFailures[f.type]
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-amber-200'
                            }`}
                          >
                            <AlertTriangle size={10} className={enabledFailures[f.type] ? 'text-amber-600' : 'text-slate-400'} />
                            {f.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">Validation Checks</p>
                    <ul className="mt-1 space-y-0.5">
                      {selectedScenario.validationChecks.slice(0, 3).map((v, i) => (
                        <li key={i} className="text-slate-500 truncate flex items-center gap-1">
                          <CheckCircle size={10} className="text-green-500" />
                          {v.checkType}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRunScenario}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Play size={18} fill="currentColor" />
                  Run Scenario
                </button>
                <button
                  onClick={() => setSelectedScenario(null)}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            Demo Canon v1.0 • {DEMO_CANON.length} total scenarios
          </span>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); alert(getScenarioSummary(selectedScenario || DEMO_CANON[0])); }}
            className="text-blue-600 hover:underline"
          >
            View scenario details
          </a>
        </div>
      </div>
    </div>
  );
};

export default DemoCanonSelector;
