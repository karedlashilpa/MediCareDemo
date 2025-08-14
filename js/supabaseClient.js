'use strict';

/**
 * Supabase client scaffolding.
 * This stub avoids hard-coding credentials and expects configuration to be provided at runtime.
 *
 * Configuration approach for future integration:
 * - Prefer to inject configuration into the page via a secure mechanism (server-side templating, build-time env, or a JS bootstrapping snippet).
 * - This stub looks for window.__SUPABASE_CONFIG__ = { url: '...', anonKey: '...' } if present.
 * - Do not store credentials in this file.
 */

/**
 * Returns the Supabase configuration if present on the window.
 * Helpful for verifying whether the environment is configured.
 */
// PUBLIC_INTERFACE
export function isSupabaseConfigured() {
  /** Returns true if window.__SUPABASE_CONFIG__ has url and anonKey properties. */
  const cfg = (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__) || null;
  return Boolean(cfg && cfg.url && cfg.anonKey);
}

/**
 * Returns a Supabase client instance when properly configured.
 * Stubbed for now—will return null and warn if configuration or client factory is unavailable.
 *
 * Usage notes (future):
 * - If using the official Supabase JS library via CDN, ensure it is loaded and provides `window.supabase.createClient`.
 * - If bundling, import { createClient } from '@supabase/supabase-js' here (not part of this plain HTML/CSS demo).
 */
// PUBLIC_INTERFACE
export function getSupabaseClient() {
  /**
   * Gets a Supabase client or returns null if not configured.
   * This is a non-throwing stub suitable for initial scaffolding.
   */
  const cfg = (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__) || null;

  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.warn('[supabaseClient] Missing Supabase configuration. Define window.__SUPABASE_CONFIG__ = { url, anonKey } at runtime.');
    return null;
  }

  // If a global supabase factory is present (e.g., from CDN), construct the client.
  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      return window.supabase.createClient(cfg.url, cfg.anonKey);
    } catch (err) {
      console.warn('[supabaseClient] Failed to create Supabase client from global factory:', err);
      return null;
    }
  }

  // Otherwise, return a proxy with no-op methods to avoid crashes until the real client is wired.
  console.info('[supabaseClient] Supabase library not found. Returning a no-op client stub.');
  const noop = async () => ({ data: null, error: new Error('Supabase client not initialized') });
  return {
    from: () => ({
      select: noop,
      insert: noop,
      update: noop,
      delete: noop,
      upsert: noop,
      eq: () => ({ select: noop, update: noop, delete: noop }),
      order: () => ({ select: noop }),
      limit: () => ({ select: noop }),
    }),
    auth: {
      signInWithPassword: noop,
      signUp: noop,
      signOut: noop,
      getSession: noop,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
}

console.debug('[supabaseClient] Module loaded (stub).');
