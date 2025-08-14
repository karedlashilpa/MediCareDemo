'use strict';

/**
 * Appointments management module.
 * Handles appointment form submission, validation, and user appointment display.
 */

import { getSupabaseClient } from './supabaseClient.js';

let currentUser = null;

// PUBLIC_INTERFACE
export function initAppointmentsModule() {
  /** Initialize appointment form listeners and load user appointments if authenticated. */
  console.debug('[appointments] initAppointmentsModule called.');
  
  const form = document.getElementById('appointment-form');
  if (form) {
    form.addEventListener('submit', handleAppointmentSubmit);
  }
  
  // Check if user is authenticated and load their appointments
  checkAuthAndLoadAppointments();
  
  // Listen for auth state changes
  const supabase = getSupabaseClient();
  if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
    supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      if (currentUser) {
        loadUserAppointments();
      } else {
        hideUserAppointments();
      }
    });
  }
}

// PUBLIC_INTERFACE
export async function submitAppointment(formData) {
  /**
   * Submit an appointment with provided form data.
   * Validates input and inserts into Supabase appointments table.
   */
  console.debug('[appointments] submitAppointment called.', formData);
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  
  // Prepare appointment data
  const appointmentData = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone || null,
    doctor_id: formData.doctorId,
    appointment_date: formData.date,
    appointment_time: formData.time,
    notes: formData.notes || null,
    user_id: currentUser?.id || null,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select();
    
  if (error) {
    throw new Error(`Failed to book appointment: ${error.message}`);
  }
  
  return { ok: true, data: data[0], message: 'Appointment booked successfully!' };
}

async function handleAppointmentSubmit(event) {
  /** Handle form submission with validation and feedback. */
  event.preventDefault();
  
  const form = event.target;
  const submitButton = form.querySelector('#submit-appointment');
  const statusDiv = document.getElementById('appointment-status');
  
  // Clear previous status
  if (statusDiv) {
    statusDiv.textContent = '';
  }
  
  // Validate form
  const validation = validateAppointmentForm(form);
  if (!validation.isValid) {
    showToast('error', 'Validation Error', validation.message);
    return;
  }
  
  // Disable submit button during processing
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Booking...';
  }
  
  try {
    const formData = new FormData(form);
    const appointmentData = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      doctorId: formData.get('doctorId'),
      date: formData.get('date'),
      time: formData.get('time'),
      notes: formData.get('notes')
    };
    
    const result = await submitAppointment(appointmentData);
    
    // Show success message
    showToast('success', 'Appointment Booked!', result.message);
    
    // Reset form
    form.reset();
    
    // Reload user appointments if logged in
    if (currentUser) {
      await loadUserAppointments();
    }
    
    if (statusDiv) {
      statusDiv.textContent = 'Appointment booked successfully! We will contact you soon to confirm.';
      statusDiv.style.color = 'var(--success)';
    }
    
  } catch (error) {
    console.error('[appointments] Error submitting appointment:', error);
    showToast('error', 'Booking Failed', error.message);
    
    if (statusDiv) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = 'var(--error)';
    }
  } finally {
    // Re-enable submit button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Appointment';
    }
  }
}

function validateAppointmentForm(form) {
  /** Validate appointment form inputs. */
  const formData = new FormData(form);
  
  const name = formData.get('name')?.trim();
  const email = formData.get('email')?.trim();
  const doctorId = formData.get('doctorId');
  const date = formData.get('date');
  const time = formData.get('time');
  
  // Required field validation
  if (!name) {
    return { isValid: false, message: 'Name is required.' };
  }
  
  if (!email) {
    return { isValid: false, message: 'Email is required.' };
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  
  if (!doctorId) {
    return { isValid: false, message: 'Please select a doctor.' };
  }
  
  if (!date) {
    return { isValid: false, message: 'Appointment date is required.' };
  }
  
  if (!time) {
    return { isValid: false, message: 'Appointment time is required.' };
  }
  
  // Date validation - must be in the future
  const appointmentDate = new Date(`${date}T${time}`);
  const now = new Date();
  
  if (appointmentDate <= now) {
    return { isValid: false, message: 'Appointment must be scheduled for a future date and time.' };
  }
  
  // Business hours validation (assuming 9 AM to 5 PM)
  const appointmentTime = new Date(`2000-01-01T${time}`);
  const startTime = new Date('2000-01-01T09:00');
  const endTime = new Date('2000-01-01T17:00');
  
  if (appointmentTime < startTime || appointmentTime > endTime) {
    return { isValid: false, message: 'Appointments are only available between 9:00 AM and 5:00 PM.' };
  }
  
  return { isValid: true, message: 'Valid' };
}

async function checkAuthAndLoadAppointments() {
  /** Check current auth session and load appointments if user is logged in. */
  const supabase = getSupabaseClient();
  if (!supabase || !supabase.auth) {
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    
    if (currentUser) {
      await loadUserAppointments();
    }
  } catch (error) {
    console.error('[appointments] Error checking auth session:', error);
  }
}

async function loadUserAppointments() {
  /** Load and display upcoming appointments for the authenticated user. */
  if (!currentUser) {
    return;
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }
  
  try {
    // Get appointments for current user, ordered by date/time ascending
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty)
      `)
      .eq('user_id', currentUser.id)
      .gte('appointment_date', new Date().toISOString().split('T')[0]) // Only future appointments
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });
    
    if (error) {
      console.error('[appointments] Error loading user appointments:', error);
      return;
    }
    
    displayUserAppointments(appointments || []);
    
  } catch (error) {
    console.error('[appointments] Error loading user appointments:', error);
  }
}

function displayUserAppointments(appointments) {
  /** Display user's upcoming appointments below the form. */
  const appointmentSection = document.getElementById('book-appointment');
  if (!appointmentSection) {
    return;
  }
  
  // Remove existing appointments display
  const existingDisplay = document.getElementById('user-appointments');
  if (existingDisplay) {
    existingDisplay.remove();
  }
  
  // Create appointments display container
  const appointmentsContainer = document.createElement('div');
  appointmentsContainer.id = 'user-appointments';
  appointmentsContainer.style.cssText = 'margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);';
  
  const heading = document.createElement('h3');
  heading.textContent = 'Your Upcoming Appointments';
  heading.style.cssText = 'margin-bottom: 1rem; color: var(--text-dark);';
  appointmentsContainer.appendChild(heading);
  
  if (appointments.length === 0) {
    const noAppointments = document.createElement('p');
    noAppointments.textContent = 'You have no upcoming appointments.';
    noAppointments.style.color = 'var(--text-light)';
    appointmentsContainer.appendChild(noAppointments);
  } else {
    const appointmentsList = document.createElement('div');
    appointmentsList.style.cssText = 'display: grid; gap: 1rem; max-width: 800px;';
    
    appointments.forEach(appointment => {
      const appointmentCard = createAppointmentCard(appointment);
      appointmentsList.appendChild(appointmentCard);
    });
    
    appointmentsContainer.appendChild(appointmentsList);
  }
  
  appointmentSection.appendChild(appointmentsContainer);
}

function createAppointmentCard(appointment) {
  /** Create a card element for displaying an appointment. */
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'padding: 1rem;';
  
  const date = new Date(appointment.appointment_date).toLocaleDateString();
  const time = formatTime(appointment.appointment_time);
  const doctorName = appointment.doctors?.name || 'Doctor TBD';
  const specialty = appointment.doctors?.specialty || '';
  
  const statusColor = appointment.status === 'confirmed' ? 'var(--success)' : 
                     appointment.status === 'cancelled' ? 'var(--error)' : 
                     'var(--warning)';
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
      <div>
        <h4 style="margin: 0; color: var(--text-dark);">${doctorName}</h4>
        ${specialty ? `<p style="margin: 0; color: var(--text-light); font-size: 0.9rem;">${specialty}</p>` : ''}
      </div>
      <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; text-transform: capitalize;">
        ${appointment.status}
      </span>
    </div>
    <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
      <span style="color: var(--text-light);"><i class="ri-calendar-line" aria-hidden="true"></i> ${date}</span>
      <span style="color: var(--text-light);"><i class="ri-time-line" aria-hidden="true"></i> ${time}</span>
    </div>
    ${appointment.notes ? `<p style="margin: 0; color: var(--text-light); font-size: 0.9rem;"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
  `;
  
  return card;
}

function hideUserAppointments() {
  /** Hide the user appointments section when user logs out. */
  const existingDisplay = document.getElementById('user-appointments');
  if (existingDisplay) {
    existingDisplay.remove();
  }
}

function formatTime(timeString) {
  /** Format time string to human-readable format. */
  if (!timeString) return '';
  
  try {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (error) {
    return timeString;
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
      toast.remove();
    }, 150);
  });
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('is-hiding');
      setTimeout(() => {
        toast.remove();
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

console.debug('[appointments] Module loaded.');
