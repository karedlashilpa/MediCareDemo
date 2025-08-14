'use strict';

/**
 * FAQ scaffolding.
 * Exposes initialization and data retrieval stubs.
 */

// PUBLIC_INTERFACE
export function initFaqModule() {
  /** Initialize FAQ section behaviors (e.g., accordion). Stub: no-op for scaffolding. */
  console.debug('[faq] initFaqModule called (stub).');
}

// PUBLIC_INTERFACE
export async function fetchFaqItems() {
  /**
   * Fetch FAQ items from a data source (stub).
   * Returns a simple static placeholder array.
   */
  console.debug('[faq] fetchFaqItems called (stub).');
  return [
    {
      id: 'stub-1',
      question: 'How do I book an appointment?',
      answer: 'Use the form in the Appointment section above. We will confirm your request shortly.',
    },
  ];
}

console.debug('[faq] Module loaded (stub).');
