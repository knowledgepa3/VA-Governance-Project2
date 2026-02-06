/**
 * ACE Agent Chat - Conversational Interface for the ACE Assistant
 *
 * Talk to ACE naturally:
 * - "Create a case for John Smith, PTSD claim, Iraq vet 2008-2012"
 * - "Run research for case #123"
 * - "What's the status of all my cases?"
 * - "Draft an email to the client about their evidence package"
 *
 * The agent uses governed tools that inherit ACE's domain restrictions,
 * gates, and evidence capture automatically.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Play,
  Package,
  Mail,
  Search,
  BarChart3,
  Briefcase,
  ChevronRight,
  Shield,
  Zap,
  RefreshCw,
  Settings,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';
import { execute as governedExecute } from '../services/governedLLM';
import type { ContentBlock, ToolDefinition } from '../llm/types';
import { ACE_AGENT_TOOLS, getToolByName, ToolResult } from '../services/aceAgentTools';
import { CLAIM_TYPE_LABELS, ClaimType } from '../services/caseManager';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCall?: {
    name: string;
    params: Record<string, any>;
    result?: ToolResult;
    status: 'pending' | 'running' | 'complete' | 'error';
  };
}

interface AgentState {
  isThinking: boolean;
  currentTool: string | null;
  error: string | null;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are ACE, a fast AI assistant for quick VA disability claims case management. You handle:

1. CREATE CASES - Gather client info (name, email, service dates, conditions) and create cases
2. LIST/SEARCH CASES - Quick lookups of case status and details
3. UPDATE STATUS - Mark cases as researching, evidence-ready, etc.
4. TRIGGER RESEARCH BUNDLES - Queue governed research for execution
5. DRAFT QUICK COMMS - Simple email drafts and notes

YOUR ROLE IN THE SYSTEM:
- You handle QUICK tasks (case CRUD, status checks, simple questions)
- COMPLEX work (browser automation, deep research) is executed by Claude Code with Chrome MCP
- When you trigger a bundle, it queues for execution - the human + Claude Code will run it
- Everything you do inherits ACE governance automatically

ACE GOVERNANCE (ALWAYS ENFORCED):
- Domain allowlist: Only .gov sites (va.gov, ecfr.gov, benefits.va.gov)
- Evidence hashing: All captured data gets SHA-256 hash
- Audit trail: Every action is logged
- Human gates: Sensitive actions require approval
- Stop conditions: Auto-halt on login pages, payment forms, errors

AVAILABLE TOOLS:
${ACE_AGENT_TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

CLAIM TYPES:
${Object.entries(CLAIM_TYPE_LABELS).map(([key, label]) => `- ${key}: ${label}`).join('\n')}

GUIDELINES:
- Be FAST and concise - you're Haiku, optimized for speed
- Confirm case details before creating
- When triggering bundles, explain what will happen next
- For complex analysis questions, suggest the user ask Claude Code directly

STYLE: Brief, professional, action-oriented. No fluff.`;

// ============================================================================
// COMPONENT
// ============================================================================

interface ACEAgentChatProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export function ACEAgentChat({
  isOpen = true,
  onClose,
  isMinimized = false,
  onMinimize
}: ACEAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm ACE, your VA claims assistant. I can help you:

• **Create cases** for new clients
• **Run governed research** using official sources
• **Track case status** and evidence
• **Draft communications** to clients

What would you like to do today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [agentState, setAgentState] = useState<AgentState>({
    isThinking: false,
    currentTool: null,
    error: null
  });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick suggestions
  const suggestions = [
    { icon: <Briefcase className="w-3 h-3" />, text: "Create a new case", action: "I need to create a new case" },
    { icon: <Search className="w-3 h-3" />, text: "List all cases", action: "Show me all my cases" },
    { icon: <Play className="w-3 h-3" />, text: "Run research", action: "Run research for a case" },
    { icon: <BarChart3 className="w-3 h-3" />, text: "Case stats", action: "Give me case statistics" }
  ];

  // Execute a tool
  const executeTool = async (toolName: string, params: Record<string, any>): Promise<ToolResult> => {
    const tool = getToolByName(toolName);
    if (!tool) {
      return { success: false, message: `Unknown tool: ${toolName}` };
    }

    setAgentState(prev => ({ ...prev, currentTool: toolName }));

    try {
      const result = await tool.execute(params);
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Tool execution failed: ${error}`,
        error: String(error)
      };
    } finally {
      setAgentState(prev => ({ ...prev, currentTool: null }));
    }
  };

  // Send message to Claude
  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || agentState.isThinking) return;

    // Add user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setAgentState({ isThinking: true, currentTool: null, error: null });

    try {
      // Build conversation history for Claude
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      // Add current message
      conversationHistory.push({ role: 'user', content: userMessage });

      // Convert tools to governed kernel format
      const governedTools: ToolDefinition[] = ACE_AGENT_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object' as const,
          properties: Object.fromEntries(
            tool.parameters.map(p => [
              p.name,
              {
                type: p.type,
                description: p.description,
                ...(p.enum ? { enum: p.enum } : {})
              }
            ])
          ),
          required: tool.parameters.filter(p => p.required).map(p => p.name)
        }
      }));

      // Call through governed kernel (uses Haiku tier for fast case management)
      let result = await governedExecute({
        role: 'ACE_AGENT_CHAT',
        purpose: 'case-management',
        systemPrompt: SYSTEM_PROMPT,
        userMessage: '',
        messages: conversationHistory as any,
        tools: governedTools,
        maxTokens: 2048,
        tier: 'fast' as any
      });

      // Handle tool calls in a loop
      while (result.stopReason === 'tool_use') {
        const toolUseBlock = result.contentBlocks?.find(
          (block): block is ContentBlock & { type: 'tool_use' } => block.type === 'tool_use'
        );

        if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break;

        // Show tool call in UI
        const toolMsg: Message = {
          id: `tool-${Date.now()}`,
          role: 'tool',
          content: `Running: ${toolUseBlock.name}`,
          timestamp: new Date().toISOString(),
          toolCall: {
            name: toolUseBlock.name,
            params: toolUseBlock.input as Record<string, any>,
            status: 'running'
          }
        };
        setMessages(prev => [...prev, toolMsg]);

        // Execute the tool
        const toolResult = await executeTool(
          toolUseBlock.name,
          toolUseBlock.input as Record<string, any>
        );

        // Update tool message with result
        setMessages(prev => prev.map(m =>
          m.id === toolMsg.id
            ? {
                ...m,
                toolCall: {
                  ...m.toolCall!,
                  result: toolResult,
                  status: toolResult.success ? 'complete' : 'error'
                }
              }
            : m
        ));

        // Continue conversation with tool result
        conversationHistory.push({
          role: 'assistant',
          content: result.contentBlocks || result.content
        } as any);
        conversationHistory.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult)
          }]
        } as any);

        result = await governedExecute({
          role: 'ACE_AGENT_CHAT',
          purpose: 'case-management-tool-followup',
          systemPrompt: SYSTEM_PROMPT,
          userMessage: '',
          messages: conversationHistory as any,
          tools: governedTools,
          maxTokens: 2048,
          tier: 'fast' as any
        });
      }

      // Extract text response
      if (result.content) {
        const assistantMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }

    } catch (error) {
      console.error('[ACE Agent] Error:', error);
      setAgentState(prev => ({ ...prev, error: String(error) }));

      const errorMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `I encountered an error: ${error}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setAgentState(prev => ({ ...prev, isThinking: false }));
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Handle suggestion click
  const handleSuggestion = (action: string) => {
    sendMessage(action);
  };

  // Render a message
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isTool = message.role === 'tool';

    if (isTool && message.toolCall) {
      return (
        <div key={message.id} className="flex justify-start mb-3">
          <div className="max-w-[85%] bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {message.toolCall.status === 'running' ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : message.toolCall.status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm font-medium text-slate-300">
                {message.toolCall.name.replace(/_/g, ' ')}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                message.toolCall.status === 'complete'
                  ? 'bg-green-500/20 text-green-400'
                  : message.toolCall.status === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}>
                {message.toolCall.status}
              </span>
            </div>
            {message.toolCall.result && (
              <div className="text-xs text-slate-400 mt-1">
                {message.toolCall.result.message}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
            isUser ? 'bg-cyan-600' : 'bg-gradient-to-r from-cyan-500 to-purple-500'
          }`}>
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>
          <div className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-100 border border-slate-700'
          }`}>
            <div
              className="text-sm whitespace-pre-wrap prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br />')
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div
        onClick={onMinimize}
        className="fixed bottom-4 right-4 w-64 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg p-3 cursor-pointer hover:from-cyan-500 hover:to-purple-500 transition-all shadow-lg z-50"
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-medium">ACE Assistant</span>
          </div>
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[420px] h-[600px] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-medium text-white text-sm">ACE Assistant</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-400" />
              Governed AI Agent
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map(renderMessage)}

        {agentState.isThinking && !agentState.currentTool && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s.action)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs transition-colors border border-slate-700"
              >
                {s.icon}
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask ACE anything..."
            disabled={agentState.isThinking}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || agentState.isThinking}
            className="p-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg transition-all"
          >
            {agentState.isThinking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ACEAgentChat;
