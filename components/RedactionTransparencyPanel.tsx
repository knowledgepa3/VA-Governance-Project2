/**
 * Redaction Transparency Panel - SAFE Rendering
 *
 * CRITICAL SECURITY: This component NEVER displays raw PII/PHI values.
 * It only shows:
 * - Category counts (e.g., "3 SSNs detected")
 * - Redaction patterns (e.g., "***-**-****")
 * - Field types (e.g., "medical_diagnosis")
 * - Positions in document (page/line numbers)
 *
 * The actual sensitive values remain server-side only.
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  FileText,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';

/**
 * Safe redaction result - NO raw PII, only metadata
 */
export interface SafeRedactionResult {
  // Summary info
  documentId: string;
  documentName: string;
  scanTimestamp: string;
  correlationId: string;

  // Detection summary
  detected: boolean;
  totalCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Category counts (no values, just counts)
  categories: {
    names: number;
    ssn: number;
    dates: number;
    addresses: number;
    phone: number;
    email: number;
    medical: number;
    financial: number;
    other: number;
  };

  // Safe position metadata (where redactions occurred, not what was redacted)
  redactionPositions: Array<{
    category: string;
    fieldType: string;
    pageNumber?: number;
    lineNumber?: number;
    characterRange?: { start: number; end: number };
    redactionPattern: string; // e.g., "***-**-****" for SSN
  }>;

  // Audit info
  redactorVersion: string;
  policyVersion: string;
  signatureHash: string;
}

interface RedactionTransparencyPanelProps {
  result: SafeRedactionResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const CATEGORY_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  description: string;
  pattern: string;
  colorClass: string;
}> = {
  names: {
    icon: User,
    label: 'Names',
    description: 'Personal names',
    pattern: '[NAME]',
    colorClass: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  ssn: {
    icon: CreditCard,
    label: 'SSN',
    description: 'Social Security Numbers',
    pattern: '***-**-****',
    colorClass: 'text-red-600 bg-red-50 border-red-200'
  },
  dates: {
    icon: Calendar,
    label: 'Dates',
    description: 'Birth/service/medical dates',
    pattern: '[DATE]',
    colorClass: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  addresses: {
    icon: MapPin,
    label: 'Addresses',
    description: 'Physical addresses',
    pattern: '[ADDRESS]',
    colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  phone: {
    icon: Phone,
    label: 'Phone',
    description: 'Phone/fax numbers',
    pattern: '(***) ***-****',
    colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-200'
  },
  email: {
    icon: Mail,
    label: 'Email',
    description: 'Email addresses',
    pattern: '****@****.***',
    colorClass: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  medical: {
    icon: Heart,
    label: 'Medical (PHI)',
    description: 'Diagnoses, medications',
    pattern: '[MEDICAL]',
    colorClass: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  financial: {
    icon: DollarSign,
    label: 'Financial',
    description: 'Account/claim numbers',
    pattern: '[FINANCIAL]',
    colorClass: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  other: {
    icon: AlertCircle,
    label: 'Other',
    description: 'Other sensitive data',
    pattern: '[REDACTED]',
    colorClass: 'text-slate-600 bg-slate-50 border-slate-200'
  }
};

const RISK_CONFIG = {
  LOW: { colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-300', label: 'Low Risk' },
  MEDIUM: { colorClass: 'text-amber-700 bg-amber-50 border-amber-300', label: 'Medium Risk' },
  HIGH: { colorClass: 'text-orange-700 bg-orange-50 border-orange-300', label: 'High Risk' },
  CRITICAL: { colorClass: 'text-red-700 bg-red-50 border-red-300', label: 'Critical Risk' }
};

export const RedactionTransparencyPanel: React.FC<RedactionTransparencyPanelProps> = ({
  result,
  isLoading = false,
  onRefresh
}) => {
  const [showPositions, setShowPositions] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600" />
          <span className="text-slate-600 font-medium">Scanning for sensitive data...</span>
        </div>
      </div>
    );
  }

  // No result state
  if (!result) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <Shield size={24} />
          <span>Upload documents to scan for PII/PHI</span>
        </div>
      </div>
    );
  }

  const categoriesWithData = Object.entries(result.categories)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${result.detected ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${result.detected ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {result.detected ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Redaction Transparency Report
              </h3>
              <p className={`text-sm font-medium ${result.detected ? 'text-amber-700' : 'text-emerald-700'}`}>
                {result.detected
                  ? `${result.totalCount} sensitive item${result.totalCount !== 1 ? 's' : ''} detected and redacted`
                  : 'No sensitive information detected'}
              </p>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className={`px-4 py-2 rounded-xl border-2 ${RISK_CONFIG[result.riskLevel].colorClass}`}>
            <span className="text-xs font-black uppercase tracking-widest">
              {RISK_CONFIG[result.riskLevel].label}
            </span>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-slate-400" />
          <span className="text-sm text-slate-600 font-medium truncate max-w-xs">
            {result.documentName}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {result.correlationId.slice(0, 16)}...
        </span>
      </div>

      {/* Category Summary Grid */}
      {result.detected && (
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = result.categories[key as keyof typeof result.categories] || 0;
              const Icon = config.icon;
              const hasData = count > 0;

              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    hasData ? config.colorClass : 'text-slate-300 bg-slate-50 border-slate-100'
                  }`}
                >
                  <Icon size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{config.label}</span>
                      <span className={`text-lg font-black ${hasData ? '' : 'text-slate-300'}`}>
                        {count}
                      </span>
                    </div>
                    {hasData && (
                      <div className="text-xs opacity-75 font-mono truncate">
                        {config.pattern}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Redaction Positions (safe metadata only) */}
      {result.detected && result.redactionPositions.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-100">
          <button
            onClick={() => setShowPositions(!showPositions)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">
                Redaction Locations
              </span>
              <span className="text-xs text-slate-400">
                ({result.redactionPositions.length} positions)
              </span>
            </div>
            {showPositions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showPositions && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {result.redactionPositions.map((pos, idx) => {
                const config = CATEGORY_CONFIG[pos.category] || CATEGORY_CONFIG.other;
                const Icon = config.icon;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className={`p-1.5 rounded-lg ${config.colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {config.label}
                        </span>
                        {pos.fieldType && (
                          <span className="text-xs text-slate-400">
                            ({pos.fieldType})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {pos.pageNumber && (
                          <span className="text-xs text-slate-500">
                            Page {pos.pageNumber}
                          </span>
                        )}
                        {pos.lineNumber && (
                          <span className="text-xs text-slate-500">
                            Line {pos.lineNumber}
                          </span>
                        )}
                        <code className="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded">
                          {pos.redactionPattern}
                        </code>
                      </div>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-blue-800 mb-1">
              Secure Transparency Mode
            </h4>
            <p className="text-xs text-blue-700">
              This panel shows redaction metadata only. Actual sensitive values are never
              transmitted to the browser and remain protected on the server.
            </p>
          </div>
        </div>
      </div>

      {/* Audit Footer */}
      <div className="px-6 py-3 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield size={14} />
            <span className="text-xs font-medium">
              Gateway Agent v{result.redactorVersion}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Policy v{result.policyVersion}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-mono">
            sig:{result.signatureHash.slice(0, 8)}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Re-scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact inline status for embedding in other components
 */
export const RedactionStatusBadge: React.FC<{
  result: SafeRedactionResult | null;
  compact?: boolean;
}> = ({ result, compact = false }) => {
  if (!result) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Shield size={14} />
        <span className="text-xs">Not scanned</span>
      </div>
    );
  }

  if (!result.detected) {
    return (
      <div className="flex items-center gap-2 text-emerald-600">
        <ShieldCheck size={14} />
        <span className="text-xs font-medium">Clean</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${RISK_CONFIG[result.riskLevel].colorClass.split(' ')[0]}`}>
      <ShieldAlert size={14} />
      <span className="text-xs font-medium">
        {compact ? result.totalCount : `${result.totalCount} redacted`}
      </span>
    </div>
  );
};

export default RedactionTransparencyPanel;
