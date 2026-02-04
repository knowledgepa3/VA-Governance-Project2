/**
 * VA Lighthouse API Service
 * Integration with VA.gov APIs for veteran verification, claims, and benefits
 *
 * API Documentation: https://developer.va.gov/
 *
 * SECURITY NOTE: In production, API keys should be stored in environment variables
 * and never committed to source control. This sandbox key is for development only.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

interface VAApiConfig {
  environment: 'sandbox' | 'production';
  apiKey: string;
  baseUrl: string;
}

// Detect if we're in development mode (Vite dev server)
// @ts-ignore - Vite environment variables
const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

// Sandbox configuration
// In development, use the Vite proxy to bypass CORS
// In production, you'd use a backend server to proxy requests
// @ts-ignore - Vite environment variables
const VA_API_CONFIG: VAApiConfig = {
  environment: 'sandbox',
  apiKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_VA_API_KEY) || '',
  // Use proxy path in development, direct URL otherwise (for server-side usage)
  baseUrl: isDev ? '/va-api' : 'https://sandbox-api.va.gov'
};

// Production URLs (for reference - requires different auth)
const VA_PRODUCTION_BASE_URL = 'https://api.va.gov';

// =============================================================================
// TYPES - Veteran Verification API
// =============================================================================

export interface VeteranServiceHistory {
  id: string;
  type: 'service-history-episodes';
  attributes: {
    firstName: string;
    lastName: string;
    branchOfService: string;
    startDate: string;
    endDate: string;
    payGrade: string;
    dischargeStatus: string;
    separationReason: string;
    deployments?: Deployment[];
  };
}

export interface Deployment {
  startDate: string;
  endDate: string;
  location: string;
}

export interface VeteranStatus {
  id: string;
  type: 'veteran-status';
  attributes: {
    veteranStatus: 'confirmed' | 'not confirmed';
  };
}

export interface DisabilityRating {
  id: string;
  type: 'disability-ratings';
  attributes: {
    combinedDisabilityRating: number;
    combinedEffectiveDate: string;
    legalEffectiveDate: string;
    individualRatings: IndividualRating[];
  };
}

export interface IndividualRating {
  decision: string;
  effectiveDate: string;
  ratingPercentage: number;
  diagnosticCode: number;
  diagnosticText: string;
  staticIndication?: boolean;
}

// =============================================================================
// TYPES - Benefits Claims API
// =============================================================================

export interface ClaimStatus {
  id: string;
  type: 'claims';
  attributes: {
    claimId: string;
    claimType: string;
    claimDate: string;
    phaseChangeDate: string;
    phase: string;
    everPhaseBack: boolean;
    currentPhaseBack: boolean;
    status: 'PENDING' | 'UNDER REVIEW' | 'GATHERING OF EVIDENCE' | 'REVIEW OF EVIDENCE' | 'PREPARATION FOR DECISION' | 'PENDING DECISION APPROVAL' | 'PREPARATION FOR NOTIFICATION' | 'COMPLETE';
    decisionLetterSent: boolean;
    developmentLetterSent: boolean;
    documentsNeeded: boolean;
    evidenceWaiverSubmitted5103: boolean;
    requestedDecision: boolean;
    claimTypeCode: string;
  };
}

export interface ClaimSubmission {
  veteranIdentification: {
    icn?: string;
    ssn?: string;
    firstName: string;
    lastName: string;
    birthDate: string;
  };
  claimant?: {
    firstName: string;
    lastName: string;
    relationshipToVeteran: string;
  };
  serviceInformation?: {
    servicePeriods: ServicePeriod[];
  };
  disabilities: ClaimedDisability[];
  treatments?: Treatment[];
}

export interface ServicePeriod {
  serviceBranch: string;
  activeDutyBeginDate: string;
  activeDutyEndDate: string;
  serviceComponent?: string;
}

export interface ClaimedDisability {
  disabilityActionType: 'NEW' | 'INCREASE' | 'SECONDARY';
  name: string;
  diagnosticCode?: number;
  secondaryDisabilities?: SecondaryDisability[];
}

export interface SecondaryDisability {
  name: string;
  disabilityActionType: 'SECONDARY';
  causedByDisability: string;
}

export interface Treatment {
  center: {
    name: string;
    type: 'VA' | 'NON_VA';
  };
  treatedDisabilityNames: string[];
  beginDate: string;
  endDate?: string;
}

// =============================================================================
// TYPES - Benefits Intake API
// =============================================================================

export interface IntakeSubmission {
  id: string;
  type: 'document_upload';
  attributes: {
    guid: string;
    status: 'pending' | 'uploaded' | 'received' | 'processing' | 'success' | 'error' | 'expired';
    code?: string;
    message?: string;
    detail?: string;
    location?: string;
    updatedAt: string;
  };
}

export interface DocumentUpload {
  file: File | Blob;
  fileName: string;
  documentType: 'pdf' | 'jpg' | 'jpeg' | 'png' | 'gif' | 'bmp' | 'tif' | 'tiff';
  veteranFirstName: string;
  veteranLastName: string;
  fileNumber?: string;
  zipCode?: string;
}

// =============================================================================
// API RESPONSE WRAPPER
// =============================================================================

export interface VAApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
  };
}

// =============================================================================
// SANDBOX TEST DATA
// =============================================================================

/**
 * Test ICNs provided by VA for sandbox testing
 * Format: 10-digit number + 'V' + 6-digit number
 * Example: 1012667145V762142
 *
 * Get more test users at: https://developer.va.gov/explore/api/benefits-claims/test-users
 */
export const SANDBOX_TEST_VETERANS = {
  // Standard test veteran with service history
  VETERAN_1: {
    icn: '1012667145V762142',
    firstName: 'Tamara',
    lastName: 'Ellis',
    birthDate: '1967-06-19',
    ssn: '796130115' // Last 4 only in production
  },
  // Test veteran with disability ratings
  VETERAN_2: {
    icn: '1012861229V078999',
    firstName: 'Jesse',
    lastName: 'Gray',
    birthDate: '1954-12-15',
    ssn: '796378881'
  },
  // Test veteran with active claims
  VETERAN_3: {
    icn: '1012666073V986297',
    firstName: 'Alfredo',
    lastName: 'Armstrong',
    birthDate: '1993-06-08',
    ssn: '796012476'
  }
};

// =============================================================================
// VA API SERVICE CLASS
// =============================================================================

export class VAApiService {
  private config: VAApiConfig;

  constructor(apiKey?: string) {
    this.config = {
      ...VA_API_CONFIG,
      apiKey: apiKey || VA_API_CONFIG.apiKey
    };
  }

  /**
   * Set API key (for runtime configuration)
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'sandbox' | 'production' {
    return this.config.environment;
  }

  // ===========================================================================
  // VETERAN VERIFICATION ENDPOINTS
  // ===========================================================================

  /**
   * Verify veteran status
   * Endpoint: GET /services/veteran_verification/v2/status
   */
  async verifyVeteranStatus(icn: string): Promise<VAApiResponse<VeteranStatus>> {
    return this.makeRequest<VeteranStatus>(
      `/services/veteran_verification/v2/status`,
      'GET',
      undefined,
      { icn }
    );
  }

  /**
   * Get service history
   * Endpoint: GET /services/veteran_verification/v2/service_history
   */
  async getServiceHistory(icn: string): Promise<VAApiResponse<VeteranServiceHistory[]>> {
    return this.makeRequest<VeteranServiceHistory[]>(
      `/services/veteran_verification/v2/service_history`,
      'GET',
      undefined,
      { icn }
    );
  }

  /**
   * Get disability rating
   * Endpoint: GET /services/veteran_verification/v2/disability_rating
   */
  async getDisabilityRating(icn: string): Promise<VAApiResponse<DisabilityRating>> {
    return this.makeRequest<DisabilityRating>(
      `/services/veteran_verification/v2/disability_rating`,
      'GET',
      undefined,
      { icn }
    );
  }

  // ===========================================================================
  // BENEFITS CLAIMS ENDPOINTS
  // ===========================================================================

  /**
   * Get all claims for a veteran
   * Endpoint: GET /services/claims/v2/veterans/{icn}/claims
   */
  async getClaims(icn: string): Promise<VAApiResponse<ClaimStatus[]>> {
    return this.makeRequest<ClaimStatus[]>(
      `/services/claims/v2/veterans/${icn}/claims`,
      'GET'
    );
  }

  /**
   * Get specific claim by ID
   * Endpoint: GET /services/claims/v2/veterans/{icn}/claims/{claimId}
   */
  async getClaimById(icn: string, claimId: string): Promise<VAApiResponse<ClaimStatus>> {
    return this.makeRequest<ClaimStatus>(
      `/services/claims/v2/veterans/${icn}/claims/${claimId}`,
      'GET'
    );
  }

  /**
   * Submit a new claim (526EZ)
   * Endpoint: POST /services/claims/v2/veterans/{icn}/526
   *
   * NOTE: This is a complex endpoint - in production, you'd need:
   * - OAuth2 CCG authentication
   * - Proper form data construction
   * - Document attachments
   */
  async submitClaim(icn: string, claim: ClaimSubmission): Promise<VAApiResponse<{ claimId: string }>> {
    return this.makeRequest<{ claimId: string }>(
      `/services/claims/v2/veterans/${icn}/526`,
      'POST',
      claim
    );
  }

  // ===========================================================================
  // BENEFITS INTAKE ENDPOINTS (Document Upload)
  // ===========================================================================

  /**
   * Get upload location for documents
   * Endpoint: POST /services/vba_documents/v1/uploads
   *
   * Returns a pre-signed URL for uploading documents
   */
  async getUploadLocation(): Promise<VAApiResponse<IntakeSubmission>> {
    return this.makeRequest<IntakeSubmission>(
      `/services/vba_documents/v1/uploads`,
      'POST'
    );
  }

  /**
   * Check upload status
   * Endpoint: GET /services/vba_documents/v1/uploads/{guid}
   */
  async getUploadStatus(guid: string): Promise<VAApiResponse<IntakeSubmission>> {
    return this.makeRequest<IntakeSubmission>(
      `/services/vba_documents/v1/uploads/${guid}`,
      'GET'
    );
  }

  /**
   * Upload document to pre-signed URL
   * This uploads directly to the location returned by getUploadLocation()
   */
  async uploadDocument(
    uploadUrl: string,
    document: DocumentUpload
  ): Promise<VAApiResponse<{ success: boolean }>> {
    try {
      const formData = new FormData();
      formData.append('content', document.file, document.fileName);
      formData.append('metadata', JSON.stringify({
        veteranFirstName: document.veteranFirstName,
        veteranLastName: document.veteranLastName,
        fileNumber: document.fileNumber,
        zipCode: document.zipCode,
        source: 'ACE Platform',
        docType: 'evidence'
      }));

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return {
        success: true,
        data: { success: true },
        meta: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Document upload failed'
        },
        meta: { timestamp: new Date().toISOString() }
      };
    }
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * Make authenticated request to VA API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    queryParams?: Record<string, string>
  ): Promise<VAApiResponse<T>> {
    try {
      // Build URL with query params
      let url = `${this.config.baseUrl}${endpoint}`;
      if (queryParams) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
      }

      // Build headers
      // When using the Vite proxy (/va-api), the proxy adds the apikey header
      // When calling directly, we add it here
      const isUsingProxy = this.config.baseUrl.startsWith('/');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Only add apikey header when not using proxy (proxy adds it server-side)
      if (!isUsingProxy && this.config.apiKey) {
        headers['apikey'] = this.config.apiKey;
      }

      // Make request
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      // Parse response
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: responseData.errors?.[0]?.code || `HTTP_${response.status}`,
            message: responseData.errors?.[0]?.title || response.statusText,
            details: responseData.errors?.[0]?.detail
          },
          meta: {
            requestId: response.headers.get('x-request-id') || undefined,
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        success: true,
        data: responseData.data,
        meta: {
          requestId: response.headers.get('x-request-id') || undefined,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed'
        },
        meta: { timestamp: new Date().toISOString() }
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

// Create a singleton instance for use throughout the app
export const vaApi = new VAApiService();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format ICN for display (masked)
 */
export function maskICN(icn: string): string {
  if (!icn || icn.length < 10) return 'Invalid ICN';
  return `${icn.substring(0, 4)}****${icn.substring(icn.length - 4)}`;
}

/**
 * Validate ICN format
 * Format: 10 digits + 'V' + 6 digits (e.g., 1012667145V762142)
 */
export function isValidICN(icn: string): boolean {
  const icnPattern = /^\d{10}V\d{6}$/;
  return icnPattern.test(icn);
}

/**
 * Format service branch for display
 */
export function formatServiceBranch(branch: string): string {
  const branches: Record<string, string> = {
    'army': 'U.S. Army',
    'navy': 'U.S. Navy',
    'air force': 'U.S. Air Force',
    'marine corps': 'U.S. Marine Corps',
    'coast guard': 'U.S. Coast Guard',
    'space force': 'U.S. Space Force'
  };
  return branches[branch.toLowerCase()] || branch;
}

/**
 * Format claim status for display
 */
export function formatClaimStatus(status: string): { label: string; color: string } {
  const statusMap: Record<string, { label: string; color: string }> = {
    'PENDING': { label: 'Pending', color: 'yellow' },
    'UNDER REVIEW': { label: 'Under Review', color: 'blue' },
    'GATHERING OF EVIDENCE': { label: 'Gathering Evidence', color: 'orange' },
    'REVIEW OF EVIDENCE': { label: 'Evidence Review', color: 'purple' },
    'PREPARATION FOR DECISION': { label: 'Preparing Decision', color: 'indigo' },
    'PENDING DECISION APPROVAL': { label: 'Decision Pending', color: 'cyan' },
    'PREPARATION FOR NOTIFICATION': { label: 'Preparing Notification', color: 'teal' },
    'COMPLETE': { label: 'Complete', color: 'green' }
  };
  return statusMap[status] || { label: status, color: 'gray' };
}

/**
 * Calculate estimated wait time based on claim phase
 */
export function estimateWaitTime(phase: string): string {
  const estimates: Record<string, string> = {
    'PENDING': '7-14 days',
    'UNDER REVIEW': '14-30 days',
    'GATHERING OF EVIDENCE': '30-60 days',
    'REVIEW OF EVIDENCE': '14-30 days',
    'PREPARATION FOR DECISION': '7-14 days',
    'PENDING DECISION APPROVAL': '3-7 days',
    'PREPARATION FOR NOTIFICATION': '1-3 days',
    'COMPLETE': 'N/A'
  };
  return estimates[phase] || 'Unknown';
}

export default VAApiService;
