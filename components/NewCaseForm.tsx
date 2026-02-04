/**
 * New Case Form - Create a new client case
 *
 * Collects veteran/client information for VA disability claims.
 * Integrates with caseManager service for persistence.
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Flag,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Globe,
  Shield
} from 'lucide-react';
import {
  caseManager,
  ClaimType,
  CasePriority,
  CLAIM_TYPE_LABELS
} from '../services/caseManager';

interface NewCaseFormProps {
  onClose: () => void;
  onCreated?: (caseId: string) => void;
}

// Common VA disability conditions for quick selection
const COMMON_CONDITIONS = [
  'PTSD',
  'Tinnitus',
  'Hearing Loss',
  'Lower Back Pain',
  'Knee Condition',
  'Sleep Apnea',
  'Migraines',
  'Anxiety',
  'Depression',
  'TBI',
  'Shoulder Condition',
  'Neck Pain',
  'Hip Condition',
  'Radiculopathy',
  'GERD',
  'Hypertension',
  'Diabetes',
  'Plantar Fasciitis',
  'Sinusitis',
  'Scars'
];

// Common deployment locations
const COMMON_DEPLOYMENTS = [
  'Iraq',
  'Afghanistan',
  'Kuwait',
  'Syria',
  'Korea',
  'Germany',
  'Japan',
  'Qatar',
  'UAE',
  'Other'
];

export function NewCaseForm({ onClose, onCreated }: NewCaseFormProps) {
  // Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [claimType, setClaimType] = useState<ClaimType>('va-disability-ptsd');
  const [priority, setPriority] = useState<CasePriority>('normal');
  const [conditions, setConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');
  const [deployments, setDeployments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [showDeploymentPicker, setShowDeploymentPicker] = useState(false);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!clientEmail.trim()) {
      newErrors.clientEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      newErrors.clientEmail = 'Invalid email format';
    }

    if (conditions.length === 0) {
      newErrors.conditions = 'At least one condition is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const newCase = caseManager.createCase({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        claimType,
        conditions,
        servicePeriod: serviceStart && serviceEnd ? {
          start: serviceStart,
          end: serviceEnd
        } : undefined,
        deployments: deployments.length > 0 ? deployments : undefined,
        notes: notes.trim(),
        priority
      });

      console.log('[NewCaseForm] Created case:', newCase.id);

      if (onCreated) {
        onCreated(newCase.id);
      }

      onClose();
    } catch (error) {
      console.error('[NewCaseForm] Error creating case:', error);
      setErrors({ submit: 'Failed to create case. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add condition
  const addCondition = (condition: string) => {
    if (condition && !conditions.includes(condition)) {
      setConditions([...conditions, condition]);
    }
    setCustomCondition('');
    setShowConditionPicker(false);
  };

  // Remove condition
  const removeCondition = (condition: string) => {
    setConditions(conditions.filter(c => c !== condition));
  };

  // Toggle deployment
  const toggleDeployment = (deployment: string) => {
    if (deployments.includes(deployment)) {
      setDeployments(deployments.filter(d => d !== deployment));
    } else {
      setDeployments([...deployments, deployment]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">New Case</h2>
              <p className="text-xs text-slate-500">Create a new client case for VA claims</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Session-only warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Prototype Mode - Session-Only Storage</p>
                <p className="text-xs text-amber-700 mt-1">
                  <strong>Sensitive fields</strong> (name, email, phone, conditions, notes) are stored in memory only
                  and will be <strong>cleared on page refresh</strong>. Only the case ID, status, and timestamps are persisted.
                </p>
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Enterprise mode with secure vault coming soon
                </p>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Information
              <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Session Only</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Smith"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.clientName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.clientName && (
                  <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.clientEmail ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.clientEmail && (
                  <p className="text-xs text-red-500 mt-1">{errors.clientEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CasePriority)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Claim Type */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Claim Type
            </h3>

            <select
              value={claimType}
              onChange={(e) => setClaimType(e.target.value as ClaimType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CLAIM_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Conditions *
              </h3>
              <button
                type="button"
                onClick={() => setShowConditionPicker(!showConditionPicker)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showConditionPicker ? 'Hide' : 'Show'} common conditions
              </button>
            </div>

            {/* Selected conditions */}
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <span
                  key={condition}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                >
                  {condition}
                  <button
                    type="button"
                    onClick={() => removeCondition(condition)}
                    className="p-0.5 hover:bg-blue-200 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {conditions.length === 0 && (
                <span className="text-sm text-slate-400">No conditions selected</span>
              )}
            </div>

            {errors.conditions && (
              <p className="text-xs text-red-500">{errors.conditions}</p>
            )}

            {/* Common conditions picker */}
            {showConditionPicker && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Click to add:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_CONDITIONS.filter(c => !conditions.includes(c)).map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => addCondition(condition)}
                      className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
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
                placeholder="Add custom condition..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Service Period */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Service Period (optional)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Entry Date
                </label>
                <input
                  type="text"
                  value={serviceStart}
                  onChange={(e) => setServiceStart(e.target.value)}
                  placeholder="e.g., 2008 or Jan 2008"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Separation Date
                </label>
                <input
                  type="text"
                  value={serviceEnd}
                  onChange={(e) => setServiceEnd(e.target.value)}
                  placeholder="e.g., 2012 or Dec 2012"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Deployments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Deployments (optional)
              </h3>
              <button
                type="button"
                onClick={() => setShowDeploymentPicker(!showDeploymentPicker)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showDeploymentPicker ? 'Hide' : 'Select'} deployments
              </button>
            </div>

            {deployments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {deployments.map((deployment) => (
                  <span
                    key={deployment}
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-sm"
                  >
                    {deployment}
                    <button
                      type="button"
                      onClick={() => toggleDeployment(deployment)}
                      className="p-0.5 hover:bg-green-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {showDeploymentPicker && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {COMMON_DEPLOYMENTS.map((deployment) => (
                    <button
                      key={deployment}
                      type="button"
                      onClick={() => toggleDeployment(deployment)}
                      className={`px-2 py-1 border rounded text-xs transition-colors ${
                        deployments.includes(deployment)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {deployments.includes(deployment) ? '✓ ' : ''}{deployment}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes (optional)
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this case..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.submit}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <p className="text-xs text-slate-500">
            * Required fields
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Case
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewCaseForm;
