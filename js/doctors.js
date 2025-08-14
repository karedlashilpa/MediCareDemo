'use strict';

/**
 * Doctors directory scaffolding.
 * Provides stubs for initialization, fetching, and adding doctor profiles.
 */

// PUBLIC_INTERFACE
export function initDoctorsModule() {
  /** Initialize doctors directory UI. Stub: no-op for scaffolding. */
  console.debug('[doctors] initDoctorsModule called (stub).');
}

// PUBLIC_INTERFACE
export async function fetchDoctors() {
  /**
   * Fetches the doctors list (stubbed).
   * Returns an empty array for now.
   */
  console.debug('[doctors] fetchDoctors called (stub).');
  return [];
}

// PUBLIC_INTERFACE
export async function addDoctor(_doctor) {
  /**
   * Adds a new doctor profile.
   * Stub returns a placeholder result.
   */
  console.debug('[doctors] addDoctor called (stub).', _doctor);
  return { ok: true, id: 'stub-id' };
}

console.debug('[doctors] Module loaded (stub).');
