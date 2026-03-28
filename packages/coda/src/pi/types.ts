/**
 * @module pi/types
 * Type definitions for the Pi extension integration layer.
 *
 * PiAPI is an interface — CODA does not depend on Pi's runtime.
 * All interaction with Pi goes through this contract.
 */

/** Handler function for a registered command. */
export type CommandHandler = (args: string[]) => Promise<void> | void;

/** Configuration for a registered command. */
export interface CommandConfig {
  /** Human-readable description of the command. */
  description: string;
  /** Handler function invoked when the command is executed. */
  handler: CommandHandler;
}

/** Schema describing a tool's parameters for the LLM. */
export interface ToolSchema {
  /** Human-readable description of what the tool does. */
  description: string;
  /** JSON Schema-style parameter definitions. */
  parameters: Record<string, unknown>;
}

/** Handler function for a registered tool. */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

/** Context passed to hook handlers. */
export interface HookContext {
  /** Tool information (present for tool_call hooks). */
  tool?: {
    /** Name of the tool being called. */
    name: string;
    /** Arguments passed to the tool. */
    args: Record<string, unknown>;
  };
}

/** Result returned from hook handlers. */
export interface HookResult {
  /** If true, block the operation. */
  block?: boolean;
  /** Reason for blocking (shown to the agent). */
  reason?: string;
  /** System prompt to inject (for before_agent_start). */
  systemPrompt?: string;
  /** Message to inject (for before_agent_start). */
  message?: string;
}

/** Handler function for hooks. */
export type HookHandler = (ctx: HookContext) => HookResult | Promise<HookResult>;

/**
 * Pi extension API interface.
 *
 * CODA targets this interface — it does not import Pi directly.
 * This enables testing with mocks and decouples from Pi's runtime.
 */
export interface PiAPI {
  /** Register a slash command. */
  registerCommand(name: string, config: CommandConfig): void;
  /** Register a tool that the LLM can call. */
  registerTool(name: string, schema: ToolSchema, handler: ToolHandler): void;
  /** Register a lifecycle hook handler. */
  on(event: string, handler: HookHandler): void;
  /** Start a new session (clears context). */
  newSession(): Promise<void>;
  /** Send a user message to the agent. */
  sendUserMessage(message: string): Promise<void>;
}

/**
 * Provides access to CODA state without direct file I/O.
 * Enables testability by decoupling hooks from the filesystem.
 */
export interface StateProvider {
  /** Get the current CODA state, or null if not initialized. */
  getState(): import('@coda/core').CodaState | null;
}
