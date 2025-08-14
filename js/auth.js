'use strict';

/**
 * Authentication module with Supabase integration.
 * Handles sign-up, sign-in, sign-out, user profile management, and UI state updates.
 */

import { getSupabaseClient } from './supabaseClient.js';

// Global state
let currentUser = null;
let currentProfile = null;
let authSubscription = null;

// PUBLIC_INTERFACE
export function initAuthModule() {
  /** Initialize authentication UI bindings and handlers. */
  console.debug('[auth] initAuthModule called.');
  
  // Initialize UI event listeners
  initAuthModalListeners();
  initNavbarListeners();
  
  // Check current auth session
  checkCurrentSession();
  
  // Set up auth state listener
  setupAuthStateListener();
  
  console.debug('[auth] Authentication module initialized.');
}

// PUBLIC_INTERFACE
export function openAuthModal() {
  /** Public helper to programmatically open the auth modal. */
  console.debug('[auth] openAuthModal called.');
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('is-open');
    
    // Focus the first input in the active tab
    const activePanel = modal.querySelector('[role="tabpanel"]:not([hidden])');
    if (activePanel) {
      const firstInput = activePanel.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
    }
    
    // Set aria-hidden on main content
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('aria-hidden', 'true');
    }
  }
}

// PUBLIC_INTERFACE
export function closeAuthModal() {
  /** Public helper to programmatically close the auth modal. */
  console.debug('[auth] closeAuthModal called.');
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('is-open');
    
    // Remove aria-hidden from main content
    const main = document.querySelector('main');
    if (main) {
      main.removeAttribute('aria-hidden');
    }
    
    // Clear form data and status messages
    clearAuthForms();
  }
}

// PUBLIC_INTERFACE
export function getCurrentUser() {
  /** Get the current authenticated user. */
  return currentUser;
}

// PUBLIC_INTERFACE
export function getCurrentProfile() {
  /** Get the current user's profile. */
  return currentProfile;
}

// PUBLIC_INTERFACE
export function isAdmin() {
  /** Check if the current user is an admin. */
  return currentProfile?.is_admin === true;
}

function initAuthModalListeners() {
  /** Initialize auth modal event listeners. */
  
  // Open auth modal button
  const openAuthBtn = document.getElementById('open-auth-modal');
  if (openAuthBtn) {
    openAuthBtn.addEventListener('click', openAuthModal);
  }
  
  // Close auth modal button
  const closeAuthBtn = document.getElementById('close-auth-modal');
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', closeAuthModal);
  }
  
  // Tab switching
  const signInTab = document.getElementById('tab-signin');
  const signUpTab = document.getElementById('tab-signup');
  const signInPanel = document.getElementById('panel-signin');
  const signUpPanel = document.getElementById('panel-signup');
  
  if (signInTab && signUpTab && signInPanel && signUpPanel) {
    signInTab.addEventListener('click', () => {
      switchTab('signin', signInTab, signUpTab, signInPanel, signUpPanel);
    });
    
    signUpTab.addEventListener('click', () => {
      switchTab('signup', signInTab, signUpTab, signInPanel, signUpPanel);
    });
  }
  
  // Form submissions
  const signInForm = document.getElementById('signin-form');
  const signUpForm = document.getElementById('signup-form');
  
  if (signInForm) {
    signInForm.addEventListener('submit', handleSignIn);
  }
  
  if (signUpForm) {
    signUpForm.addEventListener('submit', handleSignUp);
  }
  
  // Close modal on backdrop click
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAuthModal();
      }
    });
  }
  
  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('auth-modal');
      if (modal && modal.classList.contains('is-open')) {
        closeAuthModal();
      }
    }
  });
}

function initNavbarListeners() {
  /** Initialize navbar authentication-related listeners. */
  
  // Sign out functionality will be added when user is authenticated
  // Account dropdown will be created dynamically
}

function switchTab(activeTab, signInTab, signUpTab, signInPanel, signUpPanel) {
  /** Switch between sign-in and sign-up tabs. */
  
  if (activeTab === 'signin') {
    // Update tab states
    signInTab.setAttribute('aria-selected', 'true');
    signUpTab.setAttribute('aria-selected', 'false');
    signInTab.style.background = '';
    signUpTab.style.background = '#6b7280';
    
    // Update panel visibility
    signInPanel.removeAttribute('hidden');
    signUpPanel.setAttribute('hidden', '');
    
    // Focus first input
    const firstInput = signInPanel.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  } else {
    // Update tab states
    signInTab.setAttribute('aria-selected', 'false');
    signUpTab.setAttribute('aria-selected', 'true');
    signInTab.style.background = '#6b7280';
    signUpTab.style.background = '';
    
    // Update panel visibility
    signInPanel.setAttribute('hidden', '');
    signUpPanel.removeAttribute('hidden');
    
    // Focus first input
    const firstInput = signUpPanel.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  }
  
  // Clear any existing status messages
  clearStatusMessages();
}

async function handleSignIn(event) {
  /** Handle sign-in form submission. */
  event.preventDefault();
  
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const statusDiv = document.getElementById('signin-status');
  
  // Clear previous status
  clearStatusMessages();
  
  // Get form data
  const formData = new FormData(form);
  const email = formData.get('email')?.trim();
  const password = formData.get('password');
  
  // Validate form
  const validation = validateSignInForm(email, password);
  if (!validation.isValid) {
    showToast('error', 'Validation Error', validation.message);
    if (statusDiv) {
      statusDiv.textContent = validation.message;
      statusDiv.style.color = 'var(--error)';
    }
    return;
  }
  
  // Disable submit button
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Signing In...';
  }
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (data.user) {
      showToast('success', 'Welcome Back!', 'You have been signed in successfully.');
      closeAuthModal();
      
      if (statusDiv) {
        statusDiv.textContent = 'Signed in successfully!';
        statusDiv.style.color = 'var(--success)';
      }
    }
    
  } catch (error) {
    console.error('[auth] Sign-in error:', error);
    showToast('error', 'Sign In Failed', error.message);
    
    if (statusDiv) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = 'var(--error)';
    }
  } finally {
    // Re-enable submit button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Sign In';
    }
  }
}

async function handleSignUp(event) {
  /** Handle sign-up form submission. */
  event.preventDefault();
  
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const statusDiv = document.getElementById('signup-status');
  
  // Clear previous status
  clearStatusMessages();
  
  // Get form data
  const formData = new FormData(form);
  const email = formData.get('email')?.trim();
  const password = formData.get('password');
  
  // Validate form
  const validation = validateSignUpForm(email, password);
  if (!validation.isValid) {
    showToast('error', 'Validation Error', validation.message);
    if (statusDiv) {
      statusDiv.textContent = validation.message;
      statusDiv.style.color = 'var(--error)';
    }
    return;
  }
  
  // Disable submit button
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';
  }
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    // Extract full name from email (before @)
    const fullName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (data.user) {
      // Create user profile
      await createUserProfile(data.user, email, fullName);
      
      showToast('success', 'Account Created!', 'Please check your email to confirm your account.');
      closeAuthModal();
      
      if (statusDiv) {
        statusDiv.textContent = 'Account created successfully! Please check your email.';
        statusDiv.style.color = 'var(--success)';
      }
    }
    
  } catch (error) {
    console.error('[auth] Sign-up error:', error);
    showToast('error', 'Sign Up Failed', error.message);
    
    if (statusDiv) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = 'var(--error)';
    }
  } finally {
    // Re-enable submit button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Create Account';
    }
  }
}

async function createUserProfile(user, email, fullName) {
  /** Create user profile in the profiles table. */
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  
  const profileData = {
    id: user.id,
    email: email,
    full_name: fullName,
    is_admin: false,
    created_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('profiles')
    .insert([profileData]);
  
  if (error) {
    console.error('[auth] Profile creation error:', error);
    // Don't throw error here - user account was created successfully
    // Profile can be created later
  }
}

function validateSignInForm(email, password) {
  /** Validate sign-in form inputs. */
  
  if (!email) {
    return { isValid: false, message: 'Email is required.' };
  }
  
  if (!password) {
    return { isValid: false, message: 'Password is required.' };
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  
  return { isValid: true, message: 'Valid' };
}

function validateSignUpForm(email, password) {
  /** Validate sign-up form inputs. */
  
  if (!email) {
    return { isValid: false, message: 'Email is required.' };
  }
  
  if (!password) {
    return { isValid: false, message: 'Password is required.' };
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  
  // Password strength validation
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number.' };
  }
  
  return { isValid: true, message: 'Valid' };
}

async function checkCurrentSession() {
  /** Check for existing authentication session. */
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await loadUserProfile(session.user.id);
      updateUIForAuthenticatedUser();
    } else {
      updateUIForUnauthenticatedUser();
    }
  } catch (error) {
    console.error('[auth] Session check error:', error);
    updateUIForUnauthenticatedUser();
  }
}

function setupAuthStateListener() {
  /** Set up authentication state change listener. */
  
  const supabase = getSupabaseClient();
  if (!supabase || !supabase.auth || typeof supabase.auth.onAuthStateChange !== 'function') {
    return;
  }
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.debug('[auth] Auth state changed:', event, session?.user?.email);
    
    if (session?.user) {
      currentUser = session.user;
      await loadUserProfile(session.user.id);
      updateUIForAuthenticatedUser();
    } else {
      currentUser = null;
      currentProfile = null;
      updateUIForUnauthenticatedUser();
    }
  });
  
  authSubscription = subscription;
}

async function loadUserProfile(userId) {
  /** Load user profile from the profiles table. */
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[auth] Profile load error:', error);
      // If profile doesn't exist, create it
      if (error.code === 'PGRST116') {
        await createUserProfile(currentUser, currentUser.email, currentUser.user_metadata?.full_name || 'User');
        // Try loading again
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        currentProfile = newProfile;
      }
    } else {
      currentProfile = profile;
    }
  } catch (error) {
    console.error('[auth] Profile load error:', error);
  }
}

function updateUIForAuthenticatedUser() {
  /** Update UI elements when user is authenticated. */
  
  const registerBtn = document.getElementById('open-auth-modal');
  const nav = document.querySelector('nav');
  
  if (registerBtn && nav) {
    // Replace "Register Now" button with user info and account dropdown
    registerBtn.style.display = 'none';
    
    // Remove existing account dropdown if it exists
    const existingDropdown = document.getElementById('account-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }
    
    // Create account dropdown
    const accountDropdown = createAccountDropdown();
    nav.appendChild(accountDropdown);
  }
  
  // Show/hide admin features
  updateAdminFeatures();
  
  console.debug('[auth] UI updated for authenticated user');
}

function updateUIForUnauthenticatedUser() {
  /** Update UI elements when user is not authenticated. */
  
  const registerBtn = document.getElementById('open-auth-modal');
  const accountDropdown = document.getElementById('account-dropdown');
  
  if (registerBtn) {
    registerBtn.style.display = '';
  }
  
  if (accountDropdown) {
    accountDropdown.remove();
  }
  
  // Hide admin features
  updateAdminFeatures();
  
  console.debug('[auth] UI updated for unauthenticated user');
}

function createAccountDropdown() {
  /** Create account dropdown with user name and sign out option. */
  
  const dropdown = document.createElement('div');
  dropdown.id = 'account-dropdown';
  dropdown.style.cssText = 'position: relative; display: inline-block;';
  
  const userName = currentProfile?.full_name || currentUser?.email?.split('@')[0] || 'User';
  
  dropdown.innerHTML = `
    <button class="btn" id="account-toggle" aria-expanded="false" aria-haspopup="true" style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="ri-user-line" aria-hidden="true"></i>
      ${userName}
      <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
    </button>
    <div id="account-menu" role="menu" aria-labelledby="account-toggle" style="
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      min-width: 200px;
      z-index: 1000;
      display: none;
      margin-top: 0.5rem;
    ">
      <div style="padding: 0.75rem; border-bottom: 1px solid var(--border);">
        <div style="font-weight: 500; color: var(--text-dark);">${userName}</div>
        <div style="font-size: 0.875rem; color: var(--text-light);">${currentUser?.email}</div>
        ${currentProfile?.is_admin ? '<div style="font-size: 0.75rem; background: var(--primary-color); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.25rem;">Admin</div>' : ''}
      </div>
      <button id="sign-out-btn" role="menuitem" style="
        width: 100%;
        text-align: left;
        padding: 0.75rem;
        border: none;
        background: transparent;
        color: var(--text-dark);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      ">
        <i class="ri-logout-box-line" aria-hidden="true"></i>
        Sign Out
      </button>
    </div>
  `;
  
  // Add dropdown functionality
  const toggle = dropdown.querySelector('#account-toggle');
  const menu = dropdown.querySelector('#account-menu');
  const signOutBtn = dropdown.querySelector('#sign-out-btn');
  
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
    toggle.setAttribute('aria-expanded', !isOpen);
  });
  
  signOutBtn.addEventListener('click', handleSignOut);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      menu.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  
  // Close dropdown on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.style.display === 'block') {
      menu.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
  
  return dropdown;
}

async function handleSignOut() {
  /** Handle user sign out. */
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new Error(error.message);
    }
    
    showToast('success', 'Signed Out', 'You have been signed out successfully.');
    
  } catch (error) {
    console.error('[auth] Sign-out error:', error);
    showToast('error', 'Sign Out Failed', error.message);
  }
}

function updateAdminFeatures() {
  /** Show/hide admin-only features based on user permissions. */
  
  const addDoctorBtn = document.getElementById('open-add-doctor-modal');
  
  if (addDoctorBtn) {
    if (isAdmin()) {
      addDoctorBtn.style.display = '';
      addDoctorBtn.setAttribute('aria-label', 'Add new doctor (Admin only)');
    } else {
      addDoctorBtn.style.display = 'none';
    }
  }
}

function clearAuthForms() {
  /** Clear authentication form data and status messages. */
  
  const signInForm = document.getElementById('signin-form');
  const signUpForm = document.getElementById('signup-form');
  
  if (signInForm) {
    signInForm.reset();
  }
  
  if (signUpForm) {
    signUpForm.reset();
  }
  
  clearStatusMessages();
}

function clearStatusMessages() {
  /** Clear all authentication status messages. */
  
  const signinStatus = document.getElementById('signin-status');
  const signupStatus = document.getElementById('signup-status');
  
  if (signinStatus) {
    signinStatus.textContent = '';
  }
  
  if (signupStatus) {
    signupStatus.textContent = '';
  }
}

function showToast(type, title, message) {
  /** Display a toast notification. */
  
  // Get or create toast container
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  
  const icon = getToastIcon(type);
  
  toast.innerHTML = `
    <div class="toast__icon">${icon}</div>
    <div>
      <div class="toast__title">${title}</div>
      <div class="toast__message">${message}</div>
    </div>
    <button class="toast__close" aria-label="Close notification">
      <i class="ri-close-line" aria-hidden="true"></i>
    </button>
  `;
  
  // Add close functionality
  const closeButton = toast.querySelector('.toast__close');
  closeButton.addEventListener('click', () => {
    toast.classList.add('is-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 150);
  });
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('is-hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 150);
    }
  }, 5000);
}

function getToastIcon(type) {
  /** Get the appropriate icon for toast type. */
  switch (type) {
    case 'success':
      return '<i class="ri-check-circle-line" aria-hidden="true"></i>';
    case 'error':
      return '<i class="ri-error-warning-line" aria-hidden="true"></i>';
    case 'info':
      return '<i class="ri-information-line" aria-hidden="true"></i>';
    case 'warning':
      return '<i class="ri-alert-line" aria-hidden="true"></i>';
    default:
      return '<i class="ri-notification-line" aria-hidden="true"></i>';
  }
}

// Clean up auth subscription when module is unloaded
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
    }
  });
}

console.debug('[auth] Module loaded.');
