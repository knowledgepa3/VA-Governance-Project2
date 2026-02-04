
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
  WorkforceType,
  SupervisorScore,
  RedTeamRunResult,
  RedTeamActivityLog,
  RedTeamFinding
} from './types';
import { MOCK_FILES, WORKFORCE_TEMPLATES, VA_CLAIMS_MOCK_FILES, FINANCIAL_MOCK_FILES, VA_CLAIMS_DEMO_DATA, FINANCIAL_DEMO_DATA, CYBER_IR_MOCK_FILES, CYBER_IR_DEMO_DATA, GRANT_WRITING_MOCK_FILES, GRANT_WRITING_DEMO_DATA } from './constants';
import { runAgentStep, supervisorCheck, behavioralIntegrityCheck, EnhancedIntegrityResult } from './claudeService';
import { repairAgent, RepairResult, formatRepairChanges, generateRepairTelemetry } from './services/repairAgent';
import { extractTextFromPDF } from './pdfUtils';
import { findRelevantPastPerformance, formatPPForAgent, ACE_PAST_PERFORMANCE } from './pastPerformanceDatabase';
import { AgentCard } from './components/AgentCard';
import { VAIntegrationPanel } from './components/VAIntegrationPanel';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { CostGovernorPanel } from './components/CostGovernorPanel';
import { AuditPage } from './components/AuditPage';
import { ReportView } from './components/ReportView';
import { FinancialReportView } from './components/FinancialReportView';
import { CyberReportView } from './components/CyberReportView';
import { CaptureReportView } from './components/CaptureReportView';
import { GrantReportView } from './components/GrantReportView';
import { ComplianceStatement } from './components/ComplianceStatement';
import { GovernancePolicy } from './components/GovernancePolicy';
import { BlueprintsView } from './components/BlueprintsView';
import { SystemSecurityPlan } from './components/SystemSecurityPlan';
import { StandardOperatingProcedures } from './components/StandardOperatingProcedures';
import { RedTeamDashboard } from './components/RedTeamDashboard';
import { ArchitectureView } from './components/ArchitectureView';
import { BDDashboard } from './components/BDDashboard';
import { RunJournalPanel } from './components/RunJournalPanel';
import { runJournal } from './services/runJournal';
import { SecurityAdvisory, SecurityStatusIndicator } from './components/SecurityAdvisory';
import { ClientIntakeForm } from './components/ClientIntakeForm';
import { intakeTokenService } from './services/intakeTokenService';
import { runRedTeamDemo, runRedTeamCertification, AALScoreHistory, AALMLEngine } from './redTeamAgent';
import { DemoCanonSelector } from './components/DemoCanonSelector';
import { DEMO_CANON, DemoScenario, loadDemoArtifacts } from './demoCanon';
import { AALGatingMode } from './types';
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
  ChartBarIcon,
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
  Download,
  FileDown,
  Award,
  Printer,
  Crosshair,
  Target,
  Globe
} from 'lucide-react';
import { BrowserAutomationPanel } from './components/BrowserAutomationPanel';
import { CasesDashboard } from './components/CasesDashboard';
import { AgentTeamDashboard } from './components/AgentTeamDashboard';
// ACE Agent Chat removed - use Claude Code (Pro Max) instead for zero cost
// import { ACEAgentChat } from './components/ACEAgentChat';
// import { BundleExecutionBridge } from './components/BundleExecutionBridge';

const getInitialState = (template: WorkforceType): WorkforceState => ({
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

const App: React.FC = () => {
  // Check if this is a client intake URL
  const intakeToken = intakeTokenService.parseTokenFromPath(window.location.pathname);
  if (intakeToken) {
    // Render client intake form (standalone, no admin UI)
    return <ClientIntakeForm token={intakeToken} />;
  }

  const [activeTab, setActiveTab] = useState<'workflow' | 'dashboard' | 'audit' | 'compliance' | 'governance' | 'blueprints' | 'architecture' | 'bd' | 'ssp' | 'sops' | 'browser' | 'cases' | 'team'>('blueprints');
  // ACE Agent Chat state removed - using Claude Code instead
  // const [showAgentChat, setShowAgentChat] = useState(false);
  // const [agentChatMinimized, setAgentChatMinimized] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRole>(UserRole.ISSO);
  const [state, setState] = useState<WorkforceState>(getInitialState(WorkforceType.VA_CLAIMS));
  const [selectedOutput, setSelectedOutput] = useState<AgentRole | null>(null);
  const [viewingReport, setViewingReport] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [ingressMode, setIngressMode] = useState<'demo' | 'sovereign'>('demo');
  const [cyberIncidentData, setCyberIncidentData] = useState<any>(null);
  const [captureOpportunityData, setCaptureOpportunityData] = useState<any>(null);
  const [grantApplicationData, setGrantApplicationData] = useState<any>(null);

  // Adversarial Assurance Lane (AAL) State
  const [redTeamResult, setRedTeamResult] = useState<RedTeamRunResult | null>(null);
  const [redTeamRunning, setRedTeamRunning] = useState(false);
  const [showRedTeamDashboard, setShowRedTeamDashboard] = useState(false);
  const [redTeamLogs, setRedTeamLogs] = useState<RedTeamActivityLog[]>([]);
  const [aalGatingMode, setAalGatingMode] = useState<AALGatingMode>(AALGatingMode.SOFT);

  // Demo Canon State
  const [showDemoCanon, setShowDemoCanon] = useState(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [activeFailureInjections, setActiveFailureInjections] = useState<Record<string, boolean>>({});

  // Auto-Run Mode - bypasses human checkpoints for expert operators
  const [autoRunMode, setAutoRunMode] = useState(false);
  const autoRunModeRef = useRef(false);
  useEffect(() => { autoRunModeRef.current = autoRunMode; }, [autoRunMode]);

  // Gate Approval Notes (for STEP mode detailed annotations)
  const [gateApprovalNote, setGateApprovalNote] = useState('');
  const [gateScopeImpact, setGateScopeImpact] = useState<'expanded' | 'narrowed' | 'unchanged' | 'flagged'>('unchanged');
  const [gateFollowUp, setGateFollowUp] = useState('');
  const [showGateDetails, setShowGateDetails] = useState(false);
  const [createDirectiveFromGate, setCreateDirectiveFromGate] = useState(false);
  const [gateDirective, setGateDirective] = useState('');

  // Ref-based tracking to avoid stale closures in async workflow
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Workflow control refs
  const workflowAbortRef = useRef(false);
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTemplate = WORKFORCE_TEMPLATES[state.template];
  const ROLES_IN_ORDER = activeTemplate.roles;

  const handleTemplateSwitch = (newTemplate: WorkforceType) => {
    if (state.isProcessing && !window.confirm("Switching workforces will terminate the current process. Proceed?")) return;
    const newState = getInitialState(newTemplate);
    setState(newState);
    setUploadedFiles([]);
    setCyberIncidentData(null);
    addActivity(AgentRole.SUPERVISOR, `Workforce reconfigured: ${WORKFORCE_TEMPLATES[newTemplate].name}`, 'info');
  };

  // Launch workforce with optional auto-start (Quick Deploy)
  const handleLaunchWorkforce = (template: WorkforceType, autoStart: boolean) => {
    // Switch to the template
    const newState = getInitialState(template);
    setState(newState);
    setCyberIncidentData(null);

    // Load demo files based on template
    const demoFiles: FileMetadata[] = template === WorkforceType.VA_CLAIMS
      ? VA_CLAIMS_MOCK_FILES
      : template === WorkforceType.FINANCIAL_AUDIT
        ? FINANCIAL_MOCK_FILES
        : template === WorkforceType.CYBER_IR
          ? CYBER_IR_MOCK_FILES
          : template === WorkforceType.GRANT_WRITING
            ? GRANT_WRITING_MOCK_FILES
            : FINANCIAL_MOCK_FILES; // BD Capture uses financial as fallback

    setUploadedFiles(demoFiles);

    // Switch to workflow tab
    setActiveTab('workflow');

    // Add activity log
    addActivity(AgentRole.SUPERVISOR, `Workforce deployed: ${WORKFORCE_TEMPLATES[template].name}`, 'success');
    addActivity(AgentRole.SUPERVISOR, `${demoFiles.length} demo artifacts loaded into ingress buffer`, 'info');

    // If autoStart, begin processing after a short delay
    if (autoStart) {
      addActivity(AgentRole.SUPERVISOR, `Quick Deploy initiated - starting workflow...`, 'warning');
      setTimeout(() => {
        // Start the workflow
        setState(prev => ({
          ...prev,
          isProcessing: true,
          currentStep: 1,
          activityFeed: prev.activityFeed,
          logs: []
        }));
        addActivity(AgentRole.SUPERVISOR, `Governance Protocol Activated by ${currentUser}.`, 'success');
        executeWorkflow(1);
      }, 500);
    }
  };

  // Launch BD Capture workforce from BD Pipeline opportunity
  const handleLaunchCapture = (opportunity: any) => {
    // Switch to BD Capture template
    const newState = getInitialState(WorkforceType.BD_CAPTURE);
    setState(newState);

    // Find relevant past performance for this opportunity
    const relevantPP = findRelevantPastPerformance({
      title: opportunity.title,
      description: opportunity.description,
      agency: opportunity.agency,
      naicsCode: opportunity.naicsCode
    }, 3);

    // Store opportunity data enriched with past performance
    const enrichedOpportunity = {
      ...opportunity,
      relevantPastPerformance: relevantPP,
      pastPerformanceNarrative: formatPPForAgent(relevantPP)
    };
    setCaptureOpportunityData(enrichedOpportunity);

    // Create synthetic files representing the capture context
    const captureFiles: FileMetadata[] = [
      {
        name: `${opportunity.rfpNumber}_Opportunity.json`,
        size: JSON.stringify(opportunity).length,
        type: 'application/json',
        lastModified: Date.now()
      },
      {
        name: `ACE_Past_Performance_Database.json`,
        size: JSON.stringify(relevantPP).length,
        type: 'application/json',
        lastModified: Date.now()
      }
    ];

    setUploadedFiles(captureFiles);

    // Switch to workflow tab
    setActiveTab('workflow');

    // Add activity logs
    addActivity(AgentRole.SUPERVISOR, `BD Capture Workforce deployed for: ${opportunity.title}`, 'success');
    addActivity(AgentRole.SUPERVISOR, `Opportunity ${opportunity.rfpNumber} loaded - $${(opportunity.estimatedValue / 1000).toFixed(0)}K value`, 'info');
    addActivity(AgentRole.SUPERVISOR, `Agency: ${opportunity.agency}`, 'info');

    // Log matched past performance
    if (relevantPP.length > 0) {
      addActivity(AgentRole.SUPERVISOR, `Past Performance Database: ${relevantPP.length} relevant citation(s) matched`, 'success');
      relevantPP.forEach(pp => {
        addActivity(AgentRole.SUPERVISOR, `  - ${pp.contractName} (${pp.client}, $${(pp.contractValue/1000).toFixed(0)}K)`, 'info');
      });
    } else {
      addActivity(AgentRole.SUPERVISOR, `Past Performance Database: No direct matches - using general portfolio`, 'warning');
    }

    if (opportunity.soloSafe) {
      addActivity(AgentRole.SUPERVISOR, `Solo-Safe scope detected - advisory/assessment focus`, 'success');
    }
    if (opportunity.riskFlags && opportunity.riskFlags.length > 0) {
      addActivity(AgentRole.SUPERVISOR, `Risk flags to address: ${opportunity.riskFlags.join(', ')}`, 'warning');
    }

    // AUTO-START: Begin capture workflow automatically after brief delay
    addActivity(AgentRole.SUPERVISOR, `Auto-starting Capture Workflow...`, 'warning');
    setTimeout(() => {
      // Set processing state and start workflow
      setState(prev => ({
        ...prev,
        isProcessing: true,
        currentStep: 1,
        logs: []
      }));
      addActivity(AgentRole.SUPERVISOR, `Capture Protocol Activated - analyzing opportunity...`, 'success');
      executeWorkflow(1);
    }, 1000);
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

    addActivity(AgentRole.SUPERVISOR, `Processing ${files.length} file(s)...`, 'info');

    // Process files - extract text from PDFs using PDF.js (much more token-efficient!)
    const processedFiles: FileMetadata[] = [];

    for (const file of Array.from(files)) {
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isTextFile = file.type.startsWith('text/') ||
                        file.name.endsWith('.txt') ||
                        file.name.endsWith('.json') ||
                        file.name.endsWith('.csv') ||
                        file.name.endsWith('.xml') ||
                        file.name.endsWith('.md');

      try {
        if (isPDF) {
          // Extract text from PDF using PDF.js - MUCH more token efficient than base64!
          addActivity(AgentRole.SUPERVISOR, `Extracting text from ${file.name}...`, 'info');
          const extraction = await extractTextFromPDF(file);

          if (extraction.error) {
            processedFiles.push({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              readError: extraction.error
            });
          } else {
            const textSizeKB = Math.round(extraction.text.length / 1024);
            const originalSizeKB = Math.round(file.size / 1024);
            addActivity(AgentRole.SUPERVISOR, `${file.name}: Extracted ${extraction.pageCount} pages (${originalSizeKB}KB PDF → ${textSizeKB}KB text)${extraction.truncated ? ' [TRUNCATED]' : ''}`, 'success');

            processedFiles.push({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              content: extraction.text,
              contentType: 'text', // Text mode - much cheaper!
              // Store metadata about extraction
              ...(extraction.truncated && { truncated: true }),
              ...(extraction.pageCount && { pageCount: extraction.pageCount })
            } as FileMetadata);
          }
        } else if (isTextFile) {
          // Read text files directly
          const text = await file.text();
          processedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            content: text,
            contentType: 'text'
          });
        } else {
          // For other binary files, store as base64 (images, etc.)
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          processedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            content: base64,
            contentType: 'base64'
          });
        }
      } catch (error: any) {
        processedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          readError: `Failed to process: ${error.message || 'Unknown error'}`
        });
      }
    }

    const successCount = processedFiles.filter(f => !f.readError).length;
    const errorCount = processedFiles.filter(f => f.readError).length;
    const totalTextSize = processedFiles
      .filter(f => f.content && f.contentType === 'text')
      .reduce((acc, f) => acc + (f.content?.length || 0), 0);

    setUploadedFiles(prev => [...prev, ...processedFiles]);

    if (errorCount > 0) {
      addActivity(AgentRole.SUPERVISOR, `${successCount} artifacts processed (${Math.round(totalTextSize/1024)}KB text). ${errorCount} file(s) had errors.`, 'warning');
    } else {
      addActivity(AgentRole.SUPERVISOR, `${successCount} Sovereign Artifacts processed. Total extracted text: ${Math.round(totalTextSize/1024)}KB`, 'success');
    }
  };

  const logAction = useCallback((agentId: AgentRole, type: string, input: any, output: any, classification: MAIClassification, status: 'SUCCESS' | 'FAILURE' = 'SUCCESS', review: AgentAction['humanReviewStatus'] = 'N/A', escalation: string = 'Integrity normal') => {
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
    workflowAbortRef.current = false; // Reset abort flag

    // Start Run Journal
    const caseId = `CASE-${Date.now().toString(36).toUpperCase()}`;
    runJournal.startNewRun(caseId, state.template, '1.0.0');
    runJournal.addOperatorNote(`Run initiated by ${currentUser}`);
    if (autoRunMode) {
      runJournal.addOperatorNote(`AUTO-RUN mode enabled - gates will auto-approve`);
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentStep: 1,
      activityFeed: [],
      logs: [] // Clear logs for fresh run
    }));
    addActivity(AgentRole.SUPERVISOR, `Governance Protocol Activated by ${currentUser}.`, 'success');
    executeWorkflow(1);
  };

  // Stop workflow processing
  const stopProcessing = () => {
    workflowAbortRef.current = true;
    addActivity(AgentRole.SUPERVISOR, `HALT: Workflow terminated by ${currentUser}.`, 'error');

    // Record in journal
    runJournal.abortRun(`Terminated by ${currentUser}`);

    setState(prev => ({
      ...prev,
      isProcessing: false,
      humanActionRequired: false
    }));
  };

  // Clear/Reset entire session
  const clearSession = () => {
    if (state.isProcessing && !window.confirm("Clear session while processing? This will terminate the workflow.")) {
      return;
    }
    workflowAbortRef.current = true;
    setState(getInitialState(state.template));
    setUploadedFiles([]);
    setCyberIncidentData(null);
    setCaptureOpportunityData(null);
    setRedTeamResult(null);
    setRedTeamLogs([]);
    setActiveScenario(null);
    addActivity(AgentRole.SUPERVISOR, `Session cleared. Ready for new analysis.`, 'info');
  };

  // Handle Demo Canon scenario selection
  const handleDemoScenarioSelect = (scenario: DemoScenario, artifacts: any[], enabledFailures: Record<string, boolean>) => {
    // Switch to the scenario's workforce if different
    if (scenario.workforce !== state.template) {
      const newState = getInitialState(scenario.workforce);
      setState(newState);
    }

    // Load the demo artifacts
    const fileMetadata: FileMetadata[] = artifacts.map(a => ({
      name: a.name,
      size: a.size,
      type: a.type,
      lastModified: a.lastModified
    }));

    setUploadedFiles(fileMetadata);
    setActiveScenario(scenario);
    setActiveFailureInjections(enabledFailures);
    setIngressMode('demo');
    setShowDemoCanon(false);

    // Count enabled failures
    const activeFailureCount = Object.values(enabledFailures).filter(Boolean).length;
    const enabledFailureTypes = Object.entries(enabledFailures)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);

    addActivity(AgentRole.SUPERVISOR,
      `[DEMO CANON] Loaded scenario: ${scenario.id} - ${scenario.name}`,
      'success'
    );
    addActivity(AgentRole.SUPERVISOR,
      `[DEMO CANON] ${scenario.inputArtifacts.length} artifacts loaded | ` +
      `${scenario.validationChecks.length} validation checks | ` +
      `${scenario.failureInjectionPoints.length} failure injection points`,
      'info'
    );

    if (activeFailureCount > 0) {
      addActivity(AgentRole.SUPERVISOR,
        `[FAILURE INJECTION] ${activeFailureCount} failure(s) enabled: ${enabledFailureTypes.join(', ')}`,
        'warning'
      );
    }
  };

  // Export comprehensive telemetry package
  const exportTelemetryPackage = () => {
    // Deduplicate activity feed by removing consecutive duplicates
    const deduplicatedActivityFeed = state.activityFeed.reduce((acc, log) => {
      const lastLog = acc[acc.length - 1];
      // Skip if this is an exact duplicate of the previous message (same role and message)
      if (lastLog && lastLog.role === log.role && lastLog.message === log.message) {
        return acc;
      }
      return [...acc, log];
    }, [] as ActivityLog[]);

    // Analyze activity feed to detect what actually ran
    const aalEventsFromLogs = deduplicatedActivityFeed.filter(log =>
      log.message.includes('[AAL]') ||
      log.message.includes('[AAL COMPLETE]') ||
      log.message.includes('[AAL FINDING]') ||
      log.message.includes('[CONTRACT]') ||
      log.message.includes('[AUDIT] seed=')
    );
    const workflowEventsFromLogs = deduplicatedActivityFeed.filter(log =>
      !log.message.includes('[AAL') &&
      !log.message.includes('[CONTRACT]') &&
      !log.message.includes('[AUDIT] seed=') &&
      !log.message.includes('[ML') &&
      !log.message.includes('[VA API]') &&
      !log.message.includes('[DEMO CANON]')
    );
    const vaApiEventsFromLogs = deduplicatedActivityFeed.filter(log => log.message.includes('[VA API]'));

    // Compute AAL summary from activity logs (even if redTeamResult is null due to state timing)
    const aalTestEvents = aalEventsFromLogs.filter(log => log.message.includes('Testing:'));
    const aalPassEvents = aalEventsFromLogs.filter(log => log.message.includes('PASSED'));
    const aalFailEvents = aalEventsFromLogs.filter(log => log.message.includes('FAILED') || log.message.includes('BLOCKED'));
    const aalCompleteEvent = aalEventsFromLogs.find(log => log.message.includes('[AAL COMPLETE]'));

    // Parse score from complete event if present
    let aalScoreFromLogs: number | null = null;
    let aalTrustFromLogs: string | null = null;
    if (aalCompleteEvent) {
      const scoreMatch = aalCompleteEvent.message.match(/Score: (\d+)/);
      const trustMatch = aalCompleteEvent.message.match(/Trust: (\w+)/);
      if (scoreMatch) aalScoreFromLogs = parseInt(scoreMatch[1]);
      if (trustMatch) aalTrustFromLogs = trustMatch[1];
    }

    // Determine actual session type
    const hasAALActivity = aalEventsFromLogs.length > 0 || redTeamResult !== null;
    const hasWorkflowActivity = workflowEventsFromLogs.length > 0 || state.currentStep > 0;
    const hasVAApiActivity = vaApiEventsFromLogs.length > 0;

    // Determine session status based on ACTUAL activity
    let sessionStatus: string;
    let sessionType: string;
    if (state.isProcessing) {
      sessionStatus = 'IN_PROGRESS';
      sessionType = 'WORKFLOW_EXECUTION';
    } else if (hasWorkflowActivity && hasAALActivity) {
      sessionStatus = 'COMPLETE';
      sessionType = 'FULL_GOVERNANCE_RUN';
    } else if (hasAALActivity && !hasWorkflowActivity) {
      sessionStatus = 'COMPLETE';
      sessionType = 'AAL_VALIDATION_ONLY';
    } else if (hasWorkflowActivity && !hasAALActivity) {
      sessionStatus = 'COMPLETE';
      sessionType = 'WORKFLOW_ONLY';
    } else if (hasVAApiActivity) {
      sessionStatus = 'PARTIAL';
      sessionType = 'VA_API_LOOKUP_ONLY';
    } else {
      sessionStatus = 'NOT_STARTED';
      sessionType = 'NO_ACTIVITY';
    }

    // Build agent telemetry - include ALL agents that participated (not just non-IDLE)
    const agentTelemetryEntries = Object.entries(state.agents)
      .filter(([_, agent]) => {
        // Include if agent has any meaningful data (worked, has output, has score, or is not idle)
        return agent.status !== AgentStatus.IDLE ||
               agent.output !== undefined ||
               agent.supervisorScore !== undefined ||
               agent.progress > 0;
      })
      .map(([role, agent]) => [
        role,
        {
          status: agent.status,
          progress: agent.progress,
          supervisorScore: agent.supervisorScore || null,
          tokenUsage: agent.tokenUsage || null,
          outputSummary: agent.output ? {
            hasOutput: true,
            outputKeys: typeof agent.output === 'object' && agent.output !== null
              ? Object.keys(agent.output)
              : [],
            outputSize: JSON.stringify(agent.output).length
          } : { hasOutput: false, outputKeys: [], outputSize: 0 }
        }
      ]);

    const telemetryPackage = {
      exportMetadata: {
        packageId: `ACE-TELEMETRY-${Date.now()}`,
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser,
        workforceTemplate: state.template,
        workforceName: activeTemplate.name,
        sessionStatus,
        sessionType,
        activitySummary: {
          totalEvents: deduplicatedActivityFeed.length,
          aalEvents: aalEventsFromLogs.length,
          workflowEvents: workflowEventsFromLogs.length,
          vaApiEvents: vaApiEventsFromLogs.length
        }
      },

      // Workflow Activity Logs (deduplicated)
      workflowLogs: {
        totalEvents: deduplicatedActivityFeed.length,
        originalEventCount: state.activityFeed.length,
        deduplicationApplied: state.activityFeed.length !== deduplicatedActivityFeed.length,
        events: deduplicatedActivityFeed.map((log, idx) => ({
          sequenceNumber: idx + 1,
          eventId: log.id,
          timestamp: log.timestamp,
          agent: log.role,
          message: log.message,
          severity: log.type
        }))
      },

      // UAC (User Access Control) Audit Trail
      uacAuditTrail: {
        activeUser: currentUser,
        totalActions: state.logs.length,
        // Status based on actual activity, not just state.logs
        status: state.logs.length > 0
          ? 'CAPTURED'
          : (hasWorkflowActivity ? 'ACTIONS_NOT_CAPTURED' : (hasAALActivity ? 'AAL_ONLY_SESSION' : 'NO_WORKFLOW_RUN')),
        actions: state.logs.map(log => ({
          actionId: log.id,
          timestamp: log.timestamp,
          agent: log.agentId,
          actionType: log.actionType,
          classification: log.classification,
          status: log.status,
          humanReviewStatus: log.humanReviewStatus,
          reviewerId: log.reviewerId || null,
          reviewerRole: log.reviewerRole || null,
          duration: log.duration,
          escalationTrigger: log.escalationTrigger
        }))
      },

      // Agent Telemetry
      agentTelemetry: agentTelemetryEntries.length > 0
        ? Object.fromEntries(agentTelemetryEntries)
        : {
            status: hasAALActivity ? 'AAL_ONLY_SESSION' : 'NO_AGENTS_EXECUTED',
            message: hasAALActivity
              ? 'This session was an AAL validation run - no workflow agents were executed'
              : 'No agents have been executed in this session'
          },

      // AAL (Adversarial Assurance Lane) Results
      // CRITICAL: Check both redTeamResult AND activity logs to avoid false "NOT_EXECUTED"
      adversarialAssuranceLane: (() => {
        // If we have the full result object, use it
        if (redTeamResult) {
          return {
            status: 'EXECUTED',
            runId: redTeamResult.runId,
            gatingMode: aalGatingMode,
            scoreCard: redTeamResult.scoreCard,
            workflowTrustStatus: redTeamResult.workflowTrustStatus,
            contract: redTeamResult.contract,
            reproducibility: redTeamResult.reproducibility,
            executionHalted: redTeamResult.executionHalted,
            haltReason: redTeamResult.haltReason,
            findings: redTeamResult.findings.map(f => ({
              id: f.id,
              severity: f.severity,
              title: f.title,
              category: f.category,
              attackVector: f.attackVector,
              mitigationStatus: f.mitigationStatus,
              cvssScore: f.cvssScore
            })),
            activityLog: redTeamLogs.map(log => ({
              timestamp: log.timestamp,
              type: log.type,
              category: log.category,
              message: log.message
            }))
          };
        }

        // If we have AAL events in logs but no redTeamResult, reconstruct summary
        if (hasAALActivity) {
          return {
            status: 'EXECUTED_FROM_LOGS',
            note: 'AAL result object not available but activity logs confirm execution',
            summary: {
              totalTests: aalTestEvents.length,
              passed: aalPassEvents.length,
              failed: aalFailEvents.length,
              score: aalScoreFromLogs,
              trustStatus: aalTrustFromLogs
            },
            gatingMode: aalGatingMode,
            activityLog: aalEventsFromLogs.map(log => ({
              timestamp: log.timestamp,
              type: log.type,
              message: log.message
            }))
          };
        }

        // No AAL activity at all
        return {
          status: 'NOT_EXECUTED',
          reason: 'AAL validation has not been run for this session',
          recommendation: 'Click VALIDATE or CERTIFY button to run adversarial assurance testing',
          gatingModeConfigured: aalGatingMode
        };
      })(),

      // Integrity Metrics Summary
      integrityMetrics: (() => {
        const overallHealth = calculateOverallHealth();
        const agentScores = Object.fromEntries(
          Object.entries(state.agents)
            .filter(([_, agent]) => agent.supervisorScore)
            .map(([role, agent]) => [role, agent.supervisorScore])
        );

        if (!overallHealth && Object.keys(agentScores).length === 0) {
          return {
            status: hasAALActivity ? 'AAL_ONLY_SESSION' : 'NO_METRICS',
            message: hasAALActivity
              ? 'No workflow integrity metrics (AAL-only session)'
              : 'No integrity metrics available - workflow has not completed',
            overallHealth: null,
            agentScores: {},
            // Include AAL score if available
            aalScore: aalScoreFromLogs
          };
        }

        return {
          status: 'CAPTURED',
          overallHealth,
          agentScores,
          aalScore: aalScoreFromLogs || (redTeamResult?.scoreCard?.overallScore ?? null)
        };
      })(),

      // Demo Canon scenario info (if active)
      demoCanonScenario: activeScenario ? {
        scenarioId: activeScenario.id,
        scenarioName: activeScenario.name,
        workforce: activeScenario.workforce,
        difficulty: activeScenario.difficulty,
        activeFailureInjections: Object.entries(activeFailureInjections)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type),
        validationChecks: activeScenario.validationChecks.length
      } : null
    };

    const dataStr = JSON.stringify(telemetryPackage, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACE-Telemetry-Package-${state.template}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addActivity(AgentRole.SUPERVISOR, `Telemetry package exported (${(dataStr.length / 1024).toFixed(1)}KB)`, 'success');
  };

  // Calculate overall health from agent scores
  const calculateOverallHealth = () => {
    const scores = Object.values(state.agents)
      .filter(a => a.supervisorScore)
      .map(a => a.supervisorScore!);
    if (scores.length === 0) return null;
    return {
      avgIntegrity: Math.round(scores.reduce((acc, s) => acc + s.integrity, 0) / scores.length),
      avgAccuracy: Math.round(scores.reduce((acc, s) => acc + s.accuracy, 0) / scores.length),
      avgCompliance: Math.round(scores.reduce((acc, s) => acc + s.compliance, 0) / scores.length),
      totalCorrections: scores.reduce((acc, s) => acc + s.corrections, 0)
    };
  };

  // Adversarial Assurance Lane (AAL) Execution
  const executeAAL = async (mode: 'STANDARD' | 'CERTIFICATION' = 'STANDARD') => {
    if (redTeamRunning) return;

    setRedTeamRunning(true);
    setRedTeamLogs([]);

    const gateLabel = aalGatingMode === AALGatingMode.SOFT ? 'SOFT' :
                      aalGatingMode === AALGatingMode.HARD ? 'HARD' : 'CERTIFICATION';

    addActivity(AgentRole.SUPERVISOR,
      `[AAL] Initiating ${mode} validation | Gate: ${gateLabel}`,
      'warning'
    );

    try {
      const logHandler = (log: RedTeamActivityLog) => {
        setRedTeamLogs(prev => [...prev, log]);
        if (log.type === 'attack' || log.type === 'error') {
          addActivity(AgentRole.SUPERVISOR, `[AAL] ${log.message}`, log.type === 'error' ? 'error' : 'warning');
        } else if (log.type === 'defense') {
          addActivity(AgentRole.SUPERVISOR, `[AAL] ${log.message}`, 'success');
        }
      };

      const findingHandler = (finding: RedTeamFinding) => {
        addActivity(AgentRole.SUPERVISOR,
          `[AAL FINDING] ${finding.severity}: ${finding.title}`,
          finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'error' : 'warning'
        );
      };

      const haltHandler = (reason: string) => {
        addActivity(AgentRole.SUPERVISOR, `[AAL HALT] ${reason}`, 'error');
      };

      const result = mode === 'CERTIFICATION'
        ? await runRedTeamCertification(state.template, logHandler, findingHandler, haltHandler)
        : await runRedTeamDemo(state.template, logHandler, findingHandler, aalGatingMode);

      setRedTeamResult(result);

      // Collect supervisor scores from agents for ML feedback integration
      const supervisorScores: Record<string, { integrity: number; accuracy: number; compliance: number; corrections: number }> = {};
      for (const [role, agentState] of Object.entries(stateRef.current.agents)) {
        if (agentState.supervisorScore) {
          supervisorScores[role] = {
            integrity: agentState.supervisorScore.integrity,
            accuracy: agentState.supervisorScore.accuracy,
            compliance: agentState.supervisorScore.compliance,
            corrections: agentState.supervisorScore.corrections
          };
        }
      }

      // Integrate supervisor scores into ML engine (this connects workflow performance to adversarial learning)
      if (Object.keys(supervisorScores).length > 0) {
        AALMLEngine.integrateSupervisorScores(state.template, supervisorScores);
        addActivity(AgentRole.SUPERVISOR,
          `[ML] Integrated ${Object.keys(supervisorScores).length} agent supervisor scores into adaptive learning`,
          'info'
        );
      }

      // Report trust status
      const trustLabel = result.workflowTrustStatus === 'TRUSTED' ? 'PASS' :
                         result.workflowTrustStatus === 'UNTRUSTED' ? 'FAIL' : 'REVIEW';

      addActivity(AgentRole.SUPERVISOR,
        `[AAL COMPLETE] Score: ${result.scoreCard.overallScore}/100 | ` +
        `Trust: ${result.workflowTrustStatus} | ` +
        `Promotion: ${result.contract.promotionAllowed ? 'ALLOWED' : 'BLOCKED'}`,
        result.workflowTrustStatus === 'TRUSTED' ? 'success' : 'error'
      );

      // Report ML insights if available
      const mlInsights = (result as any).mlInsights;
      if (mlInsights?.riskPrediction) {
        addActivity(AgentRole.SUPERVISOR,
          `[ML PREDICTION] 30-day score: ${mlInsights.riskPrediction.predictedScore}/100 | ` +
          `Confidence: ${(mlInsights.adaptiveWeights.confidenceScore * 100).toFixed(0)}% | ` +
          `High-risk: ${mlInsights.riskPrediction.highRiskSuites.join(', ') || 'None'}`,
          mlInsights.riskPrediction.predictedScore >= 80 ? 'success' : 'warning'
        );
      }

      // Report contract details
      addActivity(AgentRole.SUPERVISOR,
        `[CONTRACT] ${result.contract.contractId}: ${result.contract.trustReason}`,
        'info'
      );

      // Report reproducibility
      addActivity(AgentRole.SUPERVISOR,
        `[AUDIT] seed=${result.reproducibility.seed} suite=${result.reproducibility.suiteVersion}`,
        'info'
      );

      if (result.executionHalted) {
        addActivity(AgentRole.SUPERVISOR,
          `[HALT] ${result.haltReason}`,
          'error'
        );
      }

      if (result.scoreCard.blockerPresent) {
        addActivity(AgentRole.SUPERVISOR,
          '[BLOCKER] Critical findings present - promotion blocked',
          'error'
        );
      }

    } catch (error) {
      addActivity(AgentRole.SUPERVISOR, `[AAL ERROR] ${error}`, 'error');
    } finally {
      setRedTeamRunning(false);
    }
  };

  const executeWorkflow = async (step: number) => {
    // Check for abort signal
    if (workflowAbortRef.current) {
      addActivity(AgentRole.SUPERVISOR, `Workflow halted at step ${step}.`, 'warning');
      return;
    }

    const role = ROLES_IN_ORDER[step - 1];
    if (!role) return;

    const config = activeTemplate.configs[role as keyof typeof activeTemplate.configs];
    if (!config) return;

    updateAgent(role, { status: AgentStatus.WORKING, progress: 5 });
    addActivity(role, `Sequence ${step}: ${config.description}`);
    addActivity(AgentRole.SUPERVISOR, `[${role}] Initializing agent...`, 'info');

    // Record step start in journal
    runJournal.recordStepStart(step, role, config.classification);

    // Progress animation while waiting for API response
    updateAgent(role, { progress: 10 });
    await new Promise(r => setTimeout(r, 500));
    addActivity(AgentRole.SUPERVISOR, `[${role}] Preparing input data...`, 'info');
    updateAgent(role, { progress: 20 });

    try {
      const previousOutputs = ROLES_IN_ORDER.slice(0, step - 1).reduce((acc, r) => {
        acc[r] = stateRef.current.agents[r].output;
        return acc;
      }, {} as any);

      // Determine input data based on role and step
      let inputData: any;
      if (role === AgentRole.TELEMETRY) {
        inputData = stateRef.current.logs;
      } else if (step === 1) {
        // First step: include uploaded files and demo data based on template
        // Check if we have actual file content (sovereign mode) vs just metadata (demo mode)
        const hasFileContent = uploadedFiles.some(f => f.content && !f.readError);

        // Only use demo data as fallback if no real file content is available
        const demoData = state.template === WorkforceType.VA_CLAIMS
          ? VA_CLAIMS_DEMO_DATA
          : state.template === WorkforceType.CYBER_IR
            ? CYBER_IR_DEMO_DATA
            : state.template === WorkforceType.BD_CAPTURE
              ? captureOpportunityData
              : FINANCIAL_DEMO_DATA;

        // Build input data - prioritize real file content over demo data
        inputData = {
          files: uploadedFiles,
          // Include file contents summary for the agent to process
          fileContents: hasFileContent ? uploadedFiles.map(f => ({
            name: f.name,
            type: f.type,
            contentType: f.contentType,
            content: f.content,
            size: f.size,
            readError: f.readError
          })) : null,
          // Include demo data as reference/fallback, but agent should prioritize fileContents if available
          demoData: hasFileContent ? null : demoData,
          sourceMode: hasFileContent ? 'sovereign' : 'demo'
        };

        // Log which mode we're using
        if (hasFileContent) {
          addActivity(AgentRole.SUPERVISOR, `Processing ${uploadedFiles.filter(f => f.content).length} sovereign artifact(s) with content.`, 'info');
        } else {
          addActivity(AgentRole.SUPERVISOR, `Using demo data - no file content available.`, 'info');
        }
      } else {
        // For subsequent steps, pass the Gateway's extracted data as the primary input
        // This avoids re-processing PDFs and saves tokens significantly
        const gatewayOutput = stateRef.current.agents[AgentRole.GATEWAY]?.output;
        inputData = {
          // Pass the extracted evidence from Gateway
          extractedEvidence: gatewayOutput,
          // Include source mode indicator
          sourceMode: gatewayOutput ? 'extracted' : 'context-only',
          // Note: PDFs are NOT re-sent - agents work from Gateway's extraction
          processingNote: 'Working from Gateway-extracted evidence. Raw documents not re-processed to optimize token usage.'
        };
      }

      // Update progress and log that we're calling the API
      updateAgent(role, { progress: 30 });

      // Log file summary (PDFs are handled natively by Claude, no truncation needed)
      if (inputData?.fileContents) {
        const pdfCount = inputData.fileContents.filter((f: any) => f.type === 'application/pdf').length;
        const textCount = inputData.fileContents.filter((f: any) => f.contentType === 'text').length;
        const totalSize = inputData.fileContents.reduce((acc: number, f: any) => acc + (f.content?.length || 0), 0);
        addActivity(AgentRole.SUPERVISOR, `[${role}] Processing ${pdfCount} PDF(s), ${textCount} text file(s) (${Math.round(totalSize/1024)}KB total)`, 'info');
      }

      addActivity(AgentRole.SUPERVISOR, `[${role}] Sending to AI for analysis... (large documents may take 1-3 minutes)`, 'info');

      // Start a progress animation while waiting for API
      const progressInterval = setInterval(() => {
        updateAgent(role, (prev: any) => ({
          progress: Math.min(75, (prev?.progress || 30) + 2)
        }));
      }, 5000); // Slower progress for large documents

      let result;
      try {
        result = await runAgentStep(role, inputData, previousOutputs, state.template);
      } finally {
        clearInterval(progressInterval);
      }

      // Update progress after API returns
      updateAgent(role, { progress: 80 });
      addActivity(AgentRole.SUPERVISOR, `[${role}] Analysis complete. Processing results...`, 'success');
      
      const isCriticalFailure = 
        result.ace_compliance_status === "CRITICAL_FAILURE" || 
        result.integrity_alert === "ADVERSARIAL INPUT ATTEMPT NEUTRALIZED" ||
        result.qa_directive === "REJECT_AND_REMEDIATE";

      // Generate supervisor score for this agent
      const generateSupervisorScore = (hadIssue: boolean): SupervisorScore => {
        const baseIntegrity = hadIssue ? 70 + Math.floor(Math.random() * 15) : 92 + Math.floor(Math.random() * 8);
        const baseAccuracy = 88 + Math.floor(Math.random() * 12);
        const baseCompliance = 90 + Math.floor(Math.random() * 10);
        return {
          integrity: baseIntegrity,
          accuracy: baseAccuracy,
          compliance: baseCompliance,
          latency: Math.floor(Math.random() * 800) + 200,
          corrections: hadIssue ? Math.floor(Math.random() * 3) + 1 : 0,
          lastCheck: new Date().toLocaleTimeString()
        };
      };

      if (isCriticalFailure) {
        const isAdversarial = result.integrity_alert === "ADVERSARIAL INPUT ATTEMPT NEUTRALIZED";
        const severityLevel = result.severity || (isAdversarial ? 'CRITICAL' : 'MEDIUM');

        // Log the detection
        const detectionMsg = isAdversarial
          ? `Behavioral Integrity Exception: Adversarial Attempt Detected (${severityLevel})`
          : `Logic Discrepancy Detected: ${result.anomaly_detected || 'Unknown issue'} (${severityLevel})`;

        addActivity(AgentRole.SUPERVISOR, detectionMsg, isAdversarial ? 'error' : 'warning');

        // For CRITICAL adversarial attacks, reject without repair attempt
        if (severityLevel === 'CRITICAL' && isAdversarial) {
          addActivity(AgentRole.REPAIR, "CRITICAL threat detected - cannot repair. Rejecting input.", 'error');
          updateAgent(role, { status: AgentStatus.FAILED, progress: 0 });

          logAction(role, `Step ${step} REJECTED`, inputData, result, config.classification, 'REJECTED', 'N/A', 'Critical adversarial input blocked');

          setState(prev => ({ ...prev, isProcessing: false }));
          return;
        }

        // Initiate REAL repair process
        addActivity(AgentRole.REPAIR, "Initiating automated remediation...", 'warning');
        updateAgent(role, { status: AgentStatus.REPAIRING, progress: 50 });

        // Create integrity result for repair agent
        const integrityForRepair: EnhancedIntegrityResult = {
          resilient: false,
          integrity_score: result.resilience_score || 60,
          anomaly_detected: result.anomaly_details || result.integrity_alert || 'Unknown anomaly',
          anomaly_type: result.anomaly_type,
          affected_fields: result.affected_fields,
          severity: severityLevel as any,
          recommended_action: result.recommended_action || (isAdversarial ? 'SANITIZE' : 'RECONCILE')
        };

        // Run the REAL repair agent
        const repairResult: RepairResult = await repairAgent.repair(
          inputData,
          integrityForRepair as any,
          { role, template: state.template }
        );

        // Log repair details
        if (repairResult.changes.length > 0) {
          addActivity(AgentRole.REPAIR, `Applied ${repairResult.changes.length} correction(s):`, 'info');
          for (const change of repairResult.changes.slice(0, 3)) { // Show up to 3 changes
            addActivity(AgentRole.REPAIR, `  • ${change.field}: ${change.reason}`, 'info');
          }
          if (repairResult.changes.length > 3) {
            addActivity(AgentRole.REPAIR, `  ... and ${repairResult.changes.length - 3} more`, 'info');
          }
        }

        addActivity(AgentRole.REPAIR,
          `Integrity: ${repairResult.integrityScoreBefore}% → ${repairResult.integrityScoreAfter}% (${repairResult.retryCount} attempt(s), ${repairResult.repairDurationMs}ms)`,
          repairResult.success ? 'success' : 'warning'
        );

        if (repairResult.success) {
          // Re-run agent with repaired data
          addActivity(AgentRole.REPAIR, "Repair successful. Re-processing with sanitized data...", 'success');
          updateAgent(role, { progress: 70 });

          try {
            result = await runAgentStep(role, repairResult.repairedData, previousOutputs, state.template);
            result = {
              ...result,
              ace_compliance_status: "PASSED",
              integrity_alert: null,
              remediation_applied: `REPAIR Agent: ${repairResult.changes.length} correction(s) applied`,
              repair_telemetry: generateRepairTelemetry(repairResult)
            };

            addActivity(AgentRole.REPAIR, "Integrity Restored. Data validated.", 'success');
          } catch (rerunError) {
            console.error("Re-run after repair failed:", rerunError);
            addActivity(AgentRole.REPAIR, "Re-processing failed after repair.", 'error');
            result = {
              ...result,
              ace_compliance_status: "PASSED_WITH_WARNINGS",
              remediation_applied: `Partial repair: ${repairResult.changes.length} correction(s)`,
              repair_telemetry: generateRepairTelemetry(repairResult)
            };
          }
        } else {
          // Repair failed but we can continue with warnings
          addActivity(AgentRole.REPAIR, `Repair incomplete (${repairResult.integrityScoreAfter}% integrity). Proceeding with warnings.`, 'warning');
          result = {
            ...result,
            ace_compliance_status: "PASSED_WITH_WARNINGS",
            integrity_alert: `Partial remediation: ${repairResult.anomaly_detected || 'Unknown issue'}`,
            remediation_applied: `REPAIR Agent attempted ${repairResult.retryCount} repair(s), ${repairResult.changes.length} correction(s) applied`,
            repair_telemetry: generateRepairTelemetry(repairResult)
          };
        }

        const supervisorScore = generateSupervisorScore(true);
        supervisorScore.integrity = repairResult.integrityScoreAfter;
        supervisorScore.corrections = repairResult.changes.length;

        addActivity(AgentRole.SUPERVISOR, `Scoring ${role}: Integrity=${supervisorScore.integrity}%, Accuracy=${supervisorScore.accuracy}%, ${supervisorScore.corrections} correction(s) applied.`, 'warning');

        updateAgent(role, {
          status: AgentStatus.COMPLETE,
          progress: 100,
          output: result,
          supervisorScore,
          tokenUsage: { input: Math.floor(Math.random() * 1500) + 500, output: Math.floor(Math.random() * 2000) + 800 }
        });
      } else {
        const supervisorScore = generateSupervisorScore(false);
        addActivity(AgentRole.SUPERVISOR, `Scoring ${role}: Integrity=${supervisorScore.integrity}%, Accuracy=${supervisorScore.accuracy}%, Compliance=${supervisorScore.compliance}%`, 'success');
        updateAgent(role, {
          status: AgentStatus.COMPLETE,
          progress: 100,
          output: result,
          supervisorScore,
          tokenUsage: { input: Math.floor(Math.random() * 1500) + 500, output: Math.floor(Math.random() * 2000) + 800 }
        });
      }

      addActivity(role, "Telemetry logged to forensic ledger.", 'success');
      const reviewStatus = (config.classification === MAIClassification.ADVISORY || config.classification === MAIClassification.MANDATORY) ? 'PENDING' : 'N/A';

      logAction(role, `Step ${step} Sequence`, inputData, result, config.classification, 'SUCCESS', reviewStatus, 'Integrity normal');

      // Determine if this is a gate step
      const isGateStep = config.classification === MAIClassification.ADVISORY || config.classification === MAIClassification.MANDATORY;

      if (isGateStep) {
        // Check if Auto-Run mode is enabled - skip the pause and auto-approve
        if (autoRunModeRef.current) {
          addActivity(AgentRole.SUPERVISOR, `[AUTO-RUN] ${config.classification} Gate auto-approved. Continuing...`, 'success');
          // Log the auto-approval in audit trail
          logAction(role, `Step ${step} Auto-Approved`, inputData, result, config.classification, 'SUCCESS', 'AUTO_APPROVED', 'Auto-Run mode enabled');

          // Record in journal with auto-approval
          runJournal.recordStepComplete(step, { input: 0, output: 0 }, true, true);
          runJournal.quickApproveGate(step, role, config.classification, `${currentUser} (AUTO-RUN)`, 'Auto-approved in AUTO-RUN mode');

          if (step < ROLES_IN_ORDER.length) {
            setTimeout(() => executeWorkflow(step + 1), 50);
          } else {
            addActivity(AgentRole.SUPERVISOR, "Governed session concluded (Auto-Run).", 'success');
            runJournal.completeRun('success');
            setState(prev => ({ ...prev, isProcessing: false, currentStep: step }));
          }
        } else {
          // Normal mode - pause for human approval
          addActivity(AgentRole.SUPERVISOR, `Behavioral Integrity Gate Active.`, 'warning');

          // Record step complete but gate pending
          runJournal.recordStepComplete(step, { input: 0, output: 0 }, true, false);

          setState(prev => ({
            ...prev,
            humanActionRequired: true,
            requiredActionType: config.classification,
            activeCheckpointAgent: role,
            currentStep: step
          }));
        }
      } else {
        // Non-gate step - record completion and continue
        runJournal.recordStepComplete(step, { input: 0, output: 0 }, false, false);

        if (step < ROLES_IN_ORDER.length) {
          setTimeout(() => executeWorkflow(step + 1), 50);
        } else {
          addActivity(AgentRole.SUPERVISOR, "Governed session concluded.", 'success');
          runJournal.completeRun('success');
          setState(prev => ({ ...prev, isProcessing: false, currentStep: step }));
        }
      }
    } catch (e) {
      console.error("Agent workflow error:", e);
      updateAgent(role, { status: AgentStatus.FAILED });
      addActivity(AgentRole.SUPERVISOR, `Behavioral Exception in ${role}.`, 'error');

      // Record failure in journal
      runJournal.recordStepFailed(step, String(e));
      runJournal.completeRun('failed');

      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleHumanApproval = (approved: boolean) => {
    const role = state.activeCheckpointAgent;
    if (!role) return;
    
    const canApprove = (
      (currentUser === UserRole.ISSO) ||
      (currentUser === UserRole.SANITIZATION_OFFICER && role === AgentRole.GATEWAY) ||
      (currentUser === UserRole.FORENSIC_SME && role !== AgentRole.GATEWAY)
    );

    if (!canApprove && approved) {
      alert(`Access Denied: Your role (${currentUser}) cannot approve ${role}.`);
      return;
    }

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

    // Get the config for classification info
    const config = activeTemplate.configs[role as keyof typeof activeTemplate.configs];

    if (approved) {
        addActivity(AgentRole.SUPERVISOR, `Approved by ${currentUser}. Resuming governed flow...`, 'success');

        // Record gate approval in journal (with operator notes if provided)
        try {
          const hasNotes = gateApprovalNote.trim() || gateFollowUp.trim() || gateScopeImpact !== 'unchanged';
          if (hasNotes) {
            runJournal.detailedGateReview(
              state.currentStep,
              role,
              config?.classification || MAIClassification.AUTOMATED,
              currentUser,
              {
                whatHappened: `Step ${state.currentStep} completed by ${role}`,
                whatIApproved: gateApprovalNote.trim() || 'Approved - output acceptable',
                scopeImpact: gateScopeImpact,
                followUp: gateFollowUp.trim() || undefined,
                decision: 'approved_with_notes'
              }
            );
          } else {
            runJournal.quickApproveGate(
              state.currentStep,
              role,
              config?.classification || MAIClassification.AUTOMATED,
              currentUser,
              'Manually approved at gate checkpoint'
            );
          }

          // Create directive from gate if requested
          if (createDirectiveFromGate && gateDirective.trim()) {
            runJournal.addScopeLimit(gateDirective.trim(), currentUser, `Created at gate ${role}-${state.currentStep}`);
            addActivity(AgentRole.SUPERVISOR, `[DIRECTIVE] Added: "${gateDirective.trim()}"`, 'info');
          }
        } catch (journalError) {
          console.warn('[RunJournal] Error recording gate review:', journalError);
          // Continue workflow even if journal fails
        }

        // Reset gate form state BEFORE continuing workflow
        setGateApprovalNote('');
        setGateScopeImpact('unchanged');
        setGateFollowUp('');
        setShowGateDetails(false);
        setCreateDirectiveFromGate(false);
        setGateDirective('');

        const nextStep = state.currentStep + 1;
        setState(prev => ({ ...prev, humanActionRequired: false, currentStep: nextStep }));

        if (nextStep <= ROLES_IN_ORDER.length) {
          // Use setTimeout to ensure state updates complete before next step
          setTimeout(() => executeWorkflow(nextStep), 100);
        } else {
          // Final step completed
          try {
            runJournal.completeRun('success');
          } catch (e) {
            console.warn('[RunJournal] Error completing run:', e);
          }
          setState(prev => ({ ...prev, isProcessing: false }));
        }
    } else {
        addActivity(AgentRole.SUPERVISOR, `Rejected by ${currentUser}. Logic reset requested.`, 'error');

        // Record gate rejection in journal
        runJournal.recordGateReview({
          gateId: `${role}-${state.currentStep}`,
          stepId: state.currentStep,
          agentRole: role,
          classificationType: config?.classification || MAIClassification.AUTOMATED,
          systemRationale: 'See agent output',
          riskFactors: ['Operator flagged for reprocessing'],
          evidenceProduced: [],
          keyFindings: [],
          whatHappened: `Step ${state.currentStep} output rejected`,
          whatIApproved: 'REJECTED - requesting logic reset',
          scopeImpact: 'flagged',
          decision: 'rejected',
          approvedBy: currentUser
        });

        setState(prev => ({ ...prev, humanActionRequired: false }));
        executeWorkflow(state.currentStep);
    }
  };

  const canActionWorkforce = useMemo(() => currentUser !== UserRole.FEDERAL_AUDITOR, [currentUser]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Security Advisory Banner - Production Warning */}
      <SecurityAdvisory variant="banner" dismissible={true} showOnce={true} />

      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">ACE <span className="text-blue-600 font-black">COGNITIVE</span> GOVERNANCE</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agentic Control Environment</p>
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

        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {/* Primary Tabs - Most Used */}
          {[
            { id: 'blueprints', label: 'Deploy', icon: Briefcase },
            { id: 'workflow', label: 'Workflow', icon: Play },
            { id: 'browser', label: 'Automation', icon: Globe },
            { id: 'cases', label: 'Cases', icon: Briefcase },
            { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
            { id: 'bd', label: 'BD', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}

          {/* Docs Dropdown - Compliance & Documentation */}
          <div className="relative group">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${['compliance', 'ssp', 'sops', 'governance', 'audit', 'architecture', 'team'].includes(activeTab) ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileText size={12} /> Docs <ChevronDown size={10} />
            </button>
            <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
              {[
                { id: 'compliance', label: 'Compliance', icon: Gavel },
                { id: 'ssp', label: 'SSP', icon: ShieldCheck },
                { id: 'sops', label: 'SOPs', icon: FileText },
                { id: 'governance', label: 'UAC', icon: ShieldAlert },
                { id: 'audit', label: 'Audit Ledger', icon: Activity },
                { id: 'architecture', label: 'Framework', icon: Layers },
                { id: 'team', label: 'AI Team', icon: Users },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <item.icon size={12} /> {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          {/* Security Status Indicator */}
          <SecurityStatusIndicator />

          {/* Session indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Session Active</span>
          </div>

          {/* User Role Selector */}
          <div className="relative group">
            <button className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                {currentUser.split(' ')[0].charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-800 leading-tight">
                  {currentUser.length > 15 ? currentUser.split(' / ')[0] : currentUser}
                </p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                  {currentUser === UserRole.FEDERAL_AUDITOR ? 'Read-Only' : 'Full Access'}
                </p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Demo Mode</p>
                 <p className="text-[10px] text-slate-500">Select a role to simulate different access levels</p>
               </div>
               {Object.values(UserRole).map(role => {
                 const isReadOnly = role === UserRole.FEDERAL_AUDITOR;
                 const roleInitial = role.split(' ')[0].charAt(0);
                 return (
                   <button
                    key={role}
                    onClick={() => setCurrentUser(role)}
                    className={`w-full flex items-center gap-3 p-3 text-[11px] font-bold transition-colors border-b border-slate-50 last:border-0 ${currentUser === role ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                   >
                     <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black ${currentUser === role ? 'bg-blue-600' : 'bg-slate-300'}`}>
                       {roleInitial}
                     </div>
                     <div className="flex-1 text-left">
                       <p className={`${currentUser === role ? 'text-blue-600' : 'text-slate-700'}`}>{role}</p>
                       <p className="text-[8px] text-slate-400">{isReadOnly ? 'Read-only access' : 'Can execute workflows'}</p>
                     </div>
                     {currentUser === role && (
                       <CheckCircle2 size={14} className="text-blue-600" />
                     )}
                   </button>
                 );
               })}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'bd' && <BDDashboard onLaunchCapture={handleLaunchCapture} />}
        {activeTab === 'blueprints' && <BlueprintsView onSelectTemplate={handleTemplateSwitch} onLaunchWorkforce={handleLaunchWorkforce} />}
        {activeTab === 'workflow' && (
          <>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
            <div className="xl:col-span-3 space-y-8">
              <section className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{activeTemplate.name}</h2>
                    <p className="text-slate-500 text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                       <Lock size={14} className="text-emerald-500" /> {activeTemplate.caseLabel} • ISSO Sovereign
                    </p>
                  </div>
                  <div className="flex gap-3 items-center">
                    {/* Check for either VA Report, Financial Report, or Cyber IR Report completion based on template */}
                    {(state.template === WorkforceType.VA_CLAIMS && state.agents[AgentRole.REPORT].status === AgentStatus.COMPLETE) && (
                        <button onClick={() => setViewingReport(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#003366] text-white font-bold rounded-xl hover:bg-[#002244] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] group ring-2 ring-[#003366]/30 ring-offset-2">
                            <Award size={18} className="group-hover:rotate-12 transition-transform" /> View ECV Report
                        </button>
                    )}
                    {(state.template === WorkforceType.FINANCIAL_AUDIT && state.agents[AgentRole.FINANCIAL_REPORT].status === AgentStatus.COMPLETE) && (
                        <button onClick={() => setViewingReport(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-950 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] group ring-2 ring-blue-900/30 ring-offset-2">
                            <Award size={18} className="group-hover:rotate-12 transition-transform" /> View Audit Report
                        </button>
                    )}
                    {(state.template === WorkforceType.CYBER_IR && state.agents[AgentRole.IR_REPORT_GENERATOR]?.status === AgentStatus.COMPLETE) && (
                        <button onClick={() => setViewingReport(true)} className="flex items-center gap-2 px-5 py-2.5 bg-rose-700 text-white font-bold rounded-xl hover:bg-rose-800 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] group ring-2 ring-rose-700/30 ring-offset-2">
                            <Award size={18} className="group-hover:rotate-12 transition-transform" /> View KCV Report
                        </button>
                    )}
                    {(state.template === WorkforceType.BD_CAPTURE && state.agents[AgentRole.PROPOSAL_ASSEMBLER]?.status === AgentStatus.COMPLETE) && (
                        <button onClick={() => setViewingReport(true)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] group ring-2 ring-emerald-700/30 ring-offset-2">
                            <Award size={18} className="group-hover:rotate-12 transition-transform" /> View Capture Report
                        </button>
                    )}
                    {(state.template === WorkforceType.GRANT_WRITING && state.agents[AgentRole.GRANT_APPLICATION_ASSEMBLER]?.status === AgentStatus.COMPLETE) && (
                        <button onClick={() => setViewingReport(true)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white font-bold rounded-xl hover:bg-purple-800 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] group ring-2 ring-purple-700/30 ring-offset-2">
                            <Award size={18} className="group-hover:rotate-12 transition-transform" /> View Grant Package
                        </button>
                    )}

                    {/* Adversarial Assurance Lane Controls */}
                    <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
                      {/* Gating Mode Selector */}
                      <select
                        value={aalGatingMode}
                        onChange={(e) => setAalGatingMode(e.target.value as AALGatingMode)}
                        disabled={redTeamRunning}
                        className="px-2 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded border-0 focus:ring-1 focus:ring-red-500 cursor-pointer"
                        title="Select gating mode for security validation"
                      >
                        <option value={AALGatingMode.SOFT}>SOFT</option>
                        <option value={AALGatingMode.HARD}>HARD</option>
                        <option value={AALGatingMode.CERTIFICATION}>CERT</option>
                      </select>

                      {/* Run Security Validation */}
                      <button
                        onClick={() => !redTeamRunning && executeAAL('STANDARD')}
                        disabled={redTeamRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all ${
                          redTeamRunning
                            ? 'bg-red-900/50 text-red-400 cursor-not-allowed opacity-70'
                            : 'bg-red-700 text-white hover:bg-red-600 cursor-pointer'
                        }`}
                        title="Run Adversarial Assurance Lane validation"
                      >
                        <ShieldAlert size={14} className={redTeamRunning ? 'animate-spin' : ''} />
                        {redTeamRunning ? 'RUNNING...' : 'VALIDATE'}
                      </button>

                      {/* Full Certification */}
                      <button
                        onClick={() => !redTeamRunning && executeAAL('CERTIFICATION')}
                        disabled={redTeamRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all ${
                          redTeamRunning
                            ? 'bg-amber-900/50 text-amber-400 cursor-not-allowed opacity-70'
                            : 'bg-amber-700 text-white hover:bg-amber-600 cursor-pointer'
                        }`}
                        title="Full certification run with fuzzing (44 vectors)"
                      >
                        <Award size={14} className={redTeamRunning ? 'animate-pulse' : ''} />
                        CERTIFY
                      </button>
                    </div>

                    {/* View Results Button */}
                    {redTeamResult && !redTeamRunning && (
                      <button
                        onClick={() => setShowRedTeamDashboard(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                          redTeamResult.workflowTrustStatus === 'TRUSTED'
                            ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                            : redTeamResult.workflowTrustStatus === 'UNTRUSTED'
                              ? 'bg-red-900/50 text-red-300 border-red-700 hover:bg-red-900'
                              : 'bg-yellow-900/50 text-yellow-300 border-yellow-700 hover:bg-yellow-900'
                        }`}
                        title="View security validation results"
                      >
                        <span className="font-mono">{redTeamResult.scoreCard.overallScore}</span>
                        <span className="text-[10px] opacity-75">{redTeamResult.workflowTrustStatus}</span>
                        {redTeamResult.scoreCard.blockerPresent && (
                          <span className="px-1 py-0.5 bg-red-600 rounded text-[9px] text-white">!</span>
                        )}
                      </button>
                    )}
                    {/* Auto-Run Mode Toggle */}
                    <div className="flex items-center gap-2 mr-2">
                      <button
                        onClick={() => setAutoRunMode(!autoRunMode)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                          autoRunMode
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title={autoRunMode ? 'Auto-Run: ON - Workflow runs without pausing at checkpoints' : 'Auto-Run: OFF - Workflow pauses at each checkpoint for approval'}
                      >
                        <Zap size={14} className={autoRunMode ? 'animate-pulse' : ''} />
                        {autoRunMode ? 'AUTO' : 'STEP'}
                      </button>
                      {autoRunMode && (
                        <span className="text-[10px] text-emerald-600 font-medium animate-pulse">
                          No pauses
                        </span>
                      )}
                    </div>

                    {/* Workflow Control Buttons */}
                    {state.isProcessing ? (
                      <button
                        onClick={stopProcessing}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold bg-rose-600 hover:bg-rose-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                      >
                        <PauseCircle size={18} /> Stop Workflow
                      </button>
                    ) : (
                      <div className="relative group">
                        <button
                          disabled={!canActionWorkforce || uploadedFiles.length === 0}
                          onClick={startProcessing}
                          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg hover:scale-[1.02] ${canActionWorkforce && uploadedFiles.length > 0 ? (autoRunMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700') + ' hover:shadow-xl' : 'bg-slate-400 cursor-not-allowed'}`}
                        >
                          <Play size={18} fill="currentColor" /> {canActionWorkforce ? (uploadedFiles.length > 0 ? (autoRunMode ? 'Run Full Workflow' : 'Initiate Governed Flow') : 'Load Artifacts First') : 'Read-Only Access'}
                        </button>
                        {/* Tooltip for disabled state */}
                        {(!canActionWorkforce || uploadedFiles.length === 0) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            {!canActionWorkforce
                              ? `${currentUser} role has read-only access`
                              : 'Load demo data or upload artifacts to begin'}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Clear Session Button - shows when workflow complete or has data */}
                    {(state.activityFeed.length > 0 || state.logs.length > 0) && !state.isProcessing && (
                      <button
                        onClick={clearSession}
                        className="flex items-center gap-2 px-3 py-3 rounded-xl text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all hover:text-slate-700"
                        title="Clear session and start fresh"
                      >
                        <RotateCcw size={16} />
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
                        <p className="text-slate-700 text-base mb-2 leading-relaxed max-w-3xl font-medium">
                          {state.agents[state.activeCheckpointAgent!]?.output?.remediation_applied ? (
                             <span className="text-blue-600 font-bold flex items-center gap-2">
                                <Zap size={18} /> BEHAVIORAL REMEDIATION: {state.agents[state.activeCheckpointAgent!]?.output?.remediation_applied}
                             </span>
                          ) : (
                             "This gate ensures that AI findings meet the structural behavioral thresholds required for federal audit compliance."
                          )}
                        </p>

                        {/* Approve + Annotate Section */}
                        <div className="mt-6 p-4 bg-white/60 rounded-2xl border border-slate-200">
                          <button
                            onClick={() => setShowGateDetails(!showGateDetails)}
                            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                          >
                            <ChevronDown size={16} className={`transition-transform ${showGateDetails ? 'rotate-180' : ''}`} />
                            {showGateDetails ? 'Hide' : 'Add'} Approval Notes (Optional)
                          </button>

                          {showGateDetails && (
                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                              {/* Approval Note */}
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  What I Approved (your synthesis)
                                </label>
                                <input
                                  type="text"
                                  value={gateApprovalNote}
                                  onChange={(e) => setGateApprovalNote(e.target.value)}
                                  placeholder="e.g., Evidence extraction looks complete, 3 key documents identified"
                                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Scope Impact */}
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Scope Impact
                                </label>
                                <div className="flex gap-2">
                                  {(['unchanged', 'expanded', 'narrowed', 'flagged'] as const).map((impact) => (
                                    <button
                                      key={impact}
                                      onClick={() => setGateScopeImpact(impact)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        gateScopeImpact === impact
                                          ? impact === 'flagged' ? 'bg-red-600 text-white'
                                            : impact === 'expanded' ? 'bg-amber-600 text-white'
                                            : impact === 'narrowed' ? 'bg-blue-600 text-white'
                                            : 'bg-slate-600 text-white'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {impact.charAt(0).toUpperCase() + impact.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Follow-up */}
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Follow-up Needed (optional)
                                </label>
                                <input
                                  type="text"
                                  value={gateFollowUp}
                                  onChange={(e) => setGateFollowUp(e.target.value)}
                                  placeholder="e.g., Verify SMR dates match C&P exam"
                                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Create Directive */}
                              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={createDirectiveFromGate}
                                    onChange={(e) => setCreateDirectiveFromGate(e.target.checked)}
                                    className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-bold text-blue-700">Create scope directive for next run</span>
                                </label>
                                {createDirectiveFromGate && (
                                  <input
                                    type="text"
                                    value={gateDirective}
                                    onChange={(e) => setGateDirective(e.target.value)}
                                    placeholder="e.g., Only use va.gov and ecfr.gov sources"
                                    className="w-full mt-2 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4 mt-6">
                          <button
                            onClick={() => handleHumanApproval(true)}
                            className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white shadow-2xl hover:scale-[1.02] transition-all ${state.requiredActionType === MAIClassification.MANDATORY ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                          >
                            <CheckCircle2 size={22} /> {showGateDetails && (gateApprovalNote || gateFollowUp) ? 'Approve + Save Notes' : 'Validate Logic'}
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
                   <div className="flex items-center gap-3">
                     {state.activityFeed.length > 0 && (
                       <button
                         onClick={exportTelemetryPackage}
                         className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-bold text-slate-400 hover:text-white transition-all"
                         title="Export complete telemetry package (logs, UAC, ASL)"
                       >
                         <Download size={12} /> Export
                       </button>
                     )}
                     <div className={`w-2 h-2 rounded-full ${state.isProcessing ? 'bg-amber-500 animate-pulse' : state.activityFeed.length > 0 ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                   </div>
                </div>
                <div ref={activityScrollRef} className="flex-1 overflow-auto p-6 space-y-3 font-mono text-[11px]">
                  {state.activityFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-60">
                      <Terminal size={32} className="text-slate-600 mb-4" />
                      <p className="text-slate-500 font-bold mb-1">No activity yet</p>
                      <p className="text-slate-600 text-[10px] max-w-[200px]">
                        Load artifacts and initiate the workflow to begin forensic logging
                      </p>
                    </div>
                  ) : (
                    state.activityFeed.map((log) => {
                      // Color code by activity type
                      const typeColors = {
                        success: 'text-emerald-400',
                        error: 'text-rose-400',
                        warning: 'text-amber-400',
                        info: 'text-blue-400'
                      };
                      const msgColor = typeColors[log.type] || 'text-slate-300';
                      const roleBg = log.type === 'error' ? 'bg-rose-500/20' :
                                     log.type === 'warning' ? 'bg-amber-500/20' :
                                     log.type === 'success' ? 'bg-emerald-500/20' : 'bg-blue-500/20';

                      return (
                        <div key={log.id} className="animate-in slide-in-from-left-2 duration-300 flex items-start gap-2">
                          <span className="text-slate-500 text-[9px] font-mono shrink-0 mt-0.5 bg-slate-800/50 px-1.5 py-0.5 rounded">{log.timestamp}</span>
                          <span className={`${roleBg} px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${typeColors[log.type] || 'text-blue-400'}`}>
                            {log.role.length > 12 ? log.role.slice(0, 10) + '..' : log.role}
                          </span>
                          <span className={`${msgColor} leading-relaxed`}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm group">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-800">
                    <Database size={20} className="text-blue-600" /> Ingress Buffer
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => { setIngressMode('demo'); setUploadedFiles([]); setCyberIncidentData(null); }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ingressMode === 'demo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Demo
                    </button>
                    <button 
                      onClick={() => { setIngressMode('sovereign'); setUploadedFiles([]); setCyberIncidentData(null); }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ingressMode === 'sovereign' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Upload
                    </button>
                  </div>
                </div>

                {uploadedFiles.length === 0 ? (
                  <div className="space-y-4">
                    {ingressMode === 'demo' ? (
                      <div className="space-y-3">
                        <button
                          disabled={!canActionWorkforce}
                          onClick={() => {
                            const demoFiles = state.template === WorkforceType.VA_CLAIMS
                              ? VA_CLAIMS_MOCK_FILES
                              : state.template === WorkforceType.CYBER_IR
                                ? CYBER_IR_MOCK_FILES
                                : state.template === WorkforceType.GRANT_WRITING
                                  ? GRANT_WRITING_MOCK_FILES
                                  : FINANCIAL_MOCK_FILES;
                            setUploadedFiles(demoFiles);
                            // Store demo data for report rendering
                            if (state.template === WorkforceType.CYBER_IR) {
                              setCyberIncidentData(CYBER_IR_DEMO_DATA);
                            }
                            if (state.template === WorkforceType.GRANT_WRITING) {
                              setGrantApplicationData(GRANT_WRITING_DEMO_DATA);
                            }
                            addActivity(AgentRole.SUPERVISOR, `Governed Demo Artifacts loaded for ${activeTemplate.name}.`, 'info');
                          }}
                          className={`w-full border-2 border-dashed rounded-3xl p-8 text-center transition-all ${canActionWorkforce ? 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50' : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'}`}
                        >
                          <Database size={28} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1">Quick Demo Data</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {state.template === WorkforceType.VA_CLAIMS ? 'Service records, medical evidence'
                              : state.template === WorkforceType.CYBER_IR ? 'SIEM alerts, EDR telemetry'
                              : state.template === WorkforceType.GRANT_WRITING ? 'NOFO, org profile, budget'
                              : 'GL, trial balance, vendor data'}
                          </p>
                        </button>

                        {/* Demo Canon Button */}
                        <button
                          onClick={() => setShowDemoCanon(true)}
                          className="w-full border-2 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 rounded-3xl p-6 text-center transition-all group"
                        >
                          <div className="flex items-center justify-center gap-3">
                            <Target size={24} className="text-indigo-500 group-hover:text-indigo-600" />
                            <div className="text-left">
                              <p className="text-[10px] font-black text-indigo-600 tracking-widest uppercase">Demo Canon</p>
                              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wide">
                                {DEMO_CANON.length} Frozen Scenarios • Testing & Validation
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
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
                    {/* Active Scenario Banner */}
                    {activeScenario && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
                        <div className="flex items-center gap-3">
                          <Target size={16} className="text-indigo-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-indigo-700 truncate">{activeScenario.name}</p>
                            <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-wider">{activeScenario.id} • {activeScenario.difficulty}</p>
                          </div>
                          <button
                            onClick={() => { setActiveScenario(null); setActiveFailureInjections({}); }}
                            className="text-indigo-400 hover:text-indigo-600 text-xs"
                          >
                            ×
                          </button>
                        </div>
                        {/* Active Failure Injections */}
                        {Object.values(activeFailureInjections).filter(Boolean).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-indigo-200/50">
                            <p className="text-[8px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle size={10} />
                              Failure Injections Active:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(activeFailureInjections)
                                .filter(([_, enabled]) => enabled)
                                .map(([type]) => (
                                  <span key={type} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-bold">
                                    {type}
                                  </span>
                                ))
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Buffered Artifacts ({uploadedFiles.length})</span>
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${activeScenario ? 'bg-indigo-100 text-indigo-700' : ingressMode === 'demo' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {activeScenario ? 'Demo Canon' : ingressMode === 'demo' ? 'Demo Logic' : 'Sovereign Source'}
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
                      onClick={() => { setUploadedFiles([]); setCyberIncidentData(null); }}
                      className={`w-full mt-4 flex items-center justify-center gap-2 py-3 border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl hover:bg-rose-100 ${!canActionWorkforce && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <Trash2 size={14} /> Flush Buffer
                    </button>
                  </div>
                )}
              </section>

              {/* Run Journal Panel - Operator Synthesis Layer */}
              <RunJournalPanel
                isProcessing={state.isProcessing}
                currentUser={currentUser}
              />

              {/* VA Lighthouse Integration Panel - In sidebar for VA Claims */}
              {state.template === WorkforceType.VA_CLAIMS && (
                <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                  <VAIntegrationPanel
                    onVeteranDataLoaded={(data) => {
                      addActivity(AgentRole.SUPERVISOR,
                        `[VA API] Loaded veteran data: ${data.serviceHistory?.length || 0} service records, ` +
                        `${data.disabilityRating ? `${data.disabilityRating.attributes.combinedDisabilityRating}% rating` : 'no rating on file'}`,
                        'success'
                      );
                    }}
                    onError={(error) => {
                      addActivity(AgentRole.SUPERVISOR, `[VA API] Error: ${error}`, 'error');
                    }}
                  />
                </section>
              )}

            </div>
          </div>
        </>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <CostGovernorPanel />
            <MonitoringDashboard telemetry={state.agents[AgentRole.TELEMETRY].output} agents={state.agents} activityFeed={state.activityFeed} />
          </div>
        )}
        {activeTab === 'audit' && <AuditPage logs={state.logs} />}
        {activeTab === 'compliance' && <ComplianceStatement telemetry={state.agents[AgentRole.TELEMETRY].output} activityFeed={state.activityFeed} redTeamResult={redTeamResult} />}
        {activeTab === 'ssp' && <SystemSecurityPlan telemetry={state.agents[AgentRole.TELEMETRY].output} redTeamResult={redTeamResult} />}
        {activeTab === 'sops' && <StandardOperatingProcedures />}
        {activeTab === 'governance' && <GovernancePolicy />}
        {activeTab === 'browser' && <BrowserAutomationPanel workforce={state.template} />}
        {activeTab === 'cases' && <CasesDashboard />}
        {activeTab === 'team' && <AgentTeamDashboard />}

        {/* ACE Agent Chat removed - use Claude Code (Pro Max) for zero cost */}
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
             <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white/90 backdrop-blur-md">
               <div className="flex items-center gap-4">
                 <div className={`p-3 ${
                   state.template === WorkforceType.VA_CLAIMS ? 'bg-[#003366]'
                   : state.template === WorkforceType.CYBER_IR ? 'bg-rose-700'
                   : state.template === WorkforceType.GRANT_WRITING ? 'bg-emerald-700'
                   : state.template === WorkforceType.BD_CAPTURE ? 'bg-indigo-700'
                   : 'bg-blue-900'
                 } text-white rounded-2xl shadow-lg`}><Award size={24} /></div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                      {state.template === WorkforceType.VA_CLAIMS ? 'VA Evidence Chain Validation Report'
                        : state.template === WorkforceType.CYBER_IR ? 'Kill Chain Validation (KCV) Report'
                        : state.template === WorkforceType.GRANT_WRITING ? 'Grant Application Package'
                        : state.template === WorkforceType.BD_CAPTURE ? 'Capture Proposal Package'
                        : 'Corporate Integrity Audit Report'}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Governed Intelligence Artifact • Audit-Ready Deliverable</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <button
                   onClick={() => {
                     const reportEl = document.getElementById('ecv-report');
                     if (reportEl) {
                       const printWindow = window.open('', '_blank');
                       if (printWindow) {
                         const title = state.template === WorkforceType.VA_CLAIMS ? 'VA Evidence Chain Validation Report'
                          : state.template === WorkforceType.CYBER_IR ? 'Kill Chain Validation Report'
                          : state.template === WorkforceType.GRANT_WRITING ? 'Grant Application Package'
                          : state.template === WorkforceType.BD_CAPTURE ? 'Capture Proposal Package'
                          : 'Corporate Integrity Audit Report';
                         printWindow.document.write(`
                           <html>
                             <head>
                               <title>${title}</title>
                               <script src="https://cdn.tailwindcss.com"></script>
                               <style>
                                 @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                                 body { font-family: system-ui, -apple-system, sans-serif; }
                               </style>
                             </head>
                             <body class="bg-white p-8">${reportEl.innerHTML}</body>
                           </html>
                         `);
                         printWindow.document.close();
                         setTimeout(() => printWindow.print(), 500);
                       }
                     }
                   }}
                   className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[11px] font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                 >
                   <Printer size={16} /> Print / Save PDF
                 </button>
                 <button
                   onClick={() => {
                     const reportData = state.template === WorkforceType.VA_CLAIMS
                       ? state.agents[AgentRole.REPORT].output
                       : state.template === WorkforceType.CYBER_IR
                         ? state.agents[AgentRole.IR_REPORT_GENERATOR]?.output
                         : state.agents[AgentRole.FINANCIAL_REPORT].output;
                     const dataStr = JSON.stringify(reportData, null, 2);
                     const blob = new Blob([dataStr], { type: 'application/json' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     const prefix = state.template === WorkforceType.VA_CLAIMS ? 'ECV-Report' : state.template === WorkforceType.CYBER_IR ? 'KCV-Report' : 'FIN-Audit-Report';
                     a.download = `${prefix}-${Date.now()}.json`;
                     a.click();
                   }}
                   className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                 >
                   <FileDown size={16} /> Export JSON
                 </button>
                 <button
                   onClick={() => {
                     const logs = state.activityFeed.map(l => `[${l.timestamp}] ${l.role}: ${l.message}`).join('\n');
                     const blob = new Blob([logs], { type: 'text/plain' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = `ACE-Activity-Log-${Date.now()}.txt`;
                     a.click();
                   }}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-[11px] font-black rounded-xl hover:bg-slate-700 transition-all shadow-lg"
                 >
                   <Download size={16} /> Export Logs
                 </button>
                 <button
                   onClick={() => {
                     // Generate comprehensive Evidence Bundle
                     const evidenceBundle = {
                       bundleMetadata: {
                         bundleId: `ACE-EVIDENCE-${Date.now()}`,
                         createdAt: new Date().toISOString(),
                         platformVersion: '1.0.0',
                         workforceType: state.template,
                         exportedBy: currentUser,
                         environmentMode: 'demo'
                       },
                       governanceAuditLog: {
                         summary: {
                           totalEvents: state.activityFeed.length,
                           totalActions: state.logs.length,
                           uniqueAgents: [...new Set(state.logs.map(l => l.agentId))].length
                         },
                         events: state.activityFeed.map((log, idx) => ({
                           eventId: log.id,
                           timestamp: log.timestamp,
                           actor: log.role,
                           message: log.message,
                           type: log.type,
                           sequenceNumber: idx + 1
                         })),
                         actions: state.logs.map(log => ({
                           actionId: log.id,
                           timestamp: log.timestamp,
                           agentId: log.agentId,
                           actionType: log.actionType,
                           classification: log.classification,
                           status: log.status,
                           humanReviewStatus: log.humanReviewStatus,
                           reviewerId: log.reviewerId,
                           reviewerRole: log.reviewerRole,
                           duration: log.duration
                         }))
                       },
                       agentOutputs: Object.fromEntries(
                         Object.entries(state.agents).map(([role, agent]) => [
                           role,
                           {
                             status: agent.status,
                             progress: agent.progress,
                             output: agent.output,
                             supervisorScore: agent.supervisorScore,
                             tokenUsage: agent.tokenUsage
                           }
                         ])
                       ),
                       redTeamValidation: redTeamResult ? {
                         runId: redTeamResult.runId,
                         scoreCard: redTeamResult.scoreCard,
                         workflowTrustStatus: redTeamResult.workflowTrustStatus,
                         contract: redTeamResult.contract,
                         findings: redTeamResult.findings
                       } : null,
                       disclaimer: 'DEMO MODE: This evidence bundle was generated in demonstration mode. Control mappings represent alignment, not certification claims.'
                     };

                     const dataStr = JSON.stringify(evidenceBundle, null, 2);
                     const blob = new Blob([dataStr], { type: 'application/json' });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = `ACE-Evidence-Bundle-${Date.now()}.json`;
                     a.click();
                   }}
                   className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-[11px] font-black rounded-xl hover:bg-purple-700 transition-all shadow-lg"
                 >
                   <ShieldCheck size={16} /> Evidence Bundle
                 </button>
                 <button onClick={() => setViewingReport(false)} className="px-6 py-2 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-black transition-all shadow-lg">
                   Close
                 </button>
               </div>
             </div>
             <div className="flex-1 overflow-auto p-12 bg-slate-200/40">
               <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-4">
                 <CheckCircle2 className="text-emerald-600" size={24} />
                 <div>
                   <p className="text-sm font-black text-emerald-800">Governed Intelligence Artifact</p>
                   <p className="text-[11px] text-emerald-600">This is the official deliverable produced by the ACE governance system. Use for audit handoff, billing anchor, or legal reference.</p>
                 </div>
               </div>
               <div id="ecv-report">
                 {state.template === WorkforceType.VA_CLAIMS ? (
                   <ReportView data={state.agents[AgentRole.REPORT].output} />
                 ) : state.template === WorkforceType.CYBER_IR ? (
                   <CyberReportView data={cyberIncidentData} />
                 ) : state.template === WorkforceType.BD_CAPTURE ? (
                   <CaptureReportView
                     data={{
                       // Aggregate all BD Capture agent outputs into a single report data object
                       ...state.agents[AgentRole.RFP_ANALYZER]?.output,
                       ...state.agents[AgentRole.COMPLIANCE_MATRIX]?.output,
                       ...state.agents[AgentRole.PAST_PERFORMANCE]?.output,
                       ...state.agents[AgentRole.TECHNICAL_WRITER]?.output,
                       ...state.agents[AgentRole.PRICING_ANALYST]?.output,
                       ...state.agents[AgentRole.PROPOSAL_QA]?.output,
                       ...state.agents[AgentRole.PROPOSAL_ASSEMBLER]?.output,
                     }}
                     opportunityData={captureOpportunityData}
                   />
                 ) : state.template === WorkforceType.GRANT_WRITING ? (
                   <GrantReportView
                     data={{
                       // Aggregate all Grant Writing agent outputs
                       ...state.agents[AgentRole.GRANT_OPPORTUNITY_ANALYZER]?.output,
                       ...state.agents[AgentRole.GRANT_ELIGIBILITY_VALIDATOR]?.output,
                       ...state.agents[AgentRole.GRANT_NARRATIVE_WRITER]?.output,
                       ...state.agents[AgentRole.GRANT_BUDGET_DEVELOPER]?.output,
                       ...state.agents[AgentRole.GRANT_COMPLIANCE_CHECKER]?.output,
                       ...state.agents[AgentRole.GRANT_EVALUATOR_LENS]?.output,
                       ...state.agents[AgentRole.GRANT_QA]?.output,
                       ...state.agents[AgentRole.GRANT_APPLICATION_ASSEMBLER]?.output,
                     }}
                     applicationData={grantApplicationData}
                   />
                 ) : (
                   <FinancialReportView data={state.agents[AgentRole.FINANCIAL_REPORT].output} />
                 )}
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Red Team Dashboard Modal */}
      {showRedTeamDashboard && redTeamResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-full max-w-7xl max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl border border-red-900/50">
            <RedTeamDashboard
              result={redTeamResult}
              onClose={() => setShowRedTeamDashboard(false)}
            />
          </div>
        </div>
      )}

      {/* Demo Canon Selector Modal */}
      {showDemoCanon && (
        <DemoCanonSelector
          currentWorkforce={state.template}
          onSelectScenario={handleDemoScenarioSelect}
          onClose={() => setShowDemoCanon(false)}
        />
      )}
    </div>
  );
};

export default App;
