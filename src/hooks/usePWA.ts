/**
 * usePWA.ts -- React hook for Progressive Web App (PWA) functionality.
 *
 * The {@link usePWA} hook provides a unified interface for:
 *   - **Install prompt**: Detecting when the app is installable and
 *     triggering the native install dialog.
 *   - **Online/offline status**: Tracking network connectivity changes
 *     in real time so the UI can switch between online and offline modes.
 *   - **Service worker registration**: Managing the service worker
 *     lifecycle (registration, updates, activation).
 *   - **Update notification**: Detecting when a new service worker is
 *     available and providing a method to trigger the update.
 *
 * Usage:
 * ```tsx
 * function AppShell() {
 *   const { isInstallable, isOffline, install, update, registration } = usePWA();
 *
 *   return (
 *     <div>
 *       {isOffline && <OfflineBanner />}
 *       {isInstallable && <button onClick={install}>Install App</button>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The return value of the usePWA hook.
 */
export interface UsePWAReturn {
  /**
   * Whether the app can be installed to the user's home screen.
   * True when the browser has fired the `beforeinstallprompt` event
   * and the user has not yet installed the app.
   */
  isInstallable: boolean;

  /**
   * Whether the device is currently offline (navigator.onLine is false).
   */
  isOffline: boolean;

  /**
   * Trigger the native PWA install prompt.
   *
   * Returns a promise that resolves to the user's choice:
   * 'accepted' or 'dismissed'. Returns null if the install prompt
   * is not available.
   */
  install: () => Promise<'accepted' | 'dismissed' | null>;

  /**
   * Trigger a service worker update.
   *
   * When a new service worker is waiting, this method activates it
   * by posting a 'SKIP_WAITING' message and reloading the page.
   */
  update: () => void;

  /**
   * The active service worker registration, or null if not registered.
   */
  registration: ServiceWorkerRegistration | null;

  /**
   * Whether a new service worker is waiting to activate.
   */
  updateAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Extend BeforeInstallPromptEvent
// ---------------------------------------------------------------------------

/**
 * The `beforeinstallprompt` event is not part of the standard DOM typings.
 * This interface fills the gap.
 */
interface BeforeInstallPromptEvent extends Event {
  /** Platforms that the prompt can be shown on. */
  readonly platforms: string[];

  /**
   * Show the install prompt to the user.
   * @returns A promise resolving to the user's choice.
   */
  prompt(): Promise<void>;

  /**
   * A promise that resolves with the user's choice after prompt() is called.
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

// ---------------------------------------------------------------------------
// Service Worker Path
// ---------------------------------------------------------------------------

/** Default path to the service worker file. */
const SERVICE_WORKER_PATH = '/service-worker.js';

// ---------------------------------------------------------------------------
// usePWA Hook
// ---------------------------------------------------------------------------

/**
 * React hook providing PWA install, offline detection, and service worker
 * lifecycle management.
 *
 * @param swPath - Optional custom path to the service worker file.
 *   Defaults to '/service-worker.js'.
 * @returns An object with PWA state and control methods.
 */
export function usePWA(swPath: string = SERVICE_WORKER_PATH): UsePWAReturn {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  /** Reference to the deferred install prompt event. */
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // -----------------------------------------------------------------------
  // Online / Offline tracking
  // -----------------------------------------------------------------------

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Install prompt
  // -----------------------------------------------------------------------

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default mini-infobar from appearing
      event.preventDefault();

      // Store the event for later use
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // The app has been installed; clean up
      deferredPromptRef.current = null;
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Service Worker Registration
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let mounted = true;

    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register(swPath, {
          scope: '/',
        });

        if (!mounted) return;
        setRegistration(reg);

        // Check if a new service worker is already waiting
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new service workers being installed
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available; a new service worker is waiting
              if (mounted) {
                setUpdateAvailable(true);
              }
            }
          });
        });

        // Periodically check for updates (every 60 minutes)
        const updateInterval = setInterval(() => {
          reg.update().catch((err) => {
            console.warn('[usePWA] Service worker update check failed:', err);
          });
        }, 60 * 60 * 1000);

        return () => {
          clearInterval(updateInterval);
        };
      } catch (err) {
        console.error('[usePWA] Service worker registration failed:', err);
      }
    };

    registerServiceWorker();

    // Listen for the controlling service worker changing
    // (happens when a new SW takes over)
    const handleControllerChange = () => {
      // Reload the page to ensure the new service worker serves fresh content
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, [swPath]);

  // -----------------------------------------------------------------------
  // Install method
  // -----------------------------------------------------------------------

  const install = useCallback(async (): Promise<
    'accepted' | 'dismissed' | null
  > => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      return null;
    }

    // Show the install prompt
    await promptEvent.prompt();

    // Wait for the user's response
    const { outcome } = await promptEvent.userChoice;

    // Clear the deferred prompt (it can only be used once)
    deferredPromptRef.current = null;
    setIsInstallable(false);

    return outcome;
  }, []);

  // -----------------------------------------------------------------------
  // Update method
  // -----------------------------------------------------------------------

  const update = useCallback(() => {
    if (!registration?.waiting) {
      return;
    }

    // Tell the waiting service worker to skip waiting and become active
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  // -----------------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------------

  return {
    isInstallable,
    isOffline,
    install,
    update,
    registration,
    updateAvailable,
  };
}
