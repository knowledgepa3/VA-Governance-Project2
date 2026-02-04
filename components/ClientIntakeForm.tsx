/**
 * Client Intake Form
 *
 * Public-facing form for veterans to submit their claim information.
 * Accessed via unique token link - no login required.
 *
 * This replaces the SuiteDash portal with a simpler, integrated solution.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  Globe,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  File,
  Trash2,
  Lock
} from 'lucide-react';
import {
  intakeTokenService,
  IntakeToken,
  IntakeTokenStatus,
  IntakeSubmission,
  IntakeFile
} from '../services/intakeTokenService';
import { ClaimType, CLAIM_TYPE_LABELS } from '../services/caseManager';

// ============================================================================
// FILE CATEGORIES
// ============================================================================

const FILE_CATEGORIES: { value: IntakeFile['category']; label: string; description: string }[] = [
  { value: 'dd214', label: 'DD214', description: 'Discharge documents' },
  { value: 'medical', label: 'Medical Records', description: 'Service treatment records, VA records' },
  { value: 'buddy-statement', label: 'Buddy Statement', description: 'Witness statements' },
  { value: 'nexus', label: 'Nexus Letter', description: 'Medical opinion linking condition to service' },
  { value: 'other', label: 'Other', description: 'Any other supporting documents' }
];

// Common conditions for quick selection
const COMMON_CONDITIONS = [
  'PTSD', 'Tinnitus', 'Hearing Loss', 'Lower Back Pain', 'Knee Condition',
  'Sleep Apnea', 'Migraines', 'Anxiety', 'Depression', 'TBI',
  'Shoulder Condition', 'Neck Pain', 'Hip Condition', 'Radiculopathy'
];

const COMMON_DEPLOYMENTS = ['Iraq', 'Afghanistan', 'Kuwait', 'Syria', 'Korea', 'Germany', 'Other'];

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface ClientIntakeFormProps {
  token: string;
  onSuccess?: (caseId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientIntakeForm({ token, onSuccess }: ClientIntakeFormProps) {
  // Token validation state
  const [tokenStatus, setTokenStatus] = useState<IntakeTokenStatus | 'loading'>('loading');
  const [tokenData, setTokenData] = useState<IntakeToken | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [claimType, setClaimType] = useState<ClaimType>('va-disability-ptsd');
  const [conditions, setConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');
  const [deployments, setDeployments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // File upload state
  const [files, setFiles] = useState<IntakeFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // UI state
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [showDeploymentPicker, setShowDeploymentPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---------------------------------------------------------------------------
  // TOKEN VALIDATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const validation = intakeTokenService.validateToken(token);
    setTokenStatus(validation.status);
    setTokenData(validation.token || null);
    setStatusMessage(validation.message);

    if (validation.status === 'valid' && validation.token) {
      // Record access
      intakeTokenService.recordAccess(token);

      // Pre-fill claim type if specified
      if (validation.token.expectedClaimType) {
        setClaimType(validation.token.expectedClaimType);
      }
    }
  }, [token]);

  // ---------------------------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------------------------

  const addCondition = (condition: string) => {
    if (condition.trim() && !conditions.includes(condition.trim())) {
      setConditions([...conditions, condition.trim()]);
    }
    setCustomCondition('');
  };

  const removeCondition = (condition: string) => {
    setConditions(conditions.filter(c => c !== condition));
  };

  const toggleDeployment = (deployment: string) => {
    if (deployments.includes(deployment)) {
      setDeployments(deployments.filter(d => d !== deployment));
    } else {
      setDeployments([...deployments, deployment]);
    }
  };

  // ---------------------------------------------------------------------------
  // FILE UPLOAD HANDLERS
  // ---------------------------------------------------------------------------

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const intakeFiles: IntakeFile[] = newFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      category: guessFileCategory(file.name),
      uploadedAt: new Date().toISOString()
    }));

    setFiles(prev => [...prev, ...intakeFiles]);
  };

  const guessFileCategory = (filename: string): IntakeFile['category'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('dd214') || lower.includes('dd-214')) return 'dd214';
    if (lower.includes('medical') || lower.includes('record') || lower.includes('treatment')) return 'medical';
    if (lower.includes('buddy') || lower.includes('statement') || lower.includes('witness')) return 'buddy-statement';
    if (lower.includes('nexus') || lower.includes('imo') || lower.includes('opinion')) return 'nexus';
    return 'other';
  };

  const updateFileCategory = (fileId: string, category: IntakeFile['category']) => {
    setFiles(files.map(f => f.id === fileId ? { ...f, category } : f));
  };

  const removeFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientName.trim()) {
      newErrors.clientName = 'Please enter your full name';
    }

    if (!clientEmail.trim()) {
      newErrors.clientEmail = 'Please enter your email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    if (conditions.length === 0) {
      newErrors.conditions = 'Please select at least one condition';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // SUBMISSION
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const submission: IntakeSubmission = {
        token,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        claimType,
        conditions,
        servicePeriod: serviceStart && serviceEnd ? { start: serviceStart, end: serviceEnd } : undefined,
        deployments: deployments.length > 0 ? deployments : undefined,
        notes: notes.trim() || undefined,
        files,
        submittedAt: new Date().toISOString()
      };

      const result = intakeTokenService.processSubmission(submission);

      if (result.success && result.caseId) {
        setIsSubmitted(true);
        setSubmittedCaseId(result.caseId);
        if (onSuccess) {
          onSuccess(result.caseId);
        }
      } else {
        setErrors({ submit: result.error || 'Failed to submit. Please try again.' });
      }
    } catch (error) {
      console.error('[ClientIntakeForm] Submission error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER - INVALID TOKEN
  // ---------------------------------------------------------------------------

  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Validating your link...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus !== 'valid') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Link Not Valid</h1>
          <p className="text-slate-600 mb-6">{statusMessage}</p>
          <p className="text-sm text-slate-500">
            If you need assistance, please contact us to request a new intake link.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - SUCCESS
  // ---------------------------------------------------------------------------

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Submission Received!</h1>
          <p className="text-slate-600 mb-6">
            Thank you for submitting your claim information. We'll review your documents and be in touch soon.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-2 text-left space-y-1">
              <li>• We'll review your submitted documents</li>
              <li>• Our team will analyze your claim</li>
              <li>• You'll receive an update via email</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - FORM
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Secure Intake Form
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">VA Disability Claim Intake</h1>
          <p className="text-slate-600">Please provide your information to begin the claims process.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Security Notice */}
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Your information is secure</p>
                  <p className="text-blue-700">
                    This form uses secure transmission. Your data will only be used to process your VA claim.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-400" />
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="John Smith"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                      }`}
                    />
                    {errors.clientName && (
                      <p className="text-sm text-red-500 mt-1">{errors.clientName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="john@example.com"
                        className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.clientEmail ? 'border-red-300 bg-red-50' : 'border-slate-300'
                        }`}
                      />
                    </div>
                    {errors.clientEmail && (
                      <p className="text-sm text-red-500 mt-1">{errors.clientEmail}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone Number <span className="text-slate-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Claim Type */}
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Claim Type
                </h2>

                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as ClaimType)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CLAIM_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </section>

              {/* Conditions */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-400" />
                    Conditions <span className="text-red-500">*</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowConditionPicker(!showConditionPicker)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showConditionPicker ? 'Hide suggestions' : 'Show common conditions'}
                  </button>
                </div>

                {/* Selected conditions */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {conditions.map((condition) => (
                    <span
                      key={condition}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full"
                    >
                      {condition}
                      <button
                        type="button"
                        onClick={() => removeCondition(condition)}
                        className="p-0.5 hover:bg-blue-200 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {conditions.length === 0 && (
                    <span className="text-slate-400">No conditions selected</span>
                  )}
                </div>

                {errors.conditions && (
                  <p className="text-sm text-red-500 mb-3">{errors.conditions}</p>
                )}

                {/* Common conditions picker */}
                {showConditionPicker && (
                  <div className="p-4 bg-slate-50 rounded-lg mb-3">
                    <p className="text-sm text-slate-600 mb-2">Click to add:</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_CONDITIONS.filter(c => !conditions.includes(c)).map((condition) => (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => addCondition(condition)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-full text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          + {condition}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom condition input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCondition}
                    onChange={(e) => setCustomCondition(e.target.value)}
                    placeholder="Add other condition..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCondition(customCondition);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addCondition(customCondition)}
                    disabled={!customCondition.trim()}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Service Period */}
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  Service Period <span className="text-slate-400 text-sm font-normal">(optional)</span>
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Entry Date</label>
                    <input
                      type="text"
                      value={serviceStart}
                      onChange={(e) => setServiceStart(e.target.value)}
                      placeholder="e.g., Jan 2008"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Separation Date</label>
                    <input
                      type="text"
                      value={serviceEnd}
                      onChange={(e) => setServiceEnd(e.target.value)}
                      placeholder="e.g., Dec 2012"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              {/* Deployments */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-slate-400" />
                    Deployments <span className="text-slate-400 text-sm font-normal">(optional)</span>
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {COMMON_DEPLOYMENTS.map((deployment) => (
                    <button
                      key={deployment}
                      type="button"
                      onClick={() => toggleDeployment(deployment)}
                      className={`px-4 py-2 border rounded-full transition-colors ${
                        deployments.includes(deployment)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {deployments.includes(deployment) ? '✓ ' : ''}{deployment}
                    </button>
                  ))}
                </div>
              </section>

              {/* File Upload */}
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-400" />
                  Upload Documents <span className="text-slate-400 text-sm font-normal">(optional)</span>
                </h2>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-2">
                    Drag and drop your files here, or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                      browse
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      />
                    </label>
                  </p>
                  <p className="text-sm text-slate-400">
                    PDF, Word documents, or images up to 10MB each
                  </p>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <File className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                        <select
                          value={file.category}
                          onChange={(e) => updateFileCategory(file.id, e.target.value as IntakeFile['category'])}
                          className="text-sm border border-slate-300 rounded px-2 py-1"
                        >
                          {FILE_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Additional Notes */}
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Additional Notes <span className="text-slate-400 text-sm font-normal">(optional)</span>
                </h2>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information that might help with your claim..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </section>

              {/* Error message */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  {errors.submit}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Submit Claim Information
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 text-center mt-3">
                By submitting, you agree to allow us to process your claim information.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Need help? Contact us for assistance with your submission.</p>
        </div>
      </div>
    </div>
  );
}

export default ClientIntakeForm;
