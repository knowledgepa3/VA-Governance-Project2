/**
 * Security Advisory Component
 *
 * Displays important security warnings for prototype/development use.
 * This is a critical component for production awareness.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Info,
  Lock,
  Eye,
  Server,
  Database,
  Key,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface SecurityAdvisoryProps {
  dismissible?: boolean;
  showOnce?: boolean;
  variant?: 'banner' | 'modal' | 'inline';
}

// Security findings from the audit
const SECURITY_FINDINGS = {
  critical: [
    {
      id: 'api-key-browser',
      title: 'API Keys in Browser',
      description: 'Anthropic API keys are exposed in client-side JavaScript. In production, use a server-side proxy.',
      mitigation: 'Deploy server/claudeProxy.ts for production use'
    },
    {
      id: 'phi-localstorage',
      title: 'PHI in localStorage',
      description: 'Protected Health Information is stored unencrypted in browser localStorage.',
      mitigation: 'For production, use encrypted storage or server-side session management'
    }
  ],
  high: [
    {
      id: 'client-only',
      title: 'Client-Side Architecture',
      description: 'All processing happens in the browser. No server-side validation or audit logging.',
      mitigation: 'Deploy with server backend for production HIPAA compliance'
    },
    {
      id: 'no-auth',
      title: 'No Authentication',
      description: 'No user authentication or role-based access control implemented.',
      mitigation: 'Implement auth provider (OAuth, SAML) before production deployment'
    }
  ],
  info: [
    {
      id: 'demo-mode',
      title: 'Demo Mode Available',
      description: 'System can run in demo mode with mock data for testing and demonstrations.',
      status: 'Feature - not a vulnerability'
    },
    {
      id: 'cost-governor',
      title: 'Cost Controls Active',
      description: 'Cost governor tracks and limits API spending to prevent runaway costs.',
      status: 'Protection enabled'
    }
  ]
};

export function SecurityAdvisory({
  dismissible = true,
  showOnce = true,
  variant = 'banner'
}: SecurityAdvisoryProps) {
  const [dismissed, setDismissed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Check if already acknowledged this session
  useEffect(() => {
    if (showOnce) {
      const acked = sessionStorage.getItem('ace_security_advisory_ack');
      if (acked === 'true') {
        setDismissed(true);
      }
    }
  }, [showOnce]);

  const handleDismiss = () => {
    if (dismissible) {
      setDismissed(true);
      if (showOnce) {
        sessionStorage.setItem('ace_security_advisory_ack', 'true');
      }
    }
  };

  const handleAcknowledge = () => {
    setAcknowledged(true);
    setTimeout(() => {
      handleDismiss();
    }, 500);
  };

  if (dismissed) return null;

  // Banner variant - slim header warning
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm font-medium">
              Development/Prototype Environment - Not for production use with real PII/PHI
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs underline hover:no-underline ml-2"
            >
              {showDetails ? 'Hide Details' : 'View Security Notes'}
            </button>
          </div>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showDetails && (
          <div className="max-w-7xl mx-auto mt-2 p-3 bg-white/10 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Before Production Use:
                </h4>
                <ul className="space-y-1 text-xs">
                  <li>- Deploy server-side API proxy</li>
                  <li>- Implement authentication</li>
                  <li>- Enable encrypted storage</li>
                  <li>- Configure audit logging</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Current Protections:
                </h4>
                <ul className="space-y-1 text-xs">
                  <li>- Cost governor active</li>
                  <li>- Stage A/B/C enforcement</li>
                  <li>- Token ceiling hard blocks</li>
                  <li>- Behavioral integrity checks</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modal variant - full acknowledgment required
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-full">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Security Advisory</h2>
                <p className="text-white/80 text-sm">Development/Prototype Environment</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                Critical Notices
              </h3>
              <ul className="space-y-2">
                {SECURITY_FINDINGS.critical.map(finding => (
                  <li key={finding.id} className="text-sm text-red-700">
                    <span className="font-medium">{finding.title}:</span> {finding.description}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <Info className="w-5 h-5" />
                Before Production Deployment
              </h3>
              <ul className="space-y-2">
                {SECURITY_FINDINGS.high.map(finding => (
                  <li key={finding.id} className="text-sm text-amber-700">
                    <span className="font-medium">{finding.title}:</span> {finding.mitigation}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                Active Protections
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Cost governor with hard limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Stage A/B/C enforcement</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Token ceiling hard blocks</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Behavioral integrity checks</span>
                </div>
              </div>
            </div>

            {/* Acknowledgment checkbox */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                I understand this is a development/prototype environment and should not be used
                with real Protected Health Information (PHI) or Personally Identifiable Information (PII)
                without implementing the recommended production security controls.
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={handleAcknowledge}
              disabled={!acknowledged}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                acknowledged
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Continue to Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant - embedded warning card
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800">Development Environment</h3>
          <p className="text-sm text-amber-700 mt-1">
            This is a prototype/development environment. Do not use with real PII/PHI
            without implementing production security controls.
          </p>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-amber-600 hover:text-amber-800 mt-2 underline"
          >
            {showDetails ? 'Hide security details' : 'View security details'}
          </button>

          {showDetails && (
            <div className="mt-3 space-y-2 text-sm">
              <div className="p-2 bg-red-100 rounded text-red-700">
                <span className="font-medium">Critical:</span> API keys in browser, PHI in localStorage
              </div>
              <div className="p-2 bg-amber-100 rounded text-amber-700">
                <span className="font-medium">Required for production:</span> Server-side proxy, authentication, encrypted storage
              </div>
            </div>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Quick security status indicator for headers/footers
 */
export function SecurityStatusIndicator() {
  const [isDevMode] = useState(true); // In production, detect actual mode

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
      isDevMode
        ? 'bg-amber-100 text-amber-700 border border-amber-200'
        : 'bg-green-100 text-green-700 border border-green-200'
    }`}>
      {isDevMode ? (
        <>
          <ShieldAlert className="w-3 h-3" />
          DEV/PROTOTYPE
        </>
      ) : (
        <>
          <Lock className="w-3 h-3" />
          PRODUCTION
        </>
      )}
    </div>
  );
}

export default SecurityAdvisory;
