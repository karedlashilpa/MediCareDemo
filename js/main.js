'use strict';

/**
 * Main bootstrap for the demo.
 * Initializes all modules in the correct order.
 */

import { initAuthModule } from './auth.js';
import { initDoctorsModule } from './doctors.js';
import { initAppointmentsModule } from './appointments.js';
import { initFaqModule } from './faq.js';
import { initHelpDrawer } from './helpDrawer.js';

// PUBLIC_INTERFACE
export function initApp() {
  /** Entry point for app-wide initialization. */
  console.debug('[main] initApp called.');
  
  try {
    // Initialize modules in order
    initAuthModule();
    initDoctorsModule();
    initAppointmentsModule();
    initFaqModule();
    initHelpDrawer();
    
    console.debug('[main] All modules initialized successfully.');
  } catch (error) {
    console.error('[main] Error initializing app:', error);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

console.debug('[main] Module loaded.');
