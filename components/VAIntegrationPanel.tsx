/**
 * VA Integration Panel Component
 * Provides UI for VA Lighthouse API interactions:
 * - Veteran verification and onboarding
 * - Service history lookup
 * - Claim status tracking
 * - Document submission
 */

import React, { useState, useCallback } from 'react';
import {
  vaApi,
  SANDBOX_TEST_VETERANS,
  VeteranServiceHistory,
  DisabilityRating,
  ClaimStatus,
  maskICN,
  isValidICN,
  formatServiceBranch,
  formatClaimStatus,
  estimateWaitTime
} from '../vaApiService';
import {
  Shield,
  User,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Upload,
  Search,
  History,
  Award,
  Activity,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';

interface VAIntegrationPanelProps {
  onVeteranDataLoaded?: (data: {
    serviceHistory: VeteranServiceHistory[];
    disabilityRating?: DisabilityRating;
    claims?: ClaimStatus[];
  }) => void;
  onError?: (error: string) => void;
}

type TabType = 'lookup' | 'claims' | 'upload';
type DataMode = 'live' | 'sandbox-sim';

// Simulated sandbox data (matches VA sandbox test users)
const SIMULATED_SERVICE_HISTORY: VeteranServiceHistory[] = [
  {
    id: '1',
    type: 'service-history-episodes',
    attributes: {
      firstName: 'Tamara',
      lastName: 'Ellis',
      branchOfService: 'Army',
      startDate: '2005-04-12',
      endDate: '2013-08-20',
      payGrade: 'E-5',
      dischargeStatus: 'Honorable',
      separationReason: 'Completion of Service',
      deployments: [
        { startDate: '2007-03-15', endDate: '2008-03-14', location: 'Iraq (OIF)' },
        { startDate: '2010-09-01', endDate: '2011-08-31', location: 'Afghanistan (OEF)' }
      ]
    }
  }
];

const SIMULATED_DISABILITY_RATING: DisabilityRating = {
  id: '1',
  type: 'disability-ratings',
  attributes: {
    combinedDisabilityRating: 70,
    combinedEffectiveDate: '2014-03-15',
    legalEffectiveDate: '2014-03-15',
    individualRatings: [
      { decision: 'Service Connected', effectiveDate: '2014-03-15', ratingPercentage: 30, diagnosticCode: 5237, diagnosticText: 'Lumbar Spine Strain' },
      { decision: 'Service Connected', effectiveDate: '2014-03-15', ratingPercentage: 30, diagnosticCode: 9411, diagnosticText: 'PTSD' },
      { decision: 'Service Connected', effectiveDate: '2014-03-15', ratingPercentage: 10, diagnosticCode: 6260, diagnosticText: 'Tinnitus' }
    ]
  }
};

const SIMULATED_CLAIMS: ClaimStatus[] = [
  {
    id: '1',
    type: 'claims',
    attributes: {
      claimId: 'CL-2024-001847',
      claimType: 'Compensation',
      claimDate: '2024-01-15',
      phaseChangeDate: '2024-01-28',
      phase: 'GATHERING OF EVIDENCE',
      everPhaseBack: false,
      currentPhaseBack: false,
      status: 'GATHERING OF EVIDENCE',
      decisionLetterSent: false,
      developmentLetterSent: true,
      documentsNeeded: true,
      evidenceWaiverSubmitted5103: false,
      requestedDecision: false,
      claimTypeCode: '020NEW'
    }
  }
];

export const VAIntegrationPanel: React.FC<VAIntegrationPanelProps> = ({
  onVeteranDataLoaded,
  onError
}) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('lookup');
  const [dataMode, setDataMode] = useState<DataMode>('sandbox-sim'); // Default to simulated for demo
  const [icn, setIcn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestData, setShowTestData] = useState(false);

  // Results state
  const [serviceHistory, setServiceHistory] = useState<VeteranServiceHistory[] | null>(null);
  const [disabilityRating, setDisabilityRating] = useState<DisabilityRating | null>(null);
  const [claims, setClaims] = useState<ClaimStatus[] | null>(null);

  // API Configuration check
  const isConfigured = vaApi.isConfigured();
  const environment = vaApi.getEnvironment();

  // Handle ICN lookup
  const handleLookup = useCallback(async () => {
    if (!icn.trim()) {
      setError('Please enter a veteran ICN');
      return;
    }

    if (!isValidICN(icn.trim())) {
      setError('Invalid ICN format. Expected: 10 digits + V + 6 digits (e.g., 1012667145V762142)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setServiceHistory(null);
    setDisabilityRating(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      if (dataMode === 'sandbox-sim') {
        // Use simulated data (OAuth not required)
        setServiceHistory(SIMULATED_SERVICE_HISTORY);
        setDisabilityRating(SIMULATED_DISABILITY_RATING);

        // Notify parent
        if (onVeteranDataLoaded) {
          onVeteranDataLoaded({
            serviceHistory: SIMULATED_SERVICE_HISTORY,
            disabilityRating: SIMULATED_DISABILITY_RATING
          });
        }
      } else {
        // Live API call (requires OAuth - will likely fail without proper auth)
        const historyResponse = await vaApi.getServiceHistory(icn.trim());
        if (!historyResponse.success) {
          throw new Error(historyResponse.error?.message || 'Failed to fetch service history. Note: Live API requires OAuth2 authentication.');
        }
        setServiceHistory(historyResponse.data || []);

        const ratingResponse = await vaApi.getDisabilityRating(icn.trim());
        if (ratingResponse.success && ratingResponse.data) {
          setDisabilityRating(ratingResponse.data);
        }

        if (onVeteranDataLoaded) {
          onVeteranDataLoaded({
            serviceHistory: historyResponse.data || [],
            disabilityRating: ratingResponse.data || undefined
          });
        }
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lookup failed';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [icn, dataMode, onVeteranDataLoaded, onError]);

  // Handle claims lookup
  const handleClaimsLookup = useCallback(async () => {
    if (!icn.trim() || !isValidICN(icn.trim())) {
      setError('Please enter a valid ICN first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setClaims(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      if (dataMode === 'sandbox-sim') {
        // Use simulated data
        setClaims(SIMULATED_CLAIMS);

        if (onVeteranDataLoaded) {
          onVeteranDataLoaded({
            serviceHistory: serviceHistory || [],
            disabilityRating: disabilityRating || undefined,
            claims: SIMULATED_CLAIMS
          });
        }
      } else {
        // Live API call
        const response = await vaApi.getClaims(icn.trim());
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to fetch claims. Note: Live API requires OAuth2 authentication.');
        }
        setClaims(response.data || []);

        if (onVeteranDataLoaded) {
          onVeteranDataLoaded({
            serviceHistory: serviceHistory || [],
            disabilityRating: disabilityRating || undefined,
            claims: response.data || []
          });
        }
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Claims lookup failed';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [icn, dataMode, serviceHistory, disabilityRating, onVeteranDataLoaded, onError]);

  // Use test veteran data
  const useTestVeteran = (veteran: typeof SANDBOX_TEST_VETERANS.VETERAN_1) => {
    setIcn(veteran.icn);
    setShowTestData(false);
  };

  // Render not configured state
  if (!isConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="text-amber-500 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-amber-800 mb-2">VA API Not Configured</h3>
            <p className="text-sm text-amber-700 mb-3">
              Add your VA Lighthouse API key to the <code className="bg-amber-100 px-1 rounded">.env</code> file:
            </p>
            <pre className="bg-amber-100 p-3 rounded-lg text-xs text-amber-800 overflow-x-auto">
              VITE_VA_API_KEY=your-api-key-here
            </pre>
            <p className="text-xs text-amber-600 mt-3">
              Get your sandbox key at:{' '}
              <a
                href="https://developer.va.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-800"
              >
                developer.va.gov
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={16} className="shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-xs truncate">VA Lighthouse API</h3>
              <p className="text-blue-200 text-[9px] truncate">
                {dataMode === 'sandbox-sim' ? 'Demo Mode' : 'Live API'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Data Mode Toggle */}
            <div className="flex bg-blue-800/50 rounded-lg p-0.5">
              <button
                onClick={() => setDataMode('sandbox-sim')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                  dataMode === 'sandbox-sim'
                    ? 'bg-white text-blue-900'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => setDataMode('live')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                  dataMode === 'live'
                    ? 'bg-white text-blue-900'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                Live
              </button>
            </div>
            <a
              href="https://developer.va.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-200 hover:text-white transition-colors"
              title="VA Developer Portal"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Horizontal Layout */}
      <div className="flex flex-col sm:flex-row">
        {/* Tabs - Horizontal on mobile, Vertical on desktop */}
        <div className="flex sm:flex-col border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50 sm:w-28 shrink-0">
          {[
            { id: 'lookup', label: 'Lookup', icon: Search },
            { id: 'claims', label: 'Claims', icon: FileText },
            { id: 'upload', label: 'Upload', icon: Upload }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold transition-colors sm:border-b border-r sm:border-r-0 border-slate-200 last:border-0 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 sm:border-l-2 sm:border-l-blue-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - Fills remaining space */}
        <div className="flex-1 p-3 min-h-[180px]">
        {/* ICN Input */}
        <div className="mb-3">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Veteran ICN
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex-1 relative">
              <input
                type="text"
                value={icn}
                onChange={(e) => setIcn(e.target.value)}
                placeholder="1012667145V762142"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
              />
              {icn && (
                <button
                  onClick={() => setIcn('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => setShowTestData(!showTestData)}
              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
            >
              Test Data {showTestData ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>

          {/* Test Data Dropdown */}
          {showTestData && (
            <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[9px] text-slate-500 mb-1.5 flex items-center gap-1">
                <Info size={10} /> Test veterans
              </p>
              <div className="space-y-1">
                {Object.entries(SANDBOX_TEST_VETERANS).map(([key, vet]) => (
                  <button
                    key={key}
                    onClick={() => useTestVeteran(vet)}
                    className="w-full text-left px-2 py-1.5 bg-white hover:bg-blue-50 rounded text-[10px] border border-slate-200 transition-colors"
                  >
                    <span className="font-medium text-slate-700">{vet.firstName} {vet.lastName}</span>
                    <span className="text-slate-400 ml-1 font-mono text-[9px]">{maskICN(vet.icn)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-700">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'lookup' && (
          <div>
            <button
              onClick={handleLookup}
              disabled={isLoading || !icn.trim()}
              className="w-full mb-3 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              {isLoading ? 'Looking up...' : 'Lookup Veteran'}
            </button>

            {/* Service History Results */}
            {serviceHistory && serviceHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <History size={12} className="text-blue-600" />
                  Service History
                </h4>
                {serviceHistory.map((record, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="font-bold text-slate-800 text-xs">
                          {record.attributes.firstName} {record.attributes.lastName}
                        </p>
                        <p className="text-[10px] text-blue-600 font-medium">
                          {formatServiceBranch(record.attributes.branchOfService)}
                        </p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        record.attributes.dischargeStatus?.toLowerCase() === 'honorable'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {record.attributes.dischargeStatus || 'N/A'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div>
                        <p className="text-slate-500 text-[9px]">Service Period</p>
                        <p className="text-slate-700">{record.attributes.startDate} - {record.attributes.endDate}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[9px]">Pay Grade</p>
                        <p className="text-slate-700">{record.attributes.payGrade || 'N/A'}</p>
                      </div>
                    </div>
                    {record.attributes.deployments && record.attributes.deployments.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                        <p className="text-[9px] text-slate-500 mb-0.5">Deployments</p>
                        {record.attributes.deployments.map((dep, depIdx) => (
                          <p key={depIdx} className="text-[10px] text-slate-700">
                            {dep.location}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Disability Rating Results */}
            {disabilityRating && (
              <div className="mt-3">
                <h4 className="font-bold text-slate-700 flex items-center gap-1.5 mb-2 text-xs">
                  <Award size={12} className="text-purple-600" />
                  Disability Rating
                </h4>
                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-600 text-[10px]">Combined Rating</span>
                    <span className="text-xl font-black text-purple-700">
                      {disabilityRating.attributes.combinedDisabilityRating}%
                    </span>
                  </div>
                  <p className="text-[9px] text-purple-600">
                    Eff: {disabilityRating.attributes.combinedEffectiveDate}
                  </p>
                  {disabilityRating.attributes.individualRatings && (
                    <div className="mt-2 pt-2 border-t border-purple-200 space-y-1">
                      {disabilityRating.attributes.individualRatings.map((rating, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-700 truncate pr-2">{rating.diagnosticText}</span>
                          <span className="font-bold text-purple-700 shrink-0">{rating.ratingPercentage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No results */}
            {serviceHistory && serviceHistory.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">No service history found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'claims' && (
          <div>
            <button
              onClick={handleClaimsLookup}
              disabled={isLoading || !icn.trim()}
              className="w-full mb-3 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {isLoading ? 'Fetching...' : 'Get Claims Status'}
            </button>

            {/* Claims Results */}
            {claims && claims.length > 0 && (
              <div className="space-y-2">
                {claims.map((claim, idx) => {
                  const status = formatClaimStatus(claim.attributes.status);
                  return (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{claim.attributes.claimType}</p>
                          <p className="text-[9px] text-slate-500">ID: {claim.attributes.claimId}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold bg-${status.color}-100 text-${status.color}-700`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] mt-2">
                        <div>
                          <p className="text-slate-500 text-[9px]">Claim Date</p>
                          <p className="text-slate-700">{claim.attributes.claimDate}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[9px]">Est. Wait</p>
                          <p className="text-slate-700">{estimateWaitTime(claim.attributes.status)}</p>
                        </div>
                      </div>
                      {claim.attributes.documentsNeeded && (
                        <div className="mt-1.5 p-1.5 bg-amber-50 rounded flex items-center gap-1 text-[10px] text-amber-700">
                          <AlertCircle size={10} />
                          Docs needed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {claims && claims.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">No claims found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="text-center py-4">
            <Upload size={24} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-600 font-medium text-xs mb-1">Document Upload</p>
            <p className="text-[10px] text-slate-500 mb-2">
              Upload to VBMS via Benefits Intake API
            </p>
            <div className="p-2 bg-amber-50 rounded text-[9px] text-amber-700 flex items-center gap-1.5">
              <AlertCircle size={10} />
              Complete workflow first
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default VAIntegrationPanel;
