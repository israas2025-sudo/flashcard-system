/**
 * Plugin System -- Public API
 *
 * Re-exports the PluginSystem class and all related types.
 * Provides a singleton instance for application-wide use.
 */

export { PluginSystem } from './plugin-system';
export type {
  HookName,
  HookCallback,
  HookEntry,
  Plugin,
  PluginHookDeclaration,
  PluginRegistryState,
  PluginEvent,
  PluginEventType,
  PluginEventListener,
} from './types';

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

import { PluginSystem } from './plugin-system';

/**
 * Global plugin system instance.
 *
 * Use this singleton for registering plugins and executing hooks
 * throughout the application. The instance is created lazily on
 * first import.
 *
 * @example
 * ```ts
 * import { pluginSystem } from '@/plugins';
 *
 * // Register a plugin
 * await pluginSystem.register(myPlugin);
 *
 * // Execute an action hook
 * await pluginSystem.executeHook('beforeReview', { cardId: '123' });
 *
 * // Apply a filter hook
 * const html = await pluginSystem.applyFilter('filterCardFront', rawHtml, card);
 * ```
 */
export const pluginSystem = new PluginSystem();
