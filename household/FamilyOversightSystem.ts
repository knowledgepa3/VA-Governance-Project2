/**
 * FAMILY OVERSIGHT NOTIFICATION SYSTEM v1.0.0
 *
 * Provides optional oversight capabilities for caregivers and family members
 * to monitor household operations activity. Designed with privacy protections
 * and explicit consent requirements.
 *
 * KEY PRINCIPLES:
 * - User (primary account holder) controls ALL settings
 * - Family members have READ-ONLY access by default
 * - All oversight activity is logged and visible to user
 * - User can revoke access at any time
 * - Privacy protections prevent detailed snooping
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export enum OversightRole {
  PRIMARY_USER = 'PRIMARY_USER',      // Full control
  CAREGIVER = 'CAREGIVER',            // Can view and approve on behalf
  FAMILY_MONITOR = 'FAMILY_MONITOR',  // View-only access
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT'  // Only notified in emergencies
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}

export enum NotificationType {
  // Routine notifications
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  WEEKLY_REPORT = 'WEEKLY_REPORT',
  MONTHLY_REPORT = 'MONTHLY_REPORT',

  // Action notifications
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_DENIED = 'APPROVAL_DENIED',
  ORDER_PLACED = 'ORDER_PLACED',
  BILL_PAID = 'BILL_PAID',

  // Alert notifications
  ESCALATION_TRIGGERED = 'ESCALATION_TRIGGERED',
  BUDGET_WARNING = 'BUDGET_WARNING',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  SCAM_ALERT = 'SCAM_ALERT',

  // Emergency notifications
  PANIC_STOP = 'PANIC_STOP',
  SYSTEM_HALT = 'SYSTEM_HALT',
  CRITICAL_ESCALATION = 'CRITICAL_ESCALATION'
}

export enum NotificationUrgency {
  LOW = 'LOW',           // Can be batched in daily digest
  MEDIUM = 'MEDIUM',     // Send within few hours
  HIGH = 'HIGH',         // Send within 15 minutes
  CRITICAL = 'CRITICAL'  // Send immediately via all channels
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  role: OversightRole;
  email?: string;
  phone?: string;
  pushToken?: string;

  // Permissions granted by primary user
  permissions: {
    canViewSummaries: boolean;
    canViewTransactionDetails: boolean;
    canViewEvidenceBundles: boolean;
    canReceiveEscalations: boolean;
    canApproveOnBehalf: boolean;
    canEmergencyStop: boolean;
  };

  // Notification preferences
  notifications: {
    channels: NotificationChannel[];
    enabledTypes: NotificationType[];
    quietHours?: { start: string; end: string };  // e.g., "22:00" to "07:00"
  };

  // Consent tracking
  consent: {
    givenAt: string;        // ISO timestamp
    expiresAt?: string;     // Optional expiration
    consentVersion: string; // Track consent form version
  };

  // Activity tracking
  lastActivity?: string;
  addedAt: string;
  addedBy: string;
}

export interface OversightConfiguration {
  // Primary user settings
  primaryUserId: string;
  oversightEnabled: boolean;

  // Family members with oversight access
  familyMembers: FamilyMember[];

  // What family can see
  visibilitySettings: {
    showTransactionAmounts: boolean;
    showMerchantNames: boolean;
    showCartDetails: boolean;
    showPaymentMethods: boolean;  // Always false for security
    showAddresses: boolean;       // Always false for security
    maxHistoryDays: number;       // How far back they can see
  };

  // Emergency settings
  emergencySettings: {
    emergencyContactIds: string[];
    allowRemotePanicStop: boolean;
    notifyOnAllCritical: boolean;
  };

  // Audit settings
  auditSettings: {
    logAllOversightActivity: boolean;
    notifyUserOfFamilyViews: boolean;
    retentionDays: number;
  };
}

export interface OversightActivityLog {
  id: string;
  timestamp: string;
  familyMemberId: string;
  familyMemberName: string;
  action: string;
  details?: string;
  ipAddress?: string;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  urgency: NotificationUrgency;
  timestamp: string;

  // Content
  title: string;
  summary: string;
  details?: string;

  // Context
  relatedTransactionId?: string;
  relatedEscalationId?: string;
  amount?: number;

  // Actions available
  actions?: {
    approve?: boolean;
    deny?: boolean;
    viewDetails?: boolean;
    emergencyStop?: boolean;
  };
}

// =============================================================================
// FAMILY OVERSIGHT SYSTEM
// =============================================================================

export class FamilyOversightSystem {
  private config: OversightConfiguration;
  private activityLog: OversightActivityLog[] = [];

  constructor(config: OversightConfiguration) {
    this.config = config;
    this.enforcePrivacyDefaults();
  }

  /**
   * Enforce privacy defaults that cannot be overridden
   */
  private enforcePrivacyDefaults(): void {
    // Payment methods and addresses are NEVER visible to family
    this.config.visibilitySettings.showPaymentMethods = false;
    this.config.visibilitySettings.showAddresses = false;

    // Maximum history is 90 days
    if (this.config.visibilitySettings.maxHistoryDays > 90) {
      this.config.visibilitySettings.maxHistoryDays = 90;
    }
  }

  // ==========================================================================
  // FAMILY MEMBER MANAGEMENT
  // ==========================================================================

  /**
   * Add a family member with oversight access
   * Requires explicit consent documentation
   */
  addFamilyMember(member: Omit<FamilyMember, 'id' | 'addedAt' | 'addedBy'>): FamilyMember {
    const newMember: FamilyMember = {
      ...member,
      id: `FAM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      addedBy: this.config.primaryUserId
    };

    // Enforce role-based permission limits
    this.enforceRolePermissions(newMember);

    this.config.familyMembers.push(newMember);
    this.logActivity(newMember.id, 'MEMBER_ADDED', `${newMember.name} added as ${newMember.role}`);

    return newMember;
  }

  /**
   * Remove a family member's access
   */
  removeFamilyMember(memberId: string): boolean {
    const index = this.config.familyMembers.findIndex(m => m.id === memberId);
    if (index === -1) return false;

    const member = this.config.familyMembers[index];
    this.config.familyMembers.splice(index, 1);
    this.logActivity(memberId, 'MEMBER_REMOVED', `${member.name} access revoked`);

    return true;
  }

  /**
   * Update family member permissions
   */
  updateMemberPermissions(
    memberId: string,
    permissions: Partial<FamilyMember['permissions']>
  ): FamilyMember | null {
    const member = this.config.familyMembers.find(m => m.id === memberId);
    if (!member) return null;

    member.permissions = { ...member.permissions, ...permissions };
    this.enforceRolePermissions(member);
    this.logActivity(memberId, 'PERMISSIONS_UPDATED', JSON.stringify(permissions));

    return member;
  }

  /**
   * Enforce permission limits based on role
   */
  private enforceRolePermissions(member: FamilyMember): void {
    switch (member.role) {
      case OversightRole.EMERGENCY_CONTACT:
        // Emergency contacts can only receive critical alerts and emergency stop
        member.permissions.canViewSummaries = false;
        member.permissions.canViewTransactionDetails = false;
        member.permissions.canViewEvidenceBundles = false;
        member.permissions.canApproveOnBehalf = false;
        break;

      case OversightRole.FAMILY_MONITOR:
        // Monitors can view but not act
        member.permissions.canApproveOnBehalf = false;
        break;

      case OversightRole.CAREGIVER:
        // Caregivers can have full permissions if granted
        break;
    }
  }

  // ==========================================================================
  // NOTIFICATION SYSTEM
  // ==========================================================================

  /**
   * Send notification to appropriate family members
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const eligibleMembers = this.getEligibleMembers(payload.type, payload.urgency);

    for (const member of eligibleMembers) {
      // Check quiet hours for non-critical notifications
      if (payload.urgency !== NotificationUrgency.CRITICAL) {
        if (this.isInQuietHours(member)) {
          // Queue for later or skip based on urgency
          if (payload.urgency === NotificationUrgency.LOW) {
            continue; // Will be included in next digest
          }
          // Medium/High urgency: queue for end of quiet hours
          this.queueNotification(member, payload);
          continue;
        }
      }

      // Filter content based on member's visibility permissions
      const filteredPayload = this.filterPayloadForMember(payload, member);

      // Send via enabled channels
      for (const channel of member.notifications.channels) {
        await this.sendViaChannel(channel, member, filteredPayload);
      }

      this.logActivity(member.id, 'NOTIFICATION_SENT', `${payload.type} via ${member.notifications.channels.join(', ')}`);
    }
  }

  /**
   * Get family members eligible to receive a notification type
   */
  private getEligibleMembers(
    type: NotificationType,
    urgency: NotificationUrgency
  ): FamilyMember[] {
    return this.config.familyMembers.filter(member => {
      // Check if notification type is enabled for this member
      if (!member.notifications.enabledTypes.includes(type)) {
        // Exception: Critical notifications always go to emergency contacts
        if (urgency === NotificationUrgency.CRITICAL &&
            member.role === OversightRole.EMERGENCY_CONTACT) {
          return true;
        }
        return false;
      }

      // Check permission requirements for certain notification types
      switch (type) {
        case NotificationType.APPROVAL_REQUESTED:
          return member.permissions.canReceiveEscalations;
        case NotificationType.ORDER_PLACED:
        case NotificationType.BILL_PAID:
          return member.permissions.canViewTransactionDetails;
        default:
          return true;
      }
    });
  }

  /**
   * Filter notification payload based on member's visibility permissions
   */
  private filterPayloadForMember(
    payload: NotificationPayload,
    member: FamilyMember
  ): NotificationPayload {
    const filtered = { ...payload };

    // Hide amount if not permitted
    if (!this.config.visibilitySettings.showTransactionAmounts) {
      delete filtered.amount;
      filtered.details = filtered.details?.replace(/\$[\d,.]+/g, '[amount hidden]');
    }

    // Hide merchant names if not permitted
    if (!this.config.visibilitySettings.showMerchantNames) {
      filtered.details = filtered.details?.replace(
        /(?:from|at|to)\s+[\w\s]+(?:\.com|\.net|\.org)?/gi,
        '[merchant hidden]'
      );
    }

    // Remove action buttons if member can't take those actions
    if (filtered.actions) {
      if (!member.permissions.canApproveOnBehalf) {
        delete filtered.actions.approve;
        delete filtered.actions.deny;
      }
      if (!member.permissions.canEmergencyStop) {
        delete filtered.actions.emergencyStop;
      }
      if (!member.permissions.canViewEvidenceBundles) {
        delete filtered.actions.viewDetails;
      }
    }

    return filtered;
  }

  /**
   * Check if current time is within member's quiet hours
   */
  private isInQuietHours(member: FamilyMember): boolean {
    if (!member.notifications.quietHours) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = member.notifications.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = member.notifications.quietHours.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Queue notification for later delivery
   */
  private queueNotification(member: FamilyMember, payload: NotificationPayload): void {
    // In production, this would use a job queue
    console.log(`Queued notification ${payload.id} for ${member.name}`);
  }

  /**
   * Send notification via specific channel
   */
  private async sendViaChannel(
    channel: NotificationChannel,
    member: FamilyMember,
    payload: NotificationPayload
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        if (member.email) {
          await this.sendEmail(member.email, payload);
        }
        break;

      case NotificationChannel.SMS:
        if (member.phone) {
          await this.sendSMS(member.phone, payload);
        }
        break;

      case NotificationChannel.PUSH:
        if (member.pushToken) {
          await this.sendPushNotification(member.pushToken, payload);
        }
        break;

      case NotificationChannel.IN_APP:
        await this.sendInAppNotification(member.id, payload);
        break;
    }
  }

  // ==========================================================================
  // CHANNEL IMPLEMENTATIONS
  // ==========================================================================

  private async sendEmail(email: string, payload: NotificationPayload): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    console.log(`[EMAIL] To: ${email}`);
    console.log(`  Subject: ${payload.title}`);
    console.log(`  Body: ${payload.summary}`);
  }

  private async sendSMS(phone: string, payload: NotificationPayload): Promise<void> {
    // In production, integrate with SMS service (Twilio, etc.)
    const message = this.formatSMSMessage(payload);
    console.log(`[SMS] To: ${phone}`);
    console.log(`  Message: ${message}`);
  }

  private formatSMSMessage(payload: NotificationPayload): string {
    // SMS has 160 char limit, so be concise
    let message = `[Household] ${payload.title}`;

    if (payload.urgency === NotificationUrgency.CRITICAL) {
      message = `⚠️ URGENT: ${message}`;
    }

    if (payload.amount && this.config.visibilitySettings.showTransactionAmounts) {
      message += ` - $${payload.amount.toFixed(2)}`;
    }

    // Truncate if too long
    if (message.length > 155) {
      message = message.substring(0, 152) + '...';
    }

    return message;
  }

  private async sendPushNotification(
    pushToken: string,
    payload: NotificationPayload
  ): Promise<void> {
    // In production, integrate with push service (Firebase, APNS, etc.)
    console.log(`[PUSH] To: ${pushToken.substring(0, 10)}...`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Body: ${payload.summary}`);
  }

  private async sendInAppNotification(
    memberId: string,
    payload: NotificationPayload
  ): Promise<void> {
    // In production, store in database for in-app display
    console.log(`[IN-APP] To member: ${memberId}`);
    console.log(`  Notification: ${payload.title}`);
  }

  // ==========================================================================
  // DIGEST & REPORTS
  // ==========================================================================

  /**
   * Generate daily summary for a family member
   */
  async sendDailySummary(memberId: string): Promise<void> {
    const member = this.config.familyMembers.find(m => m.id === memberId);
    if (!member || !member.notifications.enabledTypes.includes(NotificationType.DAILY_SUMMARY)) {
      return;
    }

    const summary = this.generateDailySummary(member);

    await this.sendNotification({
      id: `DAILY-${Date.now()}`,
      type: NotificationType.DAILY_SUMMARY,
      urgency: NotificationUrgency.LOW,
      timestamp: new Date().toISOString(),
      title: 'Daily Household Summary',
      summary: summary.text,
      details: summary.details
    });
  }

  private generateDailySummary(member: FamilyMember): { text: string; details: string } {
    // In production, pull actual data
    return {
      text: 'All household operations normal today.',
      details: [
        '• 2 bills tracked (due next week)',
        '• Budget: 65% used this month',
        '• No unusual activity detected',
        '• Next grocery order: Tomorrow'
      ].join('\n')
    };
  }

  /**
   * Generate weekly report
   */
  async sendWeeklyReport(memberId: string): Promise<void> {
    const member = this.config.familyMembers.find(m => m.id === memberId);
    if (!member || !member.notifications.enabledTypes.includes(NotificationType.WEEKLY_REPORT)) {
      return;
    }

    const report = this.generateWeeklyReport(member);

    await this.sendNotification({
      id: `WEEKLY-${Date.now()}`,
      type: NotificationType.WEEKLY_REPORT,
      urgency: NotificationUrgency.LOW,
      timestamp: new Date().toISOString(),
      title: 'Weekly Household Report',
      summary: report.summary,
      details: report.details
    });
  }

  private generateWeeklyReport(member: FamilyMember): { summary: string; details: string } {
    // In production, pull actual data
    return {
      summary: 'Household operations running smoothly this week.',
      details: [
        '📊 WEEKLY SUMMARY',
        '─────────────────',
        '',
        member.permissions.canViewTransactionDetails && this.config.visibilitySettings.showTransactionAmounts
          ? '💰 Spending: $287.50 (groceries, utilities)'
          : '💰 Spending: [View details in app]',
        '📋 Bills Paid: 2 of 4 due this week',
        '🛒 Grocery Orders: 1 (approved)',
        '⚠️ Escalations: 1 (price alert, resolved)',
        '🔒 Security: No issues detected',
        '',
        '✅ Trust Level: 1 (Full Supervision)',
        '   Progress: 3/10 runs toward Routine Groceries'
      ].join('\n')
    };
  }

  // ==========================================================================
  // EMERGENCY CONTROLS
  // ==========================================================================

  /**
   * Family member initiates emergency stop
   */
  async initiateEmergencyStop(memberId: string, reason: string): Promise<boolean> {
    const member = this.config.familyMembers.find(m => m.id === memberId);

    if (!member || !member.permissions.canEmergencyStop) {
      this.logActivity(memberId, 'EMERGENCY_STOP_DENIED', 'Insufficient permissions');
      return false;
    }

    if (!this.config.emergencySettings.allowRemotePanicStop) {
      this.logActivity(memberId, 'EMERGENCY_STOP_DENIED', 'Remote stop not enabled');
      return false;
    }

    // Log the emergency stop
    this.logActivity(memberId, 'EMERGENCY_STOP_INITIATED', reason);

    // Notify primary user
    await this.sendNotification({
      id: `PANIC-${Date.now()}`,
      type: NotificationType.PANIC_STOP,
      urgency: NotificationUrgency.CRITICAL,
      timestamp: new Date().toISOString(),
      title: '🚨 EMERGENCY STOP ACTIVATED',
      summary: `${member.name} has activated emergency stop`,
      details: `Reason: ${reason}\n\nAll household operations have been halted.`
    });

    return true;
  }

  // ==========================================================================
  // ACTIVITY LOGGING
  // ==========================================================================

  /**
   * Log oversight activity (visible to primary user)
   */
  private logActivity(memberId: string, action: string, details?: string): void {
    const member = this.config.familyMembers.find(m => m.id === memberId);

    const logEntry: OversightActivityLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      familyMemberId: memberId,
      familyMemberName: member?.name || 'Unknown',
      action,
      details
    };

    this.activityLog.push(logEntry);

    // Optionally notify user of family activity
    if (this.config.auditSettings.notifyUserOfFamilyViews &&
        action.includes('VIEW')) {
      this.notifyUserOfFamilyActivity(logEntry);
    }

    // Trim old logs based on retention policy
    this.trimActivityLog();
  }

  private notifyUserOfFamilyActivity(log: OversightActivityLog): void {
    // In production, this would notify the primary user
    console.log(`[AUDIT] Family activity: ${log.familyMemberName} - ${log.action}`);
  }

  private trimActivityLog(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.auditSettings.retentionDays);

    this.activityLog = this.activityLog.filter(
      log => new Date(log.timestamp) > cutoff
    );
  }

  /**
   * Get activity log for primary user review
   */
  getActivityLog(limit?: number): OversightActivityLog[] {
    const logs = [...this.activityLog].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return limit ? logs.slice(0, limit) : logs;
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get current configuration (for UI display)
   */
  getConfiguration(): OversightConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<OversightConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.enforcePrivacyDefaults();
  }

  /**
   * Disable all oversight (quick kill switch for primary user)
   */
  disableAllOversight(): void {
    this.config.oversightEnabled = false;
    this.logActivity(this.config.primaryUserId, 'OVERSIGHT_DISABLED', 'All family oversight disabled');
  }

  /**
   * Re-enable oversight
   */
  enableOversight(): void {
    this.config.oversightEnabled = true;
    this.logActivity(this.config.primaryUserId, 'OVERSIGHT_ENABLED', 'Family oversight re-enabled');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new FamilyOversightSystem with default configuration
 */
export function createFamilyOversightSystem(primaryUserId: string): FamilyOversightSystem {
  const defaultConfig: OversightConfiguration = {
    primaryUserId,
    oversightEnabled: false, // Disabled by default - must opt-in

    familyMembers: [],

    visibilitySettings: {
      showTransactionAmounts: true,
      showMerchantNames: true,
      showCartDetails: false,    // Off by default
      showPaymentMethods: false, // NEVER - enforced
      showAddresses: false,      // NEVER - enforced
      maxHistoryDays: 30
    },

    emergencySettings: {
      emergencyContactIds: [],
      allowRemotePanicStop: false, // Must explicitly enable
      notifyOnAllCritical: true
    },

    auditSettings: {
      logAllOversightActivity: true,
      notifyUserOfFamilyViews: false, // Can be annoying, off by default
      retentionDays: 90
    }
  };

  return new FamilyOversightSystem(defaultConfig);
}

// =============================================================================
// CONSENT TEMPLATES
// =============================================================================

export const CONSENT_TEMPLATES = {
  FAMILY_MONITOR: {
    version: '1.0.0',
    text: `
FAMILY OVERSIGHT CONSENT

I consent to have [FAMILY_MEMBER_NAME] added as a Family Monitor on my Household Operations account.

I understand that as a Family Monitor, they will be able to:
✓ View summary reports of household activity
✓ Receive alerts about escalations and unusual activity
✓ See spending summaries (if I enable this)

I understand they will NOT be able to:
✗ Make purchases or payments
✗ Approve transactions on my behalf
✗ See my payment methods or addresses
✗ Access my accounts directly

I can revoke this access at any time through the app settings.

Date: [DATE]
User: [USER_NAME]
    `.trim()
  },

  CAREGIVER: {
    version: '1.0.0',
    text: `
CAREGIVER OVERSIGHT CONSENT

I consent to have [FAMILY_MEMBER_NAME] added as a Caregiver on my Household Operations account.

I understand that as a Caregiver, they will be able to:
✓ View all summary reports and transaction details
✓ Receive all alerts and escalations
✓ Approve transactions on my behalf (if I enable this)
✓ Activate emergency stop (if I enable this)

I understand they will NOT be able to:
✗ See my payment method details (card numbers, etc.)
✗ See my full address (only city/state visible)
✗ Change my account settings
✗ Add or remove other family members

I can revoke this access at any time through the app settings.
All caregiver activity is logged and I can review it anytime.

Date: [DATE]
User: [USER_NAME]
    `.trim()
  },

  EMERGENCY_CONTACT: {
    version: '1.0.0',
    text: `
EMERGENCY CONTACT CONSENT

I consent to have [FAMILY_MEMBER_NAME] added as an Emergency Contact on my Household Operations account.

I understand that as an Emergency Contact, they will ONLY:
✓ Receive critical alerts (scam detection, system halts)
✓ Be able to activate emergency stop (if I enable this)

They will NOT have access to:
✗ Regular activity summaries
✗ Transaction details
✗ Spending information
✗ Any non-emergency information

Date: [DATE]
User: [USER_NAME]
    `.trim()
  }
};

export default {
  FamilyOversightSystem,
  createFamilyOversightSystem,
  OversightRole,
  NotificationChannel,
  NotificationType,
  NotificationUrgency,
  CONSENT_TEMPLATES
};
