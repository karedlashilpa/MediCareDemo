# MediCareDemo — Healthcare Landing Page Demo

A responsive healthcare landing page adapted from the MEDIBuddy HTML/CSS template and scaffolded with modular JavaScript. It includes sections for Our Doctors, Appointment Booking, FAQ, and a Help Drawer, with placeholders for authentication and Supabase-backed data flows.

## Project Structure

```
MediCareDemo/
├── index.html               # Main HTML entry: structure, sections, and script wiring
├── styles.css               # Global styles, utilities, components, modals, drawer, etc.
├── assets/
│   └── header-bg.png        # Hero/header background asset
└── js/
    ├── supabaseClient.js    # Supabase config + factory (safe stub)
    ├── auth.js              # Authentication UI scaffolding
    ├── appointments.js      # Appointment form scaffolding
    ├── doctors.js           # Doctors directory scaffolding
    ├── faq.js               # FAQ data + UI scaffolding
    ├── helpDrawer.js        # Off-canvas help drawer scaffolding
    └── main.js              # App bootstrap (minimal)
```

## HTML, CSS, and JS Modules — Purpose and Roles

- index.html
  - Declares all sections and components:
    - Navigation
    - Header (hero)
    - Our Doctors (id="our-doctors")
    - Book Appointment (id="book-appointment")
    - FAQ (id="faq")
    - Help Drawer (id="help", off-canvas)
    - Footer
    - Auth Modal (sign in / sign up)
    - Add Doctor Modal (admin-only control, to be enforced by JS)
  - Wires JavaScript modules via type="module" script tags:
    supabaseClient.js, auth.js, appointments.js, doctors.js, faq.js, helpDrawer.js, main.js
  - Minimal inline script sets the current year in the footer.

- styles.css
  - Global design tokens (colors, shadows) and base typography.
  - Layout for header/hero, navigation, and responsive grid.
  - Utility classes (spacing, grid, flex helpers).
  - Reusable components:
    - Buttons and variants
    - Cards
    - Modal shell and animations
    - Help Drawer (off-canvas) structure and animations
    - Accordion helpers for collapsible content (used by FAQ)
    - Toast scaffolding styles
  - Form field base styles for consistent UI.
  - Focus-visible and screen-reader utilities for accessibility.

- js/supabaseClient.js
  - Safe, non-throwing Supabase scaffolding:
    - PUBLIC_INTERFACE: isSupabaseConfigured()
      - Checks for window.__SUPABASE_CONFIG__ = { url, anonKey }.
    - PUBLIC_INTERFACE: getSupabaseClient()
      - Returns a real client if a global supabase.createClient is present and configured.
      - Otherwise returns a no-op client stub so other modules can call it safely without crashing.
  - Credentials are not hard-coded; configuration is expected at runtime.

- js/auth.js
  - PUBLIC_INTERFACE: initAuthModule(), openAuthModal(), closeAuthModal()
  - Handles auth modal interactions (currently stubs). Real auth flows will use supabaseClient in future steps.

- js/appointments.js
  - PUBLIC_INTERFACE: initAppointmentsModule(), submitAppointment(formData)
  - Attaches form listeners and submits appointment data (stub response for now).
  - The form lives in the “Book an Appointment” section of index.html.

- js/doctors.js
  - PUBLIC_INTERFACE: initDoctorsModule(), fetchDoctors(), addDoctor(doctor)
  - Manages the doctors list rendering and add-doctor action (stubs). Tied to:
    - Directory container: #doctors-list
    - “Add Doctor” modal: #add-doctor-modal

- js/faq.js
  - PUBLIC_INTERFACE: initFaqModule(), fetchFaqItems()
  - Provides placeholder FAQ items and the basis for a collapsible/accordion UI.

- js/helpDrawer.js
  - PUBLIC_INTERFACE: initHelpDrawer(), openHelpDrawer(), closeHelpDrawer()
  - Controls the off-canvas help drawer tied to the #help element and #help-drawer-trigger.

- js/main.js
  - PUBLIC_INTERFACE: initApp()
  - Minimal bootstrap point. As modules are loaded individually by script tags, this remains light and can orchestrate sequencing later.

## Quickstart (Local)

- This is a static site. You can open index.html in a browser or serve the folder with any static server.
- Open the browser console to see stub initialization logs (e.g., “[auth] Module loaded (stub)”).
- All dynamic sections are scaffolded and safe: modules log operations without persisting data yet.

## Supabase Configuration (Future Integration)

- Do not hard-code credentials. Provide configuration at runtime:
  - Define window.__SUPABASE_CONFIG__ = { url: '...', anonKey: '...' } before loading the modules or in a small inline script.
  - If using the official CDN, ensure window.supabase.createClient is available.
- Example snippet (to include before module scripts):
  <script>
    window.__SUPABASE_CONFIG__ = {
      url: 'https://YOUR-SUPABASE-URL',
      anonKey: 'YOUR-ANON-KEY'
    };
  </script>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

## Conventions and Notes for Future Edits

- Public APIs in JS are marked with // PUBLIC_INTERFACE to make inter-module contracts clear.
- Accessibility: Sections include ARIA attributes and meaningful IDs; preserve these for screen readers and keyboard navigation.
- Keep modules focused:
  - supabaseClient.js: configuration and client factory only.
  - Feature modules (auth, appointments, doctors, faq, helpDrawer): UI wiring + business logic.
  - main.js: cross-module orchestration/boot.
- CSS: Add new component styles near existing component blocks and keep utility classes generic.

## Roadmap (Next Steps)

- Wire real Supabase createClient and implement:
  - Authentication flows in auth.js
  - Doctors CRUD in doctors.js
  - Appointment submission in appointments.js
- Replace stub data in faq.js with dynamic content if needed.
- Add basic state and permission handling for admin-only controls (e.g., “Add Doctor”).
