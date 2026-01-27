/**
 * PII/PHI Transparency Panel Component
 *
 * Displays a detailed breakdown of detected PII/PHI in uploaded documents.
 * Provides full transparency into what the Gateway agent is detecting and redacting.
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Heart,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  FileWarning
} from 'lucide-react';
import type { PIIDetectionResult } from '../services/claudeServiceSecure';

interface PIITransparencyPanelProps {
  detectionResult: PIIDetectionResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const CATEGORY_CONFIG = {
  names: {
    icon: User,
    label: 'Names',
    description: 'Full or partial names detected',
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  ssn: {
    icon: CreditCard,
    label: 'SSN',
    description: 'Social Security Numbers',
    color: 'text-red-600 bg-red-50 border-red-200'
  },
  dates: {
    icon: Calendar,
    label: 'Dates',
    description: 'Birth dates, service dates, medical dates',
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  addresses: {
    icon: MapPin,
    label: 'Addresses',
    description: 'Physical addresses',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  phone: {
    icon: Phone,
    label: 'Phone Numbers',
    description: 'Phone and fax numbers',
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200'
  },
  email: {
    icon: Mail,
    label: 'Email Addresses',
    description: 'Email addresses',
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  medical: {
    icon: Heart,
    label: 'Medical (PHI)',
    description: 'Diagnoses, medications, conditions',
    color: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  financial: {
    icon: DollarSign,
    label: 'Financial',
    description: 'Account numbers, claim numbers',
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  other: {
    icon: AlertCircle,
    label: 'Other PII',
    description: 'Other sensitive information',
    color: 'text-slate-600 bg-slate-50 border-slate-200'
  }
};

const RISK_COLORS = {
  LOW: 'text-emerald-600 bg-emerald-50 border-emerald-300',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-300',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-300',
  CRITICAL: 'text-red-600 bg-red-50 border-red-300'
};

export const PIITransparencyPanel: React.FC<PIITransparencyPanelProps> = ({
  detectionResult,
  isLoading = false,
  onRefresh
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showMasked, setShowMasked] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleMasked = (key: string) => {
    const newShowMasked = new Set(showMasked);
    if (newShowMasked.has(key)) {
      newShowMasked.delete(key);
    } else {
      newShowMasked.add(key);
    }
    setShowMasked(newShowMasked);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600" />
          <span className="text-slate-600 font-medium">Analyzing for PII/PHI...</span>
        </div>
      </div>
    );
  }

  if (!detectionResult) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <Shield size={24} />
          <span>Upload documents to analyze for PII/PHI</span>
        </div>
      </div>
    );
  }

  const categoriesWithData = Object.entries(detectionResult.categories)
    .filter(([_, items]) => items.length > 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${detectionResult.detected ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${detectionResult.detected ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {detectionResult.detected ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                PII/PHI Transparency Report
              </h3>
              <p className={`text-sm font-medium ${detectionResult.detected ? 'text-amber-700' : 'text-emerald-700'}`}>
                {detectionResult.detected
                  ? `${detectionResult.total_count} sensitive item${detectionResult.total_count !== 1 ? 's' : ''} detected and will be redacted`
                  : 'No sensitive information detected'}
              </p>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className={`px-4 py-2 rounded-xl border-2 ${RISK_COLORS[detectionResult.risk_level]}`}>
            <span className="text-xs font-black uppercase tracking-widest">
              {detectionResult.risk_level} RISK
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {detectionResult.detected && (
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = detectionResult.categories[key as keyof typeof detectionResult.categories]?.length || 0;
              const Icon = config.icon;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${count > 0 ? config.color : 'text-slate-300 bg-slate-50 border-slate-100'}`}
                >
                  <Icon size={16} />
                  <span className="text-xs font-bold">{count}</span>
                  <span className="text-xs truncate">{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {categoriesWithData.length > 0 && (
        <div className="divide-y divide-slate-100">
          {categoriesWithData.map(([category, items]) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
            const Icon = config.icon;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border-l-4 border-l-transparent hover:border-l-blue-400 transition-all">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-800">{config.label}</span>
                      <span className="text-sm text-slate-400 ml-2">
                        ({items.length} found)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{config.description}</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Items List */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {items.map((item, idx) => {
                        const itemKey = `${category}-${idx}`;
                        const isVisible = showMasked.has(itemKey);

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Lock size={14} className="text-slate-300 shrink-0" />
                              <code className="text-sm font-mono text-slate-600 truncate">
                                {isVisible ? item : item.replace(/[a-zA-Z0-9]/g, '*')}
                              </code>
                            </div>
                            <button
                              onClick={() => toggleMasked(itemKey)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              title={isVisible ? 'Hide value' : 'Show masked value'}
                            >
                              {isVisible ? (
                                <EyeOff size={14} className="text-slate-400" />
                              ) : (
                                <Eye size={14} className="text-slate-400" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Redaction Preview */}
      {detectionResult.detected && detectionResult.redacted_preview && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-start gap-3">
            <FileWarning size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-1">Redaction Preview</h4>
              <p className="text-sm text-slate-500 font-mono bg-white p-3 rounded-lg border border-slate-100">
                {detectionResult.redacted_preview}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Shield size={14} />
          <span className="text-xs font-medium">
            Gateway Agent PII/PHI Transparency Mode
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Re-analyze
          </button>
        )}
      </div>
    </div>
  );
};

export default PIITransparencyPanel;
