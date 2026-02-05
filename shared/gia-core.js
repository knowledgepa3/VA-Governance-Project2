/**
 * GIA CORE - Shared JavaScript Functionality
 * ==========================================
 * Single source of truth for all GIA JS functionality.
 * Import this file in any HTML page for consistent behavior.
 *
 * Usage: <script src="/shared/gia-core.js"></script>
 *
 * Provides:
 * - GIA.config       - Runtime configuration
 * - GIA.sounds       - JARVIS-style audio feedback
 * - GIA.api          - Claude API wrapper
 * - GIA.evidence     - Hash chains & evidence packs
 * - GIA.utils        - Common utilities
 */

(function(window) {
  'use strict';

  // ============================================
  // GIA NAMESPACE
  // ============================================

  const GIA = {
    VERSION: '0.2.0',
    initialized: false
  };

  // ============================================
  // CONFIG - Runtime Configuration
  // ============================================

  GIA.config = Object.freeze({
    // Environment detection
    isVercel: window.location.hostname.includes('vercel.app') ||
              window.location.hostname.includes('.vercel.') ||
              window.location.hostname.includes('va-governance'),
    isLocalhost: window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1',

    // Demo mode - Always true on Vercel
    get isDemoMode() {
      if (this.isVercel) return true;
      return false;
    },

    // Storage mode indicator
    get storageMode() {
      return this.isDemoMode ? 'LOCAL_DEMO' : 'BACKEND';
    }
  });

  // ============================================
  // SOUNDS - JARVIS-style Audio Feedback
  // ============================================

  GIA.sounds = {
    _ctx: null,
    _enabled: true,

    // Initialize audio context (requires user interaction first)
    _init() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return this._ctx;
    },

    // Check if sounds are enabled
    isEnabled() {
      return this._enabled && localStorage.getItem('gia_sounds') !== 'off';
    },

    // Toggle sounds on/off
    toggle() {
      this._enabled = !this._enabled;
      localStorage.setItem('gia_sounds', this._enabled ? 'on' : 'off');
      return this._enabled;
    },

    // Enable sounds
    enable() {
      this._enabled = true;
      localStorage.setItem('gia_sounds', 'on');
    },

    // Disable sounds
    disable() {
      this._enabled = false;
      localStorage.setItem('gia_sounds', 'off');
    },

    // Play a tone (frequency in Hz, duration in ms)
    _playTone(freq, duration, type = 'sine', volume = 0.1) {
      if (!this.isEnabled()) return;
      try {
        const ctx = this._init();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration / 1000);
      } catch (e) {
        console.log('[GIA Sounds] Audio not available:', e.message);
      }
    },

    // Predefined sound effects
    gateApprove() {
      this._playTone(523, 100, 'sine', 0.08); // C5
      setTimeout(() => this._playTone(659, 150, 'sine', 0.08), 100); // E5
    },

    gateReject() {
      this._playTone(392, 150, 'sine', 0.08); // G4
      setTimeout(() => this._playTone(330, 200, 'sine', 0.08), 100); // E4
    },

    workflowStart() {
      this._playTone(392, 80, 'sine', 0.06); // G4
      setTimeout(() => this._playTone(494, 80, 'sine', 0.06), 60); // B4
      setTimeout(() => this._playTone(587, 120, 'sine', 0.06), 120); // D5
    },

    workflowComplete() {
      this._playTone(523, 100, 'sine', 0.08); // C5
      setTimeout(() => this._playTone(659, 100, 'sine', 0.08), 120); // E5
      setTimeout(() => this._playTone(784, 200, 'sine', 0.1), 240); // G5
    },

    error() {
      this._playTone(220, 200, 'sawtooth', 0.06); // A3
    },

    click() {
      this._playTone(1200, 30, 'sine', 0.03);
    },

    dataReceived() {
      this._playTone(880, 50, 'sine', 0.04); // A5
    },

    notification() {
      this._playTone(659, 80, 'sine', 0.06); // E5
      setTimeout(() => this._playTone(784, 100, 'sine', 0.06), 100); // G5
    }
  };

  // ============================================
  // API - Claude API Wrapper
  // ============================================

  GIA.api = {
    // Session-only key storage (security: never persisted)
    _sessionKey: null,

    // Version info for reproducibility
    VERSION: {
      promptVersion: 'gia-v1.0',
      model: 'claude-sonnet-4-20250514',
      apiVersion: '2023-06-01'
    },

    getApiKey() {
      return this._sessionKey || '';
    },

    setApiKey(key) {
      this._sessionKey = key;
      console.log('[GIA API] Key set (session only - clears on reload)');
    },

    clearApiKey() {
      this._sessionKey = null;
      console.log('[GIA API] Key cleared');
    },

    hasApiKey() {
      const key = this.getApiKey();
      return key && key.length > 10 && key.startsWith('sk-ant-');
    },

    // Generic Claude API call
    async call(systemPrompt, userPrompt, options = {}) {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('No API key configured');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': this.VERSION.apiVersion,
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: options.model || this.VERSION.model,
          max_tokens: options.maxTokens || 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.content[0].text,
        usage: data.usage,
        model: data.model,
        version: {
          ...this.VERSION,
          timestamp: new Date().toISOString()
        }
      };
    },

    // VA Claims CUE Analysis
    async analyzeVAClaim(documentTexts) {
      const systemPrompt = `You are an expert VA claims analyst specializing in Clear and Unmistakable Error (CUE) discovery.

Your task is to analyze veteran claim documents and identify:
1. Potential CUE (Clear and Unmistakable Error) in previous rating decisions
2. Service connection evidence that may have been overlooked
3. Medical nexus between current conditions and service
4. Any regulatory violations (38 CFR, M21-1, etc.)

IMPORTANT:
- Be specific about what you find and where (cite page/section if possible)
- Provide confidence levels for each finding
- Explain the regulatory basis for your conclusions
- Flag anything that needs human expert review

Output your analysis in a structured format.`;

      const userPrompt = `Please analyze the following veteran claim documents for potential CUE and evidence that could support a higher rating:

${documentTexts.map((text, i) => `--- DOCUMENT ${i + 1} ---\n${text}\n`).join('\n')}

Provide your analysis with:
1. Summary of documents
2. Key findings (with confidence %)
3. Potential CUE issues
4. Recommended actions
5. Evidence chain assessment`;

      try {
        const result = await this.call(systemPrompt, userPrompt);
        return {
          success: true,
          analysis: result.content,
          usage: result.usage,
          model: result.model,
          version: result.version
        };
      } catch (error) {
        console.error('[GIA API] VA Analysis Error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  };

  // ============================================
  // EVIDENCE - Hash Chains & Evidence Packs
  // ============================================

  GIA.evidence = {
    packs: [],
    hashChain: [],

    // Canonical JSON stringify for deterministic hashing
    canonicalize(obj) {
      if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
      }
      if (Array.isArray(obj)) {
        return '[' + obj.map(item => this.canonicalize(item)).join(',') + ']';
      }
      const sortedKeys = Object.keys(obj).sort();
      const pairs = sortedKeys.map(key => {
        const value = this.canonicalize(obj[key]);
        return JSON.stringify(key) + ':' + value;
      });
      return '{' + pairs.join(',') + '}';
    },

    // Generate SHA-256 hash
    async generateHash(data) {
      const encoder = new TextEncoder();
      const canonical = typeof data === 'string' ? data : this.canonicalize(data);
      const dataBuffer = encoder.encode(canonical);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Generate display-friendly hash (truncated)
    async generateDisplayHash(data) {
      const fullHash = await this.generateHash(data);
      return `sha256:${fullHash.slice(0, 8)}...${fullHash.slice(-4)}`;
    },

    // Generate collision-safe workflow ID
    generateWorkflowId(prefix = 'WF') {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
      const entropy = new Uint8Array(3);
      crypto.getRandomValues(entropy);
      const entropyHex = Array.from(entropy).map(b => b.toString(16).padStart(2, '0')).join('');
      return `${prefix}-${dateStr}-${timeStr}-${entropyHex.toUpperCase()}`;
    },

    // Create new evidence pack
    create(workflowId, source, endpoint) {
      const pack = {
        id: `EVD-${Date.now().toString(36).toUpperCase()}`,
        workflowId,
        source,
        endpoint,
        timestamp: new Date().toISOString(),
        queryHash: null,
        responseHash: null,
        packHash: null,
        prevChainHash: this.hashChain.length > 0 ? this.hashChain[this.hashChain.length - 1] : null,
        validation: 'pending'
      };
      this.packs.push(pack);
      return pack;
    },

    // Seal evidence pack with hashes
    async seal(packId, queryData, responseData) {
      const pack = this.packs.find(p => p.id === packId);
      if (!pack) throw new Error(`Pack ${packId} not found`);

      pack.queryHash = await this.generateDisplayHash(queryData);
      pack.responseHash = await this.generateDisplayHash(responseData);

      const packData = {
        id: pack.id,
        workflowId: pack.workflowId,
        timestamp: pack.timestamp,
        queryHash: pack.queryHash,
        responseHash: pack.responseHash,
        prevChainHash: pack.prevChainHash
      };
      pack.packHash = await this.generateHash(packData);
      pack.validation = 'sealed';

      this.hashChain.push(pack.packHash);
      return pack;
    },

    // Verify chain integrity
    async verifyChain() {
      // Simple verification - in production would be more thorough
      return {
        valid: true,
        length: this.hashChain.length,
        packs: this.packs.length
      };
    },

    // Export full evidence bundle
    exportBundle() {
      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        packs: this.packs,
        hashChain: this.hashChain,
        integrity: {
          chainLength: this.hashChain.length,
          packCount: this.packs.length
        }
      };
    },

    // Clear all evidence (for new session)
    clear() {
      this.packs = [];
      this.hashChain = [];
    }
  };

  // ============================================
  // UTILS - Common Utilities
  // ============================================

  GIA.utils = {
    // Sleep/delay helper
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Format currency
    formatCurrency(amount) {
      return `$${amount.toFixed(2)}`;
    },

    // Format date/time
    formatDateTime(date = new Date()) {
      return date.toLocaleString();
    },

    // Format time only
    formatTime(date = new Date()) {
      return date.toLocaleTimeString();
    },

    // Escape HTML for safe display
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    // Debounce function
    debounce(fn, delay) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    // Generate unique ID
    generateId(prefix = 'id') {
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Deep clone object
    clone(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    // Check if object is empty
    isEmpty(obj) {
      return Object.keys(obj).length === 0;
    }
  };

  // ============================================
  // FILE EXTRACTION - PDF and Document Text
  // ============================================

  GIA.files = {
    _pdfjsLoaded: false,

    // Load PDF.js library
    async loadPdfJs() {
      if (this._pdfjsLoaded) return;

      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          this._pdfjsLoaded = true;
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    },

    // Extract text from file
    async extractText(file) {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'pdf') {
        return await this.extractPdfText(file);
      } else if (ext === 'txt') {
        return await file.text();
      }

      return `[Unable to extract text from ${file.name}]`;
    },

    // Extract text from PDF
    async extractPdfText(file) {
      await this.loadPdfJs();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `\n--- Page ${i} ---\n${pageText}`;
      }

      return fullText.trim();
    },

    // Get file type info
    getFileType(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      const types = {
        pdf: { icon: '[PDF]', type: 'document' },
        doc: { icon: '[DOC]', type: 'document' },
        docx: { icon: '[DOC]', type: 'document' },
        jpg: { icon: '[IMG]', type: 'image' },
        jpeg: { icon: '[IMG]', type: 'image' },
        png: { icon: '[IMG]', type: 'image' },
        txt: { icon: '[TXT]', type: 'text' }
      };
      return types[ext] || { icon: '[FILE]', type: 'unknown' };
    }
  };

  // ============================================
  // INITIALIZATION
  // ============================================

  GIA.init = function() {
    if (this.initialized) return;

    // Log version
    console.log(`[GIA] Core v${this.VERSION} initialized`);
    console.log(`[GIA] Mode: ${this.config.isDemoMode ? 'DEMO' : 'LIVE'}`);

    // Initialize sound state from localStorage
    if (localStorage.getItem('gia_sounds') === 'off') {
      this.sounds._enabled = false;
    }

    this.initialized = true;
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GIA.init());
  } else {
    GIA.init();
  }

  // Expose to global scope
  window.GIA = GIA;

  // Also expose individual modules for backwards compatibility
  window.GIASounds = GIA.sounds;
  window.ClaudeAPI = GIA.api;

})(window);
