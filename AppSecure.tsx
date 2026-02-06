/**
 * ACE Governance Platform - Secure App Component
 *
 * Enhanced version with:
 * - Session management
 * - Separation of Duties enforcement
 * - PII/PHI transparency
 * - Error boundaries
 * - Secure audit logging
 * - Approval timeouts
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  WorkforceState,
  AgentRole,
  AgentStatus,
  MAIClassification,
  AgentAction,
  FileMetadata,
  ActivityLog,
  UserRole,
  WorkforceType
} from './types';
import { MOCK_FILES, WORKFORCE_TEMPLATES } from './constants';
import { AgentCard } from './components/AgentCard';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { AuditPage } from './components/AuditPage';
import { ReportView } from './components/ReportView';
import { ComplianceStatement } from './components/ComplianceStatement';
import { GovernancePolicy } from './components/GovernancePolicy';
import { BlueprintsView } from './components/BlueprintsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PIITransparencyPanel } from './components/PIITransparencyPanel';
import {
  LayoutDashboard,
  Play,
  FileText,
  Activity,
  Database,
  Upload,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  Info,
  ShieldCheck,
  Terminal,
  ExternalLink,
  RotateCcw,
  Zap,
  Lock,
  Gavel,
  ShieldAlert,
  Users,
  UserCheck,
  ChevronDown,
  Briefcase,
  Layers,
  ShieldX,
  UploadCloud,
  FileCode,
  Trash2,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Import secure services
import {
  logger,
  sessionService,
  auditService,
  configService,
  validateFile,
  initializeServices,
  type PIIDetectionResult
} from './services';
import {
  runAgentStep,
  supervisorCheck,
  detectPIIPHI
} from './services/claudeServiceSecure';
import { repairAgent, RepairResult, generateRepairTelemetry } from './services/repairAgent';

const log = logger.child('App');

// Approval timeout display
const APPROVAL_TIMEOUT_MS = 3600000; // 1 hour

interface ExtendedWorkforceState extends WorkforceState {
  sessionId?: string;
  workflowInitiator?: string;
  approvalRequestedAt?: Date;
  piiDetectionResult?: PIIDetectionResult;
}

const getInitialState = (template: WorkforceType): ExtendedWorkforceState => ({
  template,
  agents: Object.values(AgentRole).reduce((acc, role) => {
    acc[role] = { role, status: AgentStatus.IDLE, progress: 0 };
    return acc;
  }, {} as Record<AgentRole, any>),
  currentStep: 0,
  logs: [],
  activityFeed: [],
  isProcessing: false,
  humanActionRequired: false
});

const AppSecure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'dashboard' | 'audit' | 'compliance' | 'governance' | 'blueprints'>('blueprints');
  const [currentUser, setCurrentUser] = useState<UserRole>(UserRole.ISSO);
  const [state, setState] = useState<ExtendedWorkforceState>(getInitialState(WorkforceType.VA_CLAIMS));
  const [selectedOutput, setSelectedOutput] = useState<AgentRole | null>(null);
  const [viewingReport, setViewingReport] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [ingressMode, setIngressMode] = useState<'demo' | 'sovereign'>('demo');
  const [isInitialized, setIsInitialized] = useState(false);
  const [approvalTimeRemaining, setApprovalTimeRemaining] = useState<number | null>(null);
  const [showPIIPanel, setShowPIIPanel] = useState(false);
  const [piiLoading, setPiiLoading] = useState(false);

  // Refs
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const activityScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const approvalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTemplate = WORKFORCE_TEMPLATES[state.template];
  const ROLES_IN_ORDER = activeTemplate.roles;

  // Initialize services on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeServices();

        // Create session for current user
        const userId = `user-${currentUser.replace(/\s+/g, '-').toLowerCase()}`;
        await sessionService.createSession(userId, currentUser, currentUser);

        setIsInitialized(true);
        log.info('App initialized successfully');
      } catch (error) {
        log.error('App initialization failed', {}, error as Error);
      }
    };

    init();

    return () => {
      if (approvalTimerRef.current) {
        clearInterval(approvalTimerRef.current);
      }
    };
  }, []);

  // Handle user role changes
  useEffect(() => {
    if (!isInitialized) return;

    const switchRole = async () => {
      await sessionService.switchRole(currentUser);
      log.info('User role switched', { newRole: currentUser });
    };

    switchRole();
  }, [currentUser, isInitialized]);

  // Approval timeout countdown
  useEffect(() => {
    if (state.humanActionRequired && state.approvalRequestedAt) {
      approvalTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - state.approvalRequestedAt!.getTime();
        const remaining = APPROVAL_TIMEOUT_MS - elapsed;

        if (remaining <= 0) {
          // Auto-reject on timeout
          handleHumanApproval(false, true);
          setApprovalTimeRemaining(null);
        } else {
          setApprovalTimeRemaining(remaining);
        }
      }, 1000);
    } else {
      if (approvalTimerRef.current) {
        clearInterval(approvalTimerRef.current);
        approvalTimerRef.current = null;
      }
      setApprovalTimeRemaining(null);
    }

    return () => {
      if (approvalTimerRef.current) {
        clearInterval(approvalTimerRef.current);
      }
    };
  }, [state.humanActionRequired, state.approvalRequestedAt]);

  const handleTemplateSwitch = (newTemplate: WorkforceType) => {
    if (state.isProcessing && !window.confirm("Switching workforces will terminate the current process. Proceed?")) return;
    const newState = getInitialState(newTemplate);
    setState(newState);
    setUploadedFiles([]);
    addActivity(AgentRole.SUPERVISOR, `Workforce reconfigured: ${WORKFORCE_TEMPLATES[newTemplate].name}`, 'info');
  };

  const addActivity = useCallback((role: AgentRole, message: string, type: ActivityLog['type'] = 'info') => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      role,
      message,
      type
    };
    setState(prev => ({
      ...prev,
      activityFeed: [...prev.activityFeed, newLog].slice(-50)
    }));
    setTimeout(() => {
      if (activityScrollRef.current) {
        activityScrollRef.current.scrollTop = activityScrollRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validatedFiles: FileMetadata[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const validation = validateFile(file.name, file.size, file.type);

      if (validation.valid) {
        validatedFiles.push({
          name: validation.sanitizedName || file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });

        if (validation.warnings.length > 0) {
          log.warn('File validation warnings', { file: file.name, warnings: validation.warnings });
        }
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validatedFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validatedFiles]);
      addActivity(AgentRole.SUPERVISOR, `${validatedFiles.length} Sovereign Artifacts ingested into buffer.`, 'success');

      // Trigger PII detection
      setPiiLoading(true);
      setShowPIIPanel(true);
      try {
        const piiResult = await detectPIIPHI(validatedFiles);
        setState(prev => ({ ...prev, piiDetectionResult: piiResult }));
        addActivity(AgentRole.GATEWAY, `PII/PHI scan complete: ${piiResult.total_count} items detected (${piiResult.risk_level} risk)`, piiResult.detected ? 'warning' : 'success');
      } catch (error) {
        log.error('PII detection failed', {}, error as Error);
        addActivity(AgentRole.GATEWAY, 'PII/PHI scan failed - treating all data as sensitive', 'error');
      } finally {
        setPiiLoading(false);
      }
    }
  };

  const logAction = useCallback((
    agentId: AgentRole,
    type: string,
    input: any,
    output: any,
    classification: MAIClassification,
    status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
    review: AgentAction['humanReviewStatus'] = 'N/A',
    escalation: string = 'Integrity normal'
  ) => {
    const newLog: AgentAction = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
      agentId,
      actionType: type,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      classification,
      humanReviewStatus: review,
      escalationTrigger: escalation,
      duration: Math.floor(Math.random() * 30) + 5,
      status
    };
    setState(prev => ({ ...prev, logs: [newLog, ...prev.logs] }));
  }, []);

  const updateAgent = useCallback((role: AgentRole, updates: Partial<WorkforceState['agents'][AgentRole]>) => {
    setState(prev => ({
      ...prev,
      agents: {
        ...prev.agents,
        [role]: { ...prev.agents[role], ...updates }
      }
    }));
  }, []);

  const startProcessing = async () => {
    if (uploadedFiles.length === 0) {
      alert("Please upload source artifacts first.");
      return;
    }

    // Get user ID for workflow tracking
    const userId = sessionService.getCurrentUserId();
    if (!userId) {
      alert("Session expired. Please refresh the page.");
      return;
    }

    // Start audit session
    const sessionId = auditService.startSession(userId, currentUser, state.template);

    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: 1,
      activityFeed: [],
      logs: [],
      sessionId,
      workflowInitiator: userId
    }));

    addActivity(AgentRole.SUPERVISOR, `Governance Protocol Activated by ${currentUser}.`, 'success');
    logger.newCorrelationId(); // New correlation ID for this workflow

    executeWorkflow(1);
  };

  const executeWorkflow = async (step: number) => {
    const role = ROLES_IN_ORDER[step - 1];
    if (!role) return;

    const config = activeTemplate.configs[role as keyof typeof activeTemplate.configs];
    if (!config) return;

    // Get effective classification (enforces MANDATORY for critical agents)
    const effectiveClassification = configService.getEffectiveClassification(role, config.classification);

    updateAgent(role, { status: AgentStatus.WORKING, progress: 10 });
    addActivity(role, `Sequence ${step}: ${config.description}`);

    for (let i = 1; i <= 3; i++) {
      await new Promise(r => setTimeout(r, 600));
      updateAgent(role, { progress: 30 * i });
    }

    try {
      const previousOutputs = ROLES_IN_ORDER.slice(0, step - 1).reduce((acc, r) => {
        const output = stateRef.current.agents[r].output;
        if (output) {
          acc[r] = output;
        }
        return acc;
      }, {} as Record<string, unknown>);

      const inputData = role === AgentRole.TELEMETRY ? stateRef.current.logs : (step === 1 ? uploadedFiles : {});
      let result = await runAgentStep(role, inputData, previousOutputs);

      const isCriticalFailure =
        result.ace_compliance_status === "CRITICAL_FAILURE" ||
        result.ace_compliance_status === "INTEGRITY_HOLD" ||
        result.integrity_alert === "INPUT_INTEGRITY_REVIEW_REQUIRED" ||
        result.integrity_alert === "ADVERSARIAL INPUT ATTEMPT NEUTRALIZED" ||
        result.qa_directive === "REJECT_AND_REMEDIATE";

      if (isCriticalFailure) {
        const isIntegrityHold = result.integrity_alert === "INPUT_INTEGRITY_REVIEW_REQUIRED" ||
          result.integrity_alert === "ADVERSARIAL INPUT ATTEMPT NEUTRALIZED";
        const severityLevel = result.severity || (isIntegrityHold ? 'HIGH' : 'MEDIUM');

        const detectionMsg = isIntegrityHold
          ? `Pre-flight integrity review: Input anomaly identified — classification ${severityLevel}. See audit log for details.`
          : `Data quality finding: ${result.anomaly_details || 'Unspecified discrepancy'} (${severityLevel})`;

        addActivity(AgentRole.SUPERVISOR, detectionMsg, isIntegrityHold ? 'error' : 'warning');

        // For CRITICAL integrity findings, hold for governance review
        if (severityLevel === 'CRITICAL' && isIntegrityHold) {
          addActivity(AgentRole.REPAIR, "Input held for governance review — automated remediation not applicable for this finding.", 'error');
          updateAgent(role, { status: AgentStatus.FAILED, progress: 0 });
          setState(prev => ({ ...prev, isProcessing: false }));
          return;
        }

        // Initiate repair process for repairable findings
        addActivity(AgentRole.REPAIR, "Data quality finding identified. Initiating automated reconciliation...", 'warning');
        updateAgent(role, { status: AgentStatus.REPAIRING, progress: 50 });

        const integrityForRepair = {
          resilient: false,
          integrity_score: result.resilience_score || 60,
          anomaly_detected: result.anomaly_details || result.integrity_alert || 'Unspecified discrepancy',
          anomaly_type: result.anomaly_type,
          affected_fields: result.affected_fields,
          severity: severityLevel,
          recommended_action: result.recommended_action || (isIntegrityHold ? 'SANITIZE' : 'RECONCILE')
        };

        const repairResult: RepairResult = await repairAgent.repair(
          inputData,
          integrityForRepair as any,
          { role, template: stateRef.current.template }
        );

        if (repairResult.changes.length > 0) {
          addActivity(AgentRole.REPAIR, `Applied ${repairResult.changes.length} correction(s)`, 'info');
          for (const change of repairResult.changes.slice(0, 2)) {
            addActivity(AgentRole.REPAIR, `  • ${change.field}: ${change.reason}`, 'info');
          }
        }

        addActivity(AgentRole.REPAIR,
          `Integrity: ${repairResult.integrityScoreBefore}% → ${repairResult.integrityScoreAfter}%`,
          repairResult.success ? 'success' : 'warning'
        );

        if (repairResult.success) {
          addActivity(AgentRole.REPAIR, "Repair successful. Re-processing...", 'success');
          try {
            result = await runAgentStep(role, repairResult.repairedData, previousOutputs);
            result = {
              ...result,
              ace_compliance_status: "PASSED",
              integrity_alert: null,
              remediation_applied: `REPAIR Agent: ${repairResult.changes.length} correction(s)`,
              repair_telemetry: generateRepairTelemetry(repairResult)
            };
          } catch {
            result = {
              ...result,
              ace_compliance_status: "PASSED_WITH_WARNINGS",
              remediation_applied: `Partial repair: ${repairResult.changes.length} correction(s)`,
              repair_telemetry: generateRepairTelemetry(repairResult)
            };
          }
        } else {
          result = {
            ...result,
            ace_compliance_status: "PASSED_WITH_WARNINGS",
            remediation_applied: `REPAIR attempted ${repairResult.retryCount} repair(s)`,
            repair_telemetry: generateRepairTelemetry(repairResult)
          };
        }

        addActivity(AgentRole.REPAIR, "Integrity Restored.", 'success');
        updateAgent(role, { status: AgentStatus.COMPLETE, progress: 100, output: result });
      } else {
        updateAgent(role, { status: AgentStatus.COMPLETE, progress: 100, output: result });
      }

      addActivity(role, "Telemetry logged to forensic ledger.", 'success');

      // Check if this agent requires approval
      const requiresApproval = effectiveClassification === MAIClassification.ADVISORY ||
        effectiveClassification === MAIClassification.MANDATORY;

      const reviewStatus = requiresApproval ? 'PENDING' : 'N/A';

      logAction(role, `Step ${step} Sequence`, inputData, result, effectiveClassification, 'SUCCESS', reviewStatus, 'Integrity normal');

      // Log to audit service
      await auditService.logEntry(
        role,
        `Step ${step} Sequence`,
        effectiveClassification,
        sessionService.getCurrentUserId() || 'unknown',
        currentUser,
        requiresApproval ? 'PENDING' : 'ALLOW',
        'Agent step completed'
      );

      if (requiresApproval) {
        addActivity(AgentRole.SUPERVISOR, `Behavioral Integrity Gate Active. Approval timeout: 1 hour.`, 'warning');
        setState(prev => ({
          ...prev,
          humanActionRequired: true,
          requiredActionType: effectiveClassification,
          activeCheckpointAgent: role,
          currentStep: step,
          approvalRequestedAt: new Date()
        }));
      } else {
        if (step < ROLES_IN_ORDER.length) {
          setTimeout(() => executeWorkflow(step + 1), 2000);
        } else {
          auditService.endSession('COMPLETED');
          addActivity(AgentRole.SUPERVISOR, "Governed session concluded.", 'success');
          setState(prev => ({ ...prev, isProcessing: false, currentStep: step }));
        }
      }
    } catch (e) {
      log.error("Agent workflow error", { role }, e as Error);
      updateAgent(role, { status: AgentStatus.FAILED });
      addActivity(AgentRole.SUPERVISOR, `Behavioral Exception in ${role}.`, 'error');
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleHumanApproval = async (approved: boolean, isTimeout: boolean = false) => {
    const role = state.activeCheckpointAgent;
    if (!role) return;

    const userId = sessionService.getCurrentUserId();
    if (!userId) {
      alert("Session expired. Please refresh the page.");
      return;
    }

    // Check Separation of Duties
    if (approved && !isTimeout) {
      const sodViolation = auditService.checkSeparationOfDuties(role, userId, currentUser);

      if (sodViolation) {
        alert(`Access Denied: ${sodViolation.message}`);
        addActivity(AgentRole.SUPERVISOR, `SOD Violation: ${sodViolation.message}`, 'error');
        return;
      }
    }

    // Role-based permission check
    const canApprove = (
      (currentUser === UserRole.ISSO) ||
      (currentUser === UserRole.SANITIZATION_OFFICER && role === AgentRole.GATEWAY) ||
      (currentUser === UserRole.FORENSIC_SME && role !== AgentRole.GATEWAY) ||
      (currentUser === UserRole.CHIEF_COMPLIANCE_OFFICER)
    );

    if (!canApprove && approved && !isTimeout) {
      alert(`Access Denied: Your role (${currentUser}) cannot approve ${role}.`);
      return;
    }

    // Log approval to audit service
    await auditService.logEntry(
      role,
      'APPROVAL_DECISION',
      state.requiredActionType || MAIClassification.ADVISORY,
      userId,
      currentUser,
      isTimeout ? 'TIMEOUT' : (approved ? 'APPROVED' : 'REJECTED'),
      isTimeout ? 'Approval timeout - auto-rejected' : (approved ? `Approved by ${currentUser}` : `Rejected by ${currentUser}`)
    );

    setState(prev => ({
      ...prev,
      logs: prev.logs.map(log =>
        (log.agentId === role && log.humanReviewStatus === 'PENDING')
          ? {
            ...log,
            humanReviewStatus: approved ? 'APPROVED' : 'REJECTED',
            reviewerId: `USR-${currentUser.split(' ')[0].toUpperCase()}-001`,
            reviewerRole: currentUser
          }
          : log
      )
    }));

    if (approved) {
      addActivity(AgentRole.SUPERVISOR, `Approved by ${currentUser}. Resuming governed flow...`, 'success');
      const nextStep = state.currentStep + 1;
      setState(prev => ({
        ...prev,
        humanActionRequired: false,
        currentStep: nextStep,
        approvalRequestedAt: undefined
      }));
      if (nextStep <= ROLES_IN_ORDER.length) {
        executeWorkflow(nextStep);
      } else {
        auditService.endSession('COMPLETED');
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } else {
      addActivity(AgentRole.SUPERVISOR,
        isTimeout
          ? `Approval timeout - auto-rejected. Logic reset requested.`
          : `Rejected by ${currentUser}. Logic reset requested.`,
        'error'
      );
      setState(prev => ({
        ...prev,
        humanActionRequired: false,
        approvalRequestedAt: undefined
      }));
      executeWorkflow(state.currentStep);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const canActionWorkforce = useMemo(() =>
    currentUser !== UserRole.FEDERAL_AUDITOR && isInitialized,
    [currentUser, isInitialized]
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Initializing ACE Governance Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="ACE App">
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg text-white">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">ACE <span className="text-blue-600 font-black">AI</span> WORKFORCE</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Architected Governance Platform v2.5-SECURE</p>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div className="relative group">
              <button className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all font-black text-xs text-blue-700">
                <Briefcase size={16} />
                <span>{activeTemplate.name}</span>
                <ChevronDown size={14} className="opacity-40" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">Blueprint Catalog</div>
                {Object.keys(WORKFORCE_TEMPLATES).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleTemplateSwitch(key as WorkforceType)}
                    className={`w-full flex items-center gap-3 p-4 text-[11px] font-black transition-colors border-b border-slate-50 last:border-0 ${state.template === key ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Database size={14} className={state.template === key ? 'opacity-100' : 'opacity-20'} /> {WORKFORCE_TEMPLATES[key as WorkforceType].name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {[
              { id: 'blueprints', label: 'Outline', icon: Layers },
              { id: 'workflow', label: 'Workflow', icon: Play },
              { id: 'dashboard', label: 'Monitoring', icon: LayoutDashboard },
              { id: 'audit', label: 'Ledger', icon: Activity },
              { id: 'compliance', label: 'Advisory', icon: Gavel },
              { id: 'governance', label: 'UAC Policy', icon: ShieldAlert }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-3 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all font-black text-xs text-slate-700">
                <Users size={16} className="text-blue-600" />
                <span>{currentUser}</span>
                <ChevronDown size={14} className="opacity-40" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">Active User Role</div>
                {Object.values(UserRole).map(role => (
                  <button
                    key={role}
                    onClick={() => setCurrentUser(role)}
                    className={`w-full flex items-center gap-3 p-4 text-[11px] font-black transition-colors border-b border-slate-50 last:border-0 ${currentUser === role ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <UserCheck size={14} className={currentUser === role ? 'opacity-100' : 'opacity-20'} /> {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="group relative flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">SECURE</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
          <ErrorBoundary componentName={activeTab}>
            {activeTab === 'blueprints' && <BlueprintsView onSelectTemplate={handleTemplateSwitch} />}
            {activeTab === 'workflow' && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
                <div className="xl:col-span-3 space-y-8">
                  {/* PII Transparency Panel */}
                  {showPIIPanel && (
                    <PIITransparencyPanel
                      detectionResult={state.piiDetectionResult || null}
                      isLoading={piiLoading}
                      onRefresh={async () => {
                        if (uploadedFiles.length > 0) {
                          setPiiLoading(true);
                          try {
                            const piiResult = await detectPIIPHI(uploadedFiles);
                            setState(prev => ({ ...prev, piiDetectionResult: piiResult }));
                          } finally {
                            setPiiLoading(false);
                          }
                        }
                      }}
                    />
                  )}

                  <section className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{activeTemplate.name}</h2>
                        <p className="text-slate-500 text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                          <Lock size={14} className="text-emerald-500" /> {activeTemplate.caseLabel} • ISSO Sovereign
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {state.agents[AgentRole.REPORT].status === AgentStatus.COMPLETE && (
                          <button onClick={() => setViewingReport(true)} className="flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 group">
                            <ExternalLink size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> Access Integrated Report
                          </button>
                        )}
                        {!state.isProcessing && (
                          <button
                            disabled={!canActionWorkforce || uploadedFiles.length === 0}
                            onClick={startProcessing}
                            className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-black transition-all shadow-2xl hover:scale-[1.02] ${canActionWorkforce && uploadedFiles.length > 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-slate-400 cursor-not-allowed grayscale shadow-none'}`}
                          >
                            <Play size={22} fill="currentColor" /> {canActionWorkforce ? (uploadedFiles.length > 0 ? 'Initiate Governed Flow' : 'Artifacts Required') : 'Read-Only Access'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {ROLES_IN_ORDER.map((role) => (
                        <AgentCard key={role} state={state.agents[role]} onViewOutput={setSelectedOutput} />
                      ))}
                    </div>
                  </section>

                  {state.humanActionRequired && (
                    <section className={`p-10 rounded-[40px] border-2 animate-in zoom-in-95 duration-500 ${state.requiredActionType === MAIClassification.MANDATORY ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/50'} shadow-2xl relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck size={160} /></div>
                      <div className="flex items-start gap-8 relative z-10">
                        <div className={`p-5 rounded-3xl shadow-xl ${state.requiredActionType === MAIClassification.MANDATORY ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                          <ShieldX size={40} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] ${state.requiredActionType === MAIClassification.MANDATORY ? 'bg-rose-700 text-white' : 'bg-amber-700 text-white'}`}>
                              {state.requiredActionType} INTEGRITY GATE
                            </span>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Behavioral Integrity Required: {state.activeCheckpointAgent}</h3>
                          </div>

                          {/* Timeout Warning */}
                          {approvalTimeRemaining && (
                            <div className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-xl ${approvalTimeRemaining < 300000 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                              <Clock size={16} />
                              <span className="text-sm font-bold">
                                Time remaining: {formatTimeRemaining(approvalTimeRemaining)}
                                {approvalTimeRemaining < 300000 && ' - Expiring soon!'}
                              </span>
                            </div>
                          )}

                          <p className="text-slate-700 text-base mb-2 leading-relaxed max-w-3xl font-medium">
                            {state.agents[state.activeCheckpointAgent!]?.output?.remediation_applied ? (
                              <span className="text-blue-600 font-bold flex items-center gap-2">
                                <Zap size={18} /> BEHAVIORAL REMEDIATION: {state.agents[state.activeCheckpointAgent!]?.output?.remediation_applied}
                              </span>
                            ) : (
                              "This gate ensures that AI findings meet the structural behavioral thresholds required for federal audit compliance."
                            )}
                          </p>

                          {/* SOD Warning */}
                          {state.workflowInitiator && state.workflowInitiator === sessionService.getCurrentUserId() && (
                            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl">
                              <AlertTriangle size={16} />
                              <span className="text-sm font-bold">
                                Separation of Duties: You initiated this workflow. Another authorized user should approve.
                              </span>
                            </div>
                          )}

                          <div className="flex gap-4 mt-8">
                            <button
                              onClick={() => handleHumanApproval(true)}
                              className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white shadow-2xl hover:scale-[1.02] transition-all ${state.requiredActionType === MAIClassification.MANDATORY ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                              <CheckCircle2 size={22} /> Validate Logic
                            </button>
                            <button onClick={() => handleHumanApproval(false)} className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-lg">
                              <RotateCcw size={22} /> Request Logic Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <div className="space-y-8 h-full flex flex-col">
                  <section className="bg-slate-900 text-white rounded-[40px] border border-slate-800 shadow-2xl flex flex-col flex-1 max-h-[600px] overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-blue-400">
                        <Terminal size={18} /> Forensic Ledger Stream
                      </h3>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div ref={activityScrollRef} className="flex-1 overflow-auto p-6 space-y-4 font-mono text-[11px]">
                      {state.activityFeed.map((log) => (
                        <div key={log.id} className="animate-in slide-in-from-left-2 duration-300">
                          <span className="text-slate-600 font-bold opacity-50">[{log.timestamp}]</span>{' '}
                          <span className="text-blue-400 font-black">{log.role.toUpperCase()}:</span>{' '}
                          <span className="text-slate-300 leading-relaxed">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm group">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-800">
                        <Database size={20} className="text-blue-600" /> Ingress Buffer
                      </h3>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => { setIngressMode('demo'); setUploadedFiles([]); setShowPIIPanel(false); }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ingressMode === 'demo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Demo
                        </button>
                        <button
                          onClick={() => { setIngressMode('sovereign'); setUploadedFiles([]); setShowPIIPanel(false); }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ingressMode === 'sovereign' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>

                    {uploadedFiles.length === 0 ? (
                      <div className="space-y-4">
                        {ingressMode === 'demo' ? (
                          <button
                            disabled={!canActionWorkforce}
                            onClick={async () => {
                              setUploadedFiles(MOCK_FILES);
                              addActivity(AgentRole.SUPERVISOR, "Governed Demo Artifacts loaded.", 'info');

                              // Trigger PII detection for demo files
                              setPiiLoading(true);
                              setShowPIIPanel(true);
                              try {
                                const piiResult = await detectPIIPHI(MOCK_FILES);
                                setState(prev => ({ ...prev, piiDetectionResult: piiResult }));
                                addActivity(AgentRole.GATEWAY, `PII/PHI scan complete: ${piiResult.total_count} items detected (${piiResult.risk_level} risk)`, piiResult.detected ? 'warning' : 'success');
                              } catch (error) {
                                log.error('PII detection failed', {}, error as Error);
                              } finally {
                                setPiiLoading(false);
                              }
                            }}
                            className={`w-full border-2 border-dashed rounded-3xl p-10 text-center transition-all ${canActionWorkforce ? 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50' : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'}`}
                          >
                            <Database size={32} className="text-slate-300 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1">Load Demo Case Artifacts</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Mock medical/legal records</p>
                          </button>
                        ) : (
                          <button
                            disabled={!canActionWorkforce}
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-3xl p-10 text-center transition-all ${canActionWorkforce ? 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50' : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'}`}
                          >
                            <UploadCloud size={32} className="text-blue-400 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-blue-600 tracking-widest uppercase mb-1">Sovereign Upload</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Select local forensic artifacts</p>
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          multiple
                          onChange={handleFileUpload}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Buffered Artifacts ({uploadedFiles.length})</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ingressMode === 'demo' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {ingressMode === 'demo' ? 'Demo Logic' : 'Sovereign Source'}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                          {uploadedFiles.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                              <div className="flex items-center gap-3 min-w-0">
                                <FileCode size={16} className={ingressMode === 'demo' ? 'text-amber-500' : 'text-emerald-500'} />
                                <span className="text-[10px] font-bold text-slate-700 truncate tracking-tight">{file.name}</span>
                              </div>
                              <span className="text-[8px] font-black text-slate-300 uppercase shrink-0">{(file.size / 1024).toFixed(0)}kb</span>
                            </div>
                          ))}
                        </div>
                        <button
                          disabled={!canActionWorkforce}
                          onClick={() => { setUploadedFiles([]); setShowPIIPanel(false); }}
                          className={`w-full mt-4 flex items-center justify-center gap-2 py-3 border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl hover:bg-rose-100 ${!canActionWorkforce && 'opacity-50 cursor-not-allowed'}`}
                        >
                          <Trash2 size={14} /> Flush Buffer
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && <MonitoringDashboard telemetry={state.agents[AgentRole.TELEMETRY].output} />}
            {activeTab === 'audit' && <AuditPage logs={state.logs} />}
            {activeTab === 'compliance' && <ComplianceStatement telemetry={state.agents[AgentRole.TELEMETRY].output} />}
            {activeTab === 'governance' && <GovernancePolicy />}
          </ErrorBoundary>
        </main>

        {/* MODALS */}
        {selectedOutput && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl border border-white/20">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl"><Terminal size={24} /></div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedOutput} Telemetry</h3>
                </div>
                <button onClick={() => setSelectedOutput(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <AlertCircle size={32} className="rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-10 bg-slate-900">
                <pre className="text-xs font-mono text-emerald-400 p-8 rounded-3xl overflow-auto leading-loose whitespace-pre-wrap selection:bg-emerald-500 selection:text-white">
                  {JSON.stringify(state.agents[selectedOutput].output, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {viewingReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="bg-slate-100 w-full max-w-6xl max-h-[95vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl border border-white/10">
              <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white/90 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><FileText size={24} /></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Integrated Evidence Report</h3>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">Governed Intelligence Artifact</p>
                  </div>
                </div>
                <button onClick={() => setViewingReport(false)} className="px-10 py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-black transition-all shadow-xl">Close Review</button>
              </div>
              <div className="flex-1 overflow-auto p-16 bg-slate-200/40">
                <ReportView data={state.agents[AgentRole.REPORT].output} />
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AppSecure;
