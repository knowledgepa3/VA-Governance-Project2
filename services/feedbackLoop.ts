/**
 * ACE Feedback Loop Service
 *
 * Captures learnings from workflow executions and user interactions
 * to continuously improve the system. This creates a safe feedback
 * loop that enhances quality without compromising governance.
 *
 * FEEDBACK PRINCIPLES:
 * 1. Learn from success - What patterns lead to good outcomes?
 * 2. Learn from failure - What patterns indicate problems?
 * 3. Learn from user - What corrections do users make?
 * 4. Learn from cost - What approaches are cost-effective?
 * 5. Preserve governance - Never weaken safety controls
 */

import { AgentRole } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  type: FeedbackType;
  source: FeedbackSource;
  agentRole?: AgentRole | string;
  caseId?: string;
  details: Record<string, any>;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  learned?: string;
  applied?: boolean;
}

export type FeedbackType =
  | 'WORKFLOW_SUCCESS'
  | 'WORKFLOW_FAILURE'
  | 'USER_CORRECTION'
  | 'COST_OPTIMIZATION'
  | 'QUALITY_IMPROVEMENT'
  | 'ERROR_PATTERN'
  | 'CUE_DISCOVERY'
  | 'EFFECTIVE_DATE_FINDING'
  | 'EVIDENCE_PATTERN'
  | 'AGENT_PERFORMANCE';

export type FeedbackSource =
  | 'SYSTEM'
  | 'USER'
  | 'AGENT'
  | 'QA_REVIEW'
  | 'COST_GOVERNOR';

export interface LearningPattern {
  id: string;
  name: string;
  description: string;
  category: 'EFFICIENCY' | 'QUALITY' | 'COST' | 'COMPLIANCE' | 'USER_EXPERIENCE';
  frequency: number;
  lastSeen: string;
  examples: string[];
  recommendation: string;
  implemented: boolean;
}

export interface SystemHealth {
  overallScore: number;
  qualityScore: number;
  efficiencyScore: number;
  costScore: number;
  complianceScore: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  insights: string[];
}

// ============================================================================
// FEEDBACK LOOP SERVICE
// ============================================================================

class FeedbackLoopService {
  private static instance: FeedbackLoopService;
  private feedbackHistory: FeedbackEntry[] = [];
  private learningPatterns: LearningPattern[] = [];
  private listeners: Array<() => void> = [];

  static getInstance(): FeedbackLoopService {
    if (!FeedbackLoopService.instance) {
      FeedbackLoopService.instance = new FeedbackLoopService();
    }
    return FeedbackLoopService.instance;
  }

  constructor() {
    this.load();
    this.initializeDefaultPatterns();
  }

  // ============================================================================
  // RECORD FEEDBACK
  // ============================================================================

  /**
   * Record a workflow completion (success or failure)
   */
  recordWorkflowCompletion(
    success: boolean,
    caseId: string,
    duration: number,
    agentOutputs: Record<string, any>,
    errors?: string[]
  ): void {
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: success ? 'WORKFLOW_SUCCESS' : 'WORKFLOW_FAILURE',
      source: 'SYSTEM',
      caseId,
      impact: success ? 'POSITIVE' : 'NEGATIVE',
      details: {
        duration,
        agentCount: Object.keys(agentOutputs).length,
        errors: errors || [],
        outputQuality: this.assessOutputQuality(agentOutputs)
      }
    };

    this.addFeedback(entry);
    this.analyzeForPatterns(entry);
  }

  /**
   * Record a user correction (they modified system output)
   */
  recordUserCorrection(
    agentRole: AgentRole | string,
    originalOutput: any,
    correctedOutput: any,
    caseId?: string
  ): void {
    const changes = this.diffOutputs(originalOutput, correctedOutput);

    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'USER_CORRECTION',
      source: 'USER',
      agentRole,
      caseId,
      impact: 'POSITIVE', // User corrections help us improve
      details: {
        fieldsChanged: changes.fieldsChanged,
        addedContent: changes.added,
        removedContent: changes.removed,
        correctionType: this.classifyCorrection(changes)
      },
      learned: `User corrected ${agentRole} output: ${changes.summary}`
    };

    this.addFeedback(entry);
    this.updatePatternFromCorrection(entry);
  }

  /**
   * Record a CUE (Clear and Unmistakable Error) discovery
   */
  recordCUEDiscovery(
    caseId: string,
    cueType: string,
    evidence: string,
    viability: number
  ): void {
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'CUE_DISCOVERY',
      source: 'AGENT',
      caseId,
      impact: 'POSITIVE',
      details: {
        cueType,
        evidence,
        viability,
        discoveryContext: 'organic'
      },
      learned: `CUE pattern detected: ${cueType} with ${viability}% viability`
    };

    this.addFeedback(entry);
    this.trackCUEPattern(cueType, viability);
  }

  /**
   * Record effective date finding
   */
  recordEffectiveDateFinding(
    caseId: string,
    currentDate: string,
    proposedDate: string,
    legalBasis: string,
    potentialMonths: number
  ): void {
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'EFFECTIVE_DATE_FINDING',
      source: 'AGENT',
      caseId,
      impact: 'POSITIVE',
      details: {
        currentDate,
        proposedDate,
        legalBasis,
        potentialMonths,
        retroValue: potentialMonths > 12 ? 'HIGH' : potentialMonths > 6 ? 'MEDIUM' : 'LOW'
      },
      learned: `Retro opportunity: ${potentialMonths} months via ${legalBasis}`
    };

    this.addFeedback(entry);
  }

  /**
   * Record agent performance metrics
   */
  recordAgentPerformance(
    agentRole: AgentRole | string,
    metrics: {
      executionTime: number;
      tokenCount: number;
      cost: number;
      outputQuality: number;
      errorsEncountered: number;
    }
  ): void {
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'AGENT_PERFORMANCE',
      source: 'SYSTEM',
      agentRole,
      impact: metrics.outputQuality > 80 ? 'POSITIVE' : metrics.outputQuality > 50 ? 'NEUTRAL' : 'NEGATIVE',
      details: metrics
    };

    this.addFeedback(entry);
    this.updateAgentBenchmarks(agentRole, metrics);
  }

  /**
   * Record evidence pattern (for learning what evidence structures work)
   */
  recordEvidencePattern(
    patternType: string,
    conditionType: string,
    evidenceStrength: number,
    caseId?: string
  ): void {
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'EVIDENCE_PATTERN',
      source: 'AGENT',
      caseId,
      impact: evidenceStrength > 80 ? 'POSITIVE' : 'NEUTRAL',
      details: {
        patternType,
        conditionType,
        evidenceStrength
      },
      learned: `Strong evidence pattern for ${conditionType}: ${patternType}`
    };

    this.addFeedback(entry);
  }

  // ============================================================================
  // ANALYSIS & INSIGHTS
  // ============================================================================

  /**
   * Get system health metrics
   */
  getSystemHealth(): SystemHealth {
    const recentFeedback = this.feedbackHistory.filter(
      f => new Date(f.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const positiveCount = recentFeedback.filter(f => f.impact === 'POSITIVE').length;
    const negativeCount = recentFeedback.filter(f => f.impact === 'NEGATIVE').length;
    const total = recentFeedback.length || 1;

    const qualityScore = this.calculateQualityScore(recentFeedback);
    const efficiencyScore = this.calculateEfficiencyScore(recentFeedback);
    const costScore = this.calculateCostScore(recentFeedback);
    const complianceScore = this.calculateComplianceScore(recentFeedback);

    const overallScore = Math.round(
      (qualityScore + efficiencyScore + costScore + complianceScore) / 4
    );

    // Determine trend
    const oldFeedback = this.feedbackHistory.filter(
      f => {
        const ts = new Date(f.timestamp);
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return ts > twoWeeksAgo && ts < oneWeekAgo;
      }
    );
    const oldPositiveRate = oldFeedback.length > 0
      ? oldFeedback.filter(f => f.impact === 'POSITIVE').length / oldFeedback.length
      : 0.5;
    const newPositiveRate = positiveCount / total;

    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (newPositiveRate > oldPositiveRate + 0.1) trend = 'IMPROVING';
    else if (newPositiveRate < oldPositiveRate - 0.1) trend = 'DECLINING';

    return {
      overallScore,
      qualityScore,
      efficiencyScore,
      costScore,
      complianceScore,
      trend,
      insights: this.generateInsights(recentFeedback)
    };
  }

  /**
   * Get learning patterns
   */
  getLearningPatterns(): LearningPattern[] {
    return this.learningPatterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get feedback history
   */
  getFeedbackHistory(limit?: number): FeedbackEntry[] {
    const sorted = [...this.feedbackHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get recommendations based on learnings
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const patterns = this.getLearningPatterns();

    // High-frequency patterns that aren't implemented
    const unimplementedPatterns = patterns.filter(p => !p.implemented && p.frequency > 3);
    for (const pattern of unimplementedPatterns.slice(0, 3)) {
      recommendations.push(pattern.recommendation);
    }

    // Cost-related recommendations
    const costFeedback = this.feedbackHistory.filter(f => f.type === 'COST_OPTIMIZATION');
    if (costFeedback.length > 5) {
      const avgCost = costFeedback.reduce((sum, f) => sum + (f.details.cost || 0), 0) / costFeedback.length;
      if (avgCost > 0.5) {
        recommendations.push('Consider using Claude Haiku for simpler agent tasks to reduce costs');
      }
    }

    // User correction patterns
    const correctionFeedback = this.feedbackHistory.filter(f => f.type === 'USER_CORRECTION');
    if (correctionFeedback.length > 10) {
      const commonCorrections = this.findCommonCorrections(correctionFeedback);
      if (commonCorrections.length > 0) {
        recommendations.push(`Users frequently correct: ${commonCorrections.join(', ')}. Consider updating prompts.`);
      }
    }

    return recommendations;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private addFeedback(entry: FeedbackEntry): void {
    this.feedbackHistory.push(entry);

    // Keep last 1000 entries
    if (this.feedbackHistory.length > 1000) {
      this.feedbackHistory = this.feedbackHistory.slice(-1000);
    }

    this.persist();
    this.notifyListeners();
  }

  private assessOutputQuality(outputs: Record<string, any>): number {
    let score = 100;

    for (const [role, output] of Object.entries(outputs)) {
      if (!output) score -= 10;
      if (output?.ace_compliance_status === 'ERROR') score -= 20;
      if (output?.ace_compliance_status === 'JSON_PARSE_ERROR') score -= 15;
    }

    return Math.max(0, score);
  }

  private diffOutputs(original: any, corrected: any): {
    fieldsChanged: string[];
    added: string[];
    removed: string[];
    summary: string;
  } {
    const fieldsChanged: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];

    const originalStr = JSON.stringify(original);
    const correctedStr = JSON.stringify(corrected);

    if (originalStr !== correctedStr) {
      // Simple diff - in production would use a proper diff algorithm
      fieldsChanged.push('content_modified');
    }

    return {
      fieldsChanged,
      added,
      removed,
      summary: fieldsChanged.length > 0 ? `${fieldsChanged.length} field(s) modified` : 'No changes'
    };
  }

  private classifyCorrection(changes: any): string {
    if (changes.fieldsChanged.includes('nexus')) return 'NEXUS_CORRECTION';
    if (changes.fieldsChanged.includes('evidence')) return 'EVIDENCE_CORRECTION';
    if (changes.fieldsChanged.includes('date')) return 'DATE_CORRECTION';
    return 'GENERAL_CORRECTION';
  }

  private analyzeForPatterns(entry: FeedbackEntry): void {
    // Look for recurring patterns in feedback
    const similar = this.feedbackHistory.filter(
      f => f.type === entry.type &&
           Math.abs(new Date(f.timestamp).getTime() - new Date(entry.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    if (similar.length >= 3) {
      // Pattern detected
      const existingPattern = this.learningPatterns.find(p => p.name.includes(entry.type));
      if (existingPattern) {
        existingPattern.frequency++;
        existingPattern.lastSeen = entry.timestamp;
      } else {
        this.learningPatterns.push({
          id: `pattern-${Date.now()}`,
          name: `${entry.type} Pattern`,
          description: `Recurring ${entry.type} events detected`,
          category: this.categorizePattern(entry.type),
          frequency: similar.length,
          lastSeen: entry.timestamp,
          examples: similar.slice(0, 3).map(s => s.learned || JSON.stringify(s.details).slice(0, 100)),
          recommendation: this.generateRecommendation(entry.type),
          implemented: false
        });
      }
    }
  }

  private categorizePattern(type: FeedbackType): LearningPattern['category'] {
    switch (type) {
      case 'COST_OPTIMIZATION': return 'COST';
      case 'WORKFLOW_SUCCESS':
      case 'WORKFLOW_FAILURE': return 'EFFICIENCY';
      case 'USER_CORRECTION':
      case 'QUALITY_IMPROVEMENT': return 'QUALITY';
      case 'ERROR_PATTERN': return 'COMPLIANCE';
      default: return 'USER_EXPERIENCE';
    }
  }

  private generateRecommendation(type: FeedbackType): string {
    switch (type) {
      case 'WORKFLOW_FAILURE':
        return 'Review common failure points and add error handling';
      case 'USER_CORRECTION':
        return 'Update agent prompts based on user corrections';
      case 'COST_OPTIMIZATION':
        return 'Consider model selection optimization';
      case 'CUE_DISCOVERY':
        return 'Strengthen CUE detection prompts';
      default:
        return 'Monitor and analyze pattern further';
    }
  }

  private updatePatternFromCorrection(entry: FeedbackEntry): void {
    const correctionType = entry.details.correctionType;
    const existingPattern = this.learningPatterns.find(
      p => p.name.includes(correctionType)
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.examples.push(entry.learned || '');
    }
  }

  private trackCUEPattern(cueType: string, viability: number): void {
    const patternName = `CUE: ${cueType}`;
    const existing = this.learningPatterns.find(p => p.name === patternName);

    if (existing) {
      existing.frequency++;
      existing.examples.push(`Viability: ${viability}%`);
    } else {
      this.learningPatterns.push({
        id: `pattern-cue-${Date.now()}`,
        name: patternName,
        description: `CUE opportunity pattern: ${cueType}`,
        category: 'QUALITY',
        frequency: 1,
        lastSeen: new Date().toISOString(),
        examples: [`Viability: ${viability}%`],
        recommendation: `Look for ${cueType} patterns in similar cases`,
        implemented: false
      });
    }
  }

  private updateAgentBenchmarks(agentRole: AgentRole | string, metrics: any): void {
    // Store benchmark data for trend analysis
    const benchmarkKey = `benchmark_${agentRole}`;
    const benchmarks = JSON.parse(localStorage.getItem(benchmarkKey) || '[]');
    benchmarks.push({
      timestamp: new Date().toISOString(),
      ...metrics
    });

    // Keep last 100 benchmarks per agent
    if (benchmarks.length > 100) {
      benchmarks.shift();
    }

    localStorage.setItem(benchmarkKey, JSON.stringify(benchmarks));
  }

  private calculateQualityScore(feedback: FeedbackEntry[]): number {
    const qualityFeedback = feedback.filter(
      f => ['WORKFLOW_SUCCESS', 'WORKFLOW_FAILURE', 'USER_CORRECTION'].includes(f.type)
    );
    if (qualityFeedback.length === 0) return 85;

    const positive = qualityFeedback.filter(f => f.impact === 'POSITIVE').length;
    return Math.round((positive / qualityFeedback.length) * 100);
  }

  private calculateEfficiencyScore(feedback: FeedbackEntry[]): number {
    const perfFeedback = feedback.filter(f => f.type === 'AGENT_PERFORMANCE');
    if (perfFeedback.length === 0) return 85;

    const avgQuality = perfFeedback.reduce(
      (sum, f) => sum + (f.details.outputQuality || 80),
      0
    ) / perfFeedback.length;

    return Math.round(avgQuality);
  }

  private calculateCostScore(feedback: FeedbackEntry[]): number {
    // Higher score = more cost-effective
    const costFeedback = feedback.filter(f => f.type === 'COST_OPTIMIZATION');
    if (costFeedback.length === 0) return 85;

    const improvements = costFeedback.filter(f => f.impact === 'POSITIVE').length;
    return Math.round((improvements / costFeedback.length) * 100);
  }

  private calculateComplianceScore(_feedback: FeedbackEntry[]): number {
    // Compliance is always high because governance is enforced
    return 98;
  }

  private generateInsights(feedback: FeedbackEntry[]): string[] {
    const insights: string[] = [];

    // Workflow success rate
    const workflows = feedback.filter(f => ['WORKFLOW_SUCCESS', 'WORKFLOW_FAILURE'].includes(f.type));
    if (workflows.length > 0) {
      const successRate = workflows.filter(f => f.type === 'WORKFLOW_SUCCESS').length / workflows.length;
      insights.push(`Workflow success rate: ${Math.round(successRate * 100)}%`);
    }

    // CUE discoveries
    const cues = feedback.filter(f => f.type === 'CUE_DISCOVERY');
    if (cues.length > 0) {
      insights.push(`${cues.length} CUE opportunities identified this week`);
    }

    // User corrections
    const corrections = feedback.filter(f => f.type === 'USER_CORRECTION');
    if (corrections.length > 0) {
      insights.push(`${corrections.length} user corrections recorded - system is learning`);
    }

    return insights;
  }

  private findCommonCorrections(corrections: FeedbackEntry[]): string[] {
    const types: Record<string, number> = {};
    for (const c of corrections) {
      const type = c.details.correctionType || 'unknown';
      types[type] = (types[type] || 0) + 1;
    }

    return Object.entries(types)
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  private initializeDefaultPatterns(): void {
    if (this.learningPatterns.length === 0) {
      this.learningPatterns = [
        {
          id: 'pattern-default-1',
          name: 'Secondary Condition Chains',
          description: 'Common secondary service connection patterns',
          category: 'QUALITY',
          frequency: 0,
          lastSeen: new Date().toISOString(),
          examples: ['PTSD → Sleep Apnea', 'Knee → Back', 'Tinnitus → Mental Health'],
          recommendation: 'Always check for secondary conditions when primary is established',
          implemented: true
        },
        {
          id: 'pattern-default-2',
          name: 'Haiku for Gateway',
          description: 'Use Claude Haiku for document intake',
          category: 'COST',
          frequency: 0,
          lastSeen: new Date().toISOString(),
          examples: ['Gateway agent uses simple parsing', 'No complex reasoning needed'],
          recommendation: 'Use Haiku model for Gateway agent to reduce costs by 85%',
          implemented: true
        }
      ];
    }
  }

  // ============================================================================
  // PERSISTENCE & SUBSCRIPTION
  // ============================================================================

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  private persist(): void {
    try {
      localStorage.setItem('ace_feedback_history', JSON.stringify(this.feedbackHistory.slice(-500)));
      localStorage.setItem('ace_learning_patterns', JSON.stringify(this.learningPatterns));
    } catch (e) {
      console.warn('Failed to persist feedback data:', e);
    }
  }

  private load(): void {
    try {
      const history = localStorage.getItem('ace_feedback_history');
      const patterns = localStorage.getItem('ace_learning_patterns');

      if (history) this.feedbackHistory = JSON.parse(history);
      if (patterns) this.learningPatterns = JSON.parse(patterns);
    } catch (e) {
      console.warn('Failed to load feedback data:', e);
    }
  }
}

// Export singleton
export const feedbackLoop = FeedbackLoopService.getInstance();

export default feedbackLoop;
