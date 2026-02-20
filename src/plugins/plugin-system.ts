/**
 * plugin-system.ts -- Event-emitter based plugin/hook system.
 *
 * Plugins can hook into virtually any part of the application. The system
 * supports two patterns:
 *
 * 1. **Action hooks** (executeHook): Fire-and-forget notifications.
 *    All registered callbacks are called in priority order. Return values
 *    are ignored.
 *
 * 2. **Filter hooks** (applyFilter): Data-transformation pipeline.
 *    Each callback receives the current value, may modify it, and returns
 *    the result. The final value is returned to the caller.
 *
 * Hooks execute in priority order (lower numbers first). If two hooks
 * share the same priority, they execute in registration order.
 *
 * Error handling: Individual hook errors are caught and logged but do not
 * prevent other hooks from executing. The plugin system emits an error
 * event for observability.
 */

import type {
  HookName,
  HookCallback,
  HookEntry,
  Plugin,
  PluginEvent,
  PluginEventListener,
  PluginRegistryState,
} from './types';

export class PluginSystem {
  /** Map of hook name -> sorted array of registered callbacks. */
  private hooks: Map<HookName, HookEntry[]> = new Map();

  /** Map of plugin ID -> plugin definition. */
  private plugins: Map<string, Plugin> = new Map();

  /** Listeners for plugin system events (observability). */
  private eventListeners: PluginEventListener[] = [];

  // -------------------------------------------------------------------------
  // Plugin Registration
  // -------------------------------------------------------------------------

  /**
   * Register a plugin with the system.
   *
   * This will:
   * 1. Store the plugin definition
   * 2. Register all declared hooks
   * 3. Call the plugin's init() method if provided
   *
   * @throws If a plugin with the same ID is already registered.
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(
        `Plugin "${plugin.id}" is already registered. Unregister it first.`
      );
    }

    // Store the plugin
    this.plugins.set(plugin.id, { ...plugin, enabled: plugin.enabled ?? true });

    // Register all declared hooks
    for (const hookDecl of plugin.hooks) {
      this.addHook(hookDecl.name, hookDecl.callback, hookDecl.priority, plugin.id);
    }

    // Run plugin initialization
    if (plugin.init) {
      try {
        await plugin.init();
      } catch (error) {
        this.emitEvent({
          type: 'hook:error',
          pluginId: plugin.id,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
      }
    }

    this.emitEvent({
      type: 'plugin:registered',
      pluginId: plugin.id,
      timestamp: new Date(),
    });
  }

  /**
   * Unregister a plugin by its ID.
   *
   * This will:
   * 1. Remove all hooks registered by this plugin
   * 2. Call the plugin's cleanup() method if provided
   * 3. Remove the plugin from the registry
   */
  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return; // Silently ignore unregistering a non-existent plugin
    }

    // Remove all hooks belonging to this plugin
    for (const [hookName, entries] of this.hooks.entries()) {
      const filtered = entries.filter((entry) => entry.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.hooks.delete(hookName);
      } else {
        this.hooks.set(hookName, filtered);
      }
    }

    // Run plugin cleanup
    if (plugin.cleanup) {
      try {
        await plugin.cleanup();
      } catch (error) {
        this.emitEvent({
          type: 'hook:error',
          pluginId,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
      }
    }

    this.plugins.delete(pluginId);

    this.emitEvent({
      type: 'plugin:unregistered',
      pluginId,
      timestamp: new Date(),
    });
  }

  /**
   * Enable a previously disabled plugin. Re-registers its hooks.
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not registered.`);
    }

    if (plugin.enabled) return;

    plugin.enabled = true;

    // Re-register hooks
    for (const hookDecl of plugin.hooks) {
      this.addHook(hookDecl.name, hookDecl.callback, hookDecl.priority, pluginId);
    }

    this.emitEvent({
      type: 'plugin:enabled',
      pluginId,
      timestamp: new Date(),
    });
  }

  /**
   * Disable a plugin without fully unregistering it. Removes its hooks
   * but keeps the plugin definition in the registry.
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not registered.`);
    }

    if (!plugin.enabled) return;

    plugin.enabled = false;

    // Remove hooks belonging to this plugin
    for (const [hookName, entries] of this.hooks.entries()) {
      const filtered = entries.filter((entry) => entry.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.hooks.delete(hookName);
      } else {
        this.hooks.set(hookName, filtered);
      }
    }

    this.emitEvent({
      type: 'plugin:disabled',
      pluginId,
      timestamp: new Date(),
    });
  }

  // -------------------------------------------------------------------------
  // Hook Management
  // -------------------------------------------------------------------------

  /**
   * Add a hook callback for a specific hook name.
   *
   * @param hookName - The hook to listen to.
   * @param callback - The function to call when the hook fires.
   * @param priority - Execution priority (lower = earlier). Default: 10.
   * @param pluginId - Optional plugin ID that owns this hook.
   */
  addHook(
    hookName: HookName,
    callback: HookCallback,
    priority: number = 10,
    pluginId?: string
  ): void {
    const entry: HookEntry = { callback, priority, pluginId };

    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const entries = this.hooks.get(hookName)!;
    entries.push(entry);

    // Keep sorted by priority (stable sort -- preserves registration order for same priority)
    entries.sort((a, b) => a.priority - b.priority);

    this.emitEvent({
      type: 'hook:added',
      hookName,
      pluginId,
      timestamp: new Date(),
    });
  }

  /**
   * Remove a specific hook callback.
   *
   * @param hookName - The hook the callback was registered to.
   * @param callback - The exact callback reference to remove.
   */
  removeHook(hookName: HookName, callback: HookCallback): void {
    const entries = this.hooks.get(hookName);
    if (!entries) return;

    const index = entries.findIndex((entry) => entry.callback === callback);
    if (index !== -1) {
      const removed = entries.splice(index, 1)[0];

      if (entries.length === 0) {
        this.hooks.delete(hookName);
      }

      this.emitEvent({
        type: 'hook:removed',
        hookName,
        pluginId: removed.pluginId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check whether any callbacks are registered for a hook.
   */
  hasHook(hookName: HookName): boolean {
    const entries = this.hooks.get(hookName);
    return !!entries && entries.length > 0;
  }

  // -------------------------------------------------------------------------
  // Hook Execution
  // -------------------------------------------------------------------------

  /**
   * Execute all callbacks for an action hook.
   *
   * All registered callbacks are called in priority order. Return values
   * are ignored. Errors in individual callbacks are caught and logged
   * but do not prevent subsequent callbacks from executing.
   *
   * @param hookName - The hook to fire.
   * @param args - Arguments to pass to each callback.
   */
  async executeHook(hookName: HookName, ...args: any[]): Promise<void> {
    const entries = this.hooks.get(hookName);
    if (!entries || entries.length === 0) return;

    for (const entry of entries) {
      try {
        await entry.callback(...args);
      } catch (error) {
        this.emitEvent({
          type: 'hook:error',
          hookName,
          pluginId: entry.pluginId,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Execute hooks that can modify data (filter pattern).
   *
   * Each callback receives the current value as the first argument,
   * followed by any additional context args. It must return the
   * (possibly modified) value. The final value is returned to the caller.
   *
   * If a callback throws, the error is logged and the value passes
   * through unmodified to the next callback.
   *
   * @param hookName - The filter hook to apply.
   * @param value - The initial value to filter.
   * @param args - Additional context arguments passed to each callback.
   * @returns The filtered value after all callbacks have processed it.
   */
  async applyFilter<T>(hookName: HookName, value: T, ...args: any[]): Promise<T> {
    const entries = this.hooks.get(hookName);
    if (!entries || entries.length === 0) return value;

    let current = value;

    for (const entry of entries) {
      try {
        const result = await entry.callback(current, ...args);
        // Only update if the callback returned a value (not undefined)
        if (result !== undefined) {
          current = result;
        }
      } catch (error) {
        this.emitEvent({
          type: 'hook:error',
          hookName,
          pluginId: entry.pluginId,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
        // On error, pass through the current value unmodified
      }
    }

    return current;
  }

  // -------------------------------------------------------------------------
  // Query Methods
  // -------------------------------------------------------------------------

  /**
   * Get all registered plugins.
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a single plugin by ID.
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all enabled plugins.
   */
  getEnabledPlugins(): Plugin[] {
    return this.getPlugins().filter((p) => p.enabled);
  }

  /**
   * Get the number of hooks registered for a specific hook name.
   */
  getHookCount(hookName: HookName): number {
    return this.hooks.get(hookName)?.length ?? 0;
  }

  /**
   * Get a serializable snapshot of the plugin system state.
   */
  getState(): PluginRegistryState {
    let totalHooks = 0;
    for (const entries of this.hooks.values()) {
      totalHooks += entries.length;
    }

    return {
      plugins: Array.from(this.plugins.values()).map((p) => ({
        id: p.id,
        enabled: p.enabled ?? true,
      })),
      totalHooks,
    };
  }

  // -------------------------------------------------------------------------
  // Event System (Observability)
  // -------------------------------------------------------------------------

  /**
   * Subscribe to plugin system events.
   *
   * @param listener - Callback invoked for every plugin system event.
   * @returns An unsubscribe function.
   */
  onEvent(listener: PluginEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit an event to all listeners.
   */
  private emitEvent(event: PluginEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Prevent listener errors from breaking the plugin system
      }
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /**
   * Unregister all plugins and clear all hooks.
   * Calls cleanup() on each plugin that provides it.
   */
  async destroy(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    for (const id of pluginIds) {
      await this.unregister(id);
    }

    this.hooks.clear();
    this.plugins.clear();
    this.eventListeners = [];
  }
}
