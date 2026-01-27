/**
 * Input Validation and Sanitization Service
 *
 * Provides comprehensive validation for:
 * - URLs (preventing navigation hijacking)
 * - File inputs
 * - User inputs
 * - Playbook variables
 */

import { logger } from './logger';
import { configService } from './configService';

const log = logger.child('Validation');

// URL validation
export interface URLValidationResult {
  valid: boolean;
  sanitizedUrl?: string;
  error?: string;
  warnings: string[];
}

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];
const SUSPICIOUS_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /<script/i,
  /on\w+=/i,  // Event handlers
  /&#/,        // HTML entities
  /%3C/i,      // URL encoded <
  /%3E/i       // URL encoded >
];

export function validateURL(url: string): URLValidationResult {
  const warnings: string[] = [];

  try {
    // Trim and basic cleanup
    const trimmed = url.trim();

    if (!trimmed) {
      return { valid: false, error: 'URL is empty', warnings };
    }

    // Check length
    if (trimmed.length > 2048) {
      return { valid: false, error: 'URL exceeds maximum length', warnings };
    }

    // Parse URL
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      // Try adding https:// if no protocol
      try {
        parsed = new URL('https://' + trimmed);
        warnings.push('Added https:// protocol');
      } catch {
        return { valid: false, error: 'Invalid URL format', warnings };
      }
    }

    // Check protocol
    if (DANGEROUS_PROTOCOLS.some(p => parsed.protocol.toLowerCase().startsWith(p))) {
      log.warn('Dangerous protocol detected', { url: trimmed, protocol: parsed.protocol });
      return { valid: false, error: `Dangerous protocol: ${parsed.protocol}`, warnings };
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol.toLowerCase())) {
      return { valid: false, error: `Unsupported protocol: ${parsed.protocol}`, warnings };
    }

    // Check for suspicious patterns in URL
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        log.warn('Suspicious URL pattern detected', { url: trimmed, pattern: pattern.toString() });
        return { valid: false, error: 'URL contains suspicious patterns', warnings };
      }
    }

    // Check domain against blocklist
    const securityConfig = configService.getSecurityConfig();
    if (!configService.isDomainAllowed(parsed.hostname)) {
      return {
        valid: false,
        error: `Domain not allowed: ${parsed.hostname}`,
        warnings
      };
    }

    // Enforce HTTPS in production
    if (securityConfig.requireHttps && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      warnings.push('Upgraded to HTTPS');
    }

    return {
      valid: true,
      sanitizedUrl: parsed.toString(),
      warnings
    };
  } catch (error) {
    log.error('URL validation error', { url, error: String(error) });
    return { valid: false, error: 'URL validation failed', warnings };
  }
}

// File validation
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
  sanitizedName?: string;
}

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.js', '.jse', '.wsf', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.jar', '.class',
  '.sh', '.bash', '.zsh',
  '.dll', '.sys', '.drv'
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.rtf', '.csv',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff',
  '.json', '.xml', '.yaml', '.yml'
];

export function validateFile(
  filename: string,
  size: number,
  type: string
): FileValidationResult {
  const warnings: string[] = [];

  try {
    // Sanitize filename
    const sanitized = filename
      .replace(/[<>:"/\\|?*]/g, '_')  // Remove dangerous chars
      .replace(/\.\./g, '_')           // Prevent path traversal
      .replace(/^\./, '_')             // No hidden files
      .slice(0, 255);                  // Limit length

    if (sanitized !== filename) {
      warnings.push('Filename was sanitized');
    }

    // Check extension
    const ext = '.' + sanitized.split('.').pop()?.toLowerCase();

    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Dangerous file type: ${ext}`,
        warnings
      };
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      warnings.push(`Uncommon file extension: ${ext}`);
    }

    // Check size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (size > MAX_SIZE) {
      return {
        valid: false,
        error: `File too large: ${(size / 1024 / 1024).toFixed(2)}MB (max 50MB)`,
        warnings
      };
    }

    if (size === 0) {
      warnings.push('File is empty');
    }

    // Check MIME type consistency
    const expectedTypes: Record<string, string[]> = {
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.json': ['application/json', 'text/json'],
      '.txt': ['text/plain']
    };

    if (expectedTypes[ext] && !expectedTypes[ext].includes(type)) {
      warnings.push(`MIME type mismatch: expected ${expectedTypes[ext].join(' or ')}, got ${type}`);
    }

    return {
      valid: true,
      sanitizedName: sanitized,
      warnings
    };
  } catch (error) {
    log.error('File validation error', { filename, error: String(error) });
    return { valid: false, error: 'File validation failed', warnings };
  }
}

// Playbook variable validation
export interface VariableValidationResult {
  valid: boolean;
  sanitizedValue?: string;
  error?: string;
}

const VARIABLE_PATTERNS: Record<string, RegExp> = {
  rfp_number: /^[A-Z0-9\-_]{5,50}$/i,
  agency_name: /^[A-Za-z0-9\s\-\.&',]{2,100}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  url: /^https?:\/\/.+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  amount: /^\$?[\d,]+(\.\d{2})?$/
};

export function validatePlaybookVariable(
  name: string,
  value: string,
  type?: string
): VariableValidationResult {
  try {
    // Basic checks
    if (!value || typeof value !== 'string') {
      return { valid: false, error: 'Value must be a non-empty string' };
    }

    // Length check
    if (value.length > 1000) {
      return { valid: false, error: 'Value exceeds maximum length (1000 chars)' };
    }

    // Remove potential injection patterns
    const sanitized = value
      .replace(/\\/g, '\\\\')    // Escape backslashes
      .replace(/\$/g, '\\$')     // Escape dollar signs
      .replace(/`/g, '\\`')      // Escape backticks
      .replace(/\$\{/g, '\\${')  // Escape template literals
      .replace(/[<>]/g, '')      // Remove angle brackets
      .trim();

    // Type-specific validation
    if (type && VARIABLE_PATTERNS[type]) {
      if (!VARIABLE_PATTERNS[type].test(sanitized)) {
        return {
          valid: false,
          error: `Value doesn't match expected pattern for ${type}`
        };
      }
    }

    // Check for shell metacharacters in critical variables
    const shellMeta = /[;&|`$(){}[\]]/;
    if (shellMeta.test(value)) {
      log.warn('Shell metacharacters in variable', { name, value: value.slice(0, 50) });
      // Still allow but sanitize
    }

    return {
      valid: true,
      sanitizedValue: sanitized
    };
  } catch (error) {
    log.error('Variable validation error', { name, error: String(error) });
    return { valid: false, error: 'Variable validation failed' };
  }
}

// HTML content sanitization (for display)
export function sanitizeForDisplay(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// JSON input validation
export function validateJSONInput(
  input: string,
  maxDepth: number = 10,
  maxSize: number = 1000000
): { valid: boolean; parsed?: unknown; error?: string } {
  try {
    if (input.length > maxSize) {
      return { valid: false, error: `JSON exceeds maximum size (${maxSize} bytes)` };
    }

    const parsed = JSON.parse(input);

    // Check depth
    const checkDepth = (obj: unknown, depth: number): boolean => {
      if (depth > maxDepth) return false;
      if (typeof obj !== 'object' || obj === null) return true;

      for (const value of Object.values(obj)) {
        if (!checkDepth(value, depth + 1)) return false;
      }
      return true;
    };

    if (!checkDepth(parsed, 0)) {
      return { valid: false, error: `JSON exceeds maximum depth (${maxDepth})` };
    }

    return { valid: true, parsed };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

// Email validation
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email too long' };
  }

  return { valid: true };
}
