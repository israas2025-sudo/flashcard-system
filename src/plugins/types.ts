/**
 * Plugin System Type Definitions
 *
 * Defines the core types for the event-emitter based plugin/hook system.
 * Plugins can hook into virtually any part of the application lifecycle
 * including reviews, editing, browsing, scheduling, sync, and card display.
 */

// ---------------------------------------------------------------------------
// Hook Names
// ---------------------------------------------------------------------------

/**
 * All available hook points in the application.
 * Organized by subsystem for clarity.
 */
export type HookName =
  // Review hooks
  | 'beforeReview'
  | 'afterReview'
  | 'onCardShow'
  | 'onCardFlip'
  | 'onAnswer'
  // Editor hooks
  | 'beforeNoteSave'
  | 'afterNoteSave'
  | 'onFieldChange'
  // Browser hooks
  | 'onBrowserOpen'
  | 'onSearchExecute'
  | 'onBatchOperation'
  // Scheduler hooks
  | 'beforeSchedule'
  | 'afterSchedule'
  | 'onDayBoundary'
  // Sync hooks
  | 'beforeSync'
  | 'afterSync'
  // Card display hooks (filter pattern -- can modify data)
  | 'filterCardFront'
  | 'filterCardBack'
  | 'filterCardCSS'
  // General lifecycle hooks
  | 'onAppStart'
  | 'onAppClose'
  | 'onProfileLoaded';

// ---------------------------------------------------------------------------
// Hook Callback
// ---------------------------------------------------------------------------

/**
 * A callback function registered for a specific hook.
 *
 * For action hooks (before/after/on*), the callback receives contextual
 * arguments and returns void.
 *
 * For filter hooks (filter*), the callback receives a value as the first
 * argument, may receive additional context args, and must return the
 * (possibly modified) value.
 */
export type HookCallback = (...args: any[]) => Promise<any> | any;

// ---------------------------------------------------------------------------
// Hook Registration Entry
// ---------------------------------------------------------------------------

/**
 * Internal representation of a registered hook callback with its priority.
 * Lower priority numbers execute first.
 */
export interface HookEntry {
  /** The callback function. */
  callback: HookCallback;

  /** Execution priority. Lower numbers run first. Default: 10. */
  priority: number;

  /** The plugin ID that registered this hook, if any. */
  pluginId?: string;
}

// ---------------------------------------------------------------------------
// Plugin Definition
// ---------------------------------------------------------------------------

/**
 * A plugin that can be registered with the PluginSystem.
 *
 * Plugins declare their metadata and the hooks they want to listen to.
 * They may optionally provide init/cleanup lifecycle methods.
 */
export interface Plugin {
  /** Unique identifier for this plugin (e.g., 'tts-reader', 'kanji-stroke-order'). */
  id: string;

  /** Human-readable name shown in the plugin manager. */
  name: string;

  /** Semantic version string (e.g., '1.0.0'). */
  version: string;

  /** Short description of what the plugin does. */
  description: string;

  /** Plugin author name. */
  author: string;

  /** The hooks this plugin registers. */
  hooks: PluginHookDeclaration[];

  /**
   * Called when the plugin is registered.
   * Use this for one-time setup (e.g., loading external resources).
   */
  init?: () => Promise<void>;

  /**
   * Called when the plugin is unregistered.
   * Use this for cleanup (e.g., removing DOM elements, freeing resources).
   */
  cleanup?: () => Promise<void>;

  /** Whether this plugin is currently enabled. Defaults to true. */
  enabled?: boolean;

  /** Optional configuration object for plugin-specific settings. */
  config?: Record<string, unknown>;
}

/**
 * A single hook declaration within a plugin.
 */
export interface PluginHookDeclaration {
  /** The hook to listen to. */
  name: HookName;

  /** The callback to execute when the hook fires. */
  callback: HookCallback;

  /** Execution priority. Lower numbers run first. Default: 10. */
  priority?: number;
}

// ---------------------------------------------------------------------------
// Plugin Registry State
// ---------------------------------------------------------------------------

/**
 * Serializable snapshot of the plugin system state.
 * Used for persistence and UI display.
 */
export interface PluginRegistryState {
  /** All registered plugin IDs with their enabled/disabled status. */
  plugins: { id: string; enabled: boolean }[];

  /** Total number of active hook registrations. */
  totalHooks: number;
}

// ---------------------------------------------------------------------------
// Plugin Events
// ---------------------------------------------------------------------------

/**
 * Events emitted by the plugin system itself for observability.
 */
export type PluginEventType =
  | 'plugin:registered'
  | 'plugin:unregistered'
  | 'plugin:enabled'
  | 'plugin:disabled'
  | 'hook:added'
  | 'hook:removed'
  | 'hook:error';

/**
 * Payload for a plugin system event.
 */
export interface PluginEvent {
  type: PluginEventType;
  pluginId?: string;
  hookName?: HookName;
  error?: Error;
  timestamp: Date;
}

/**
 * Listener for plugin system events.
 */
export type PluginEventListener = (event: PluginEvent) => void;
