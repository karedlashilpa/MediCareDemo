'use strict';

/**
 * Doctors directory module with Supabase integration.
 * Handles fetching, rendering, searching, filtering, pagination, and admin CRUD operations.
 */

import { getSupabaseClient } from './supabaseClient.js';

// Global state
let currentUser = null;
let currentProfile = null;
let allDoctors = [];
let filteredDoctors = [];
let displayedDoctors = [];
let currentPage = 0;
let searchTimeout = null;
let isLoading = false;

// Constants
const DOCTORS_PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 300;

// PUBLIC_INTERFACE
export function initDoctorsModule() {
  /** Initialize doctors directory UI and event listeners. */
  console.debug('[doctors] initDoctorsModule called.');
  
  // Initialize UI event listeners
  initEventListeners();
  
  // Check current auth session
  checkAuthAndLoadData();
  
  // Set up auth state listener
  setupAuthStateListener();
  
  console.debug('[doctors] Doctors module initialized.');
}

// PUBLIC_INTERFACE
export async function fetchDoctors() {
  /**
   * Fetches the doctors list from Supabase.
   * Returns array of doctor objects ordered by created_at desc.
   */
  console.debug('[doctors] fetchDoctors called.');
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[doctors] Supabase client not available');
    return [];
  }
  
  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return doctors || [];
  } catch (error) {
    console.error('[doctors] Error fetching doctors:', error);
    showToast('error', 'Load Failed', 'Failed to load doctors directory.');
    return [];
  }
}

// PUBLIC_INTERFACE
export async function addDoctor(doctorData) {
  /**
   * Adds a new doctor profile to Supabase.
   * Handles image upload if provided.
   */
  console.debug('[doctors] addDoctor called.', doctorData);
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  
  try {
    let imageUrl = doctorData.imageUrl;
    
    // Handle image upload if file is provided
    if (doctorData.imageFile) {
      imageUrl = await uploadDoctorImage(doctorData.imageFile, doctorData.name);
    }
    
    const newDoctor = {
      name: doctorData.name,
      specialty: doctorData.specialty,
      bio: doctorData.bio || null,
      image_url: imageUrl || null,
      accepting_patients: doctorData.acceptingPatients || false,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('doctors')
      .insert([newDoctor])
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Add rating and availability fields for display
    const doctorWithExtras = {
      ...data,
      rating: Math.floor(Math.random() * 2) + 4, // Random 4-5 star rating
      next_availability: getRandomAvailability()
    };
    
    return { ok: true, data: doctorWithExtras };
  } catch (error) {
    console.error('[doctors] Error adding doctor:', error);
    throw error;
  }
}

function initEventListeners() {
  /** Initialize all event listeners for the doctors module. */
  
  // Search and filter controls
  const searchInput = document.getElementById('doctors-search');
  const specialtyFilter = document.getElementById('doctors-specialty-filter');
  const loadMoreBtn = document.getElementById('load-more-doctors');
  
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  if (specialtyFilter) {
    specialtyFilter.addEventListener('change', handleFilter);
  }
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreDoctors);
  }
  
  // Admin modal controls
  const openAddDoctorBtn = document.getElementById('open-add-doctor-modal');
  const closeAddDoctorBtn = document.getElementById('close-add-doctor-modal');
  const addDoctorForm = document.getElementById('add-doctor-form');
  const addDoctorModal = document.getElementById('add-doctor-modal');
  
  if (openAddDoctorBtn) {
    openAddDoctorBtn.addEventListener('click', openAddDoctorModal);
  }
  
  if (closeAddDoctorBtn) {
    closeAddDoctorBtn.addEventListener('click', closeAddDoctorModal);
  }
  
  if (addDoctorForm) {
    addDoctorForm.addEventListener('submit', handleAddDoctorSubmit);
  }
  
  // Close modal on backdrop click
  if (addDoctorModal) {
    addDoctorModal.addEventListener('click', (e) => {
      if (e.target === addDoctorModal) {
        closeAddDoctorModal();
      }
    });
  }
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('add-doctor-modal');
      if (modal && modal.classList.contains('is-open')) {
        closeAddDoctorModal();
      }
    }
  });
}

async function checkAuthAndLoadData() {
  /** Check current auth session and load doctors data. */
  const supabase = getSupabaseClient();
  if (!supabase || !supabase.auth) {
    await loadDoctorsData();
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    
    if (currentUser) {
      await loadUserProfile(currentUser.id);
    }
    
    updateAdminUI();
    await loadDoctorsData();
  } catch (error) {
    console.error('[doctors] Error checking auth session:', error);
    await loadDoctorsData();
  }
}

function setupAuthStateListener() {
  /** Set up authentication state change listener. */
  const supabase = getSupabaseClient();
  if (!supabase || !supabase.auth || typeof supabase.auth.onAuthStateChange !== 'function') {
    return;
  }
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.debug('[doctors] Auth state changed:', event);
    
    if (session?.user) {
      currentUser = session.user;
      await loadUserProfile(session.user.id);
    } else {
      currentUser = null;
      currentProfile = null;
    }
    
    updateAdminUI();
  });
}

async function loadUserProfile(userId) {
  /** Load user profile to check admin status. */
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
    
    if (!error) {
      currentProfile = profile;
    }
  } catch (error) {
    console.error('[doctors] Error loading user profile:', error);
  }
}

function updateAdminUI() {
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

function isAdmin() {
  /** Check if the current user is an admin. */
  return currentProfile?.is_admin === true;
}

async function loadDoctorsData() {
  /** Load and display doctors data. */
  if (isLoading) return;
  
  setLoadingState(true);
  
  try {
    allDoctors = await fetchDoctors();
    
    // Add rating and availability for display
    allDoctors = allDoctors.map(doctor => ({
      ...doctor,
      rating: Math.floor(Math.random() * 2) + 4, // Random 4-5 star rating
      next_availability: getRandomAvailability()
    }));
    
    // Populate specialty filter
    populateSpecialtyFilter();
    
    // Apply current filters and render
    applyFilters();
    
    // Create search input if it doesn't exist
    createSearchAndFilterUI();
    
  } catch (error) {
    console.error('[doctors] Error loading doctors data:', error);
    showEmptyState('Failed to load doctors directory. Please try again.');
  } finally {
    setLoadingState(false);
  }
}

function createSearchAndFilterUI() {
  /** Create search and filter UI if it doesn't exist. */
  const doctorsSection = document.getElementById('our-doctors');
  const doctorsList = document.getElementById('doctors-list');
  
  if (!doctorsSection || !doctorsList) {
    console.warn('[doctors] Required DOM elements not found');
    return;
  }
  
  // Check if search UI already exists
  let searchContainer = document.getElementById('doctors-search-container');
  if (!searchContainer) {
    searchContainer = document.createElement('div');
    searchContainer.id = 'doctors-search-container';
    searchContainer.style.cssText = 'margin-bottom: 1.5rem; display: grid; gap: 1rem; grid-template-columns: 1fr auto; align-items: end;';
    
    searchContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label for="doctors-search" style="font-weight: 500; color: var(--text-dark);">Search Doctors</label>
        <input 
          type="text" 
          id="doctors-search" 
          placeholder="Search by name or specialty..." 
          style="padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;"
        />
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <label for="doctors-specialty-filter" style="font-weight: 500; color: var(--text-dark);">Filter by Specialty</label>
        <select 
          id="doctors-specialty-filter"
          style="padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; min-width: 200px;"
        >
          <option value="">All Specialties</option>
        </select>
      </div>
    `;
    
    // Insert before doctors list
    doctorsSection.insertBefore(searchContainer, doctorsList);
    
    // Re-attach event listeners
    const searchInput = document.getElementById('doctors-search');
    const specialtyFilter = document.getElementById('doctors-specialty-filter');
    
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
    }
    
    if (specialtyFilter) {
      specialtyFilter.addEventListener('change', handleFilter);
    }
  }
}

function populateSpecialtyFilter() {
  /** Populate the specialty filter dropdown with unique specialties. */
  const specialtyFilter = document.getElementById('doctors-specialty-filter');
  if (!specialtyFilter) return;
  
  const specialties = [...new Set(allDoctors.map(doctor => doctor.specialty))].sort();
  
  // Clear existing options except "All Specialties"
  specialtyFilter.innerHTML = '<option value="">All Specialties</option>';
  
  specialties.forEach(specialty => {
    const option = document.createElement('option');
    option.value = specialty;
    option.textContent = specialty;
    specialtyFilter.appendChild(option);
  });
}

function handleSearch(event) {
  /** Handle search input with debouncing. */
  const searchTerm = event.target.value.trim();
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Debounce search
  searchTimeout = setTimeout(() => {
    applyFilters(searchTerm);
  }, SEARCH_DEBOUNCE_MS);
}

function handleFilter(event) {
  /** Handle specialty filter change. */
  const searchInput = document.getElementById('doctors-search');
  const searchTerm = searchInput ? searchInput.value.trim() : '';
  applyFilters(searchTerm, event.target.value);
}

function applyFilters(searchTerm = '', specialty = '') {
  /** Apply search and filter criteria to doctors list. */
  const searchInput = document.getElementById('doctors-search');
  const specialtyFilter = document.getElementById('doctors-specialty-filter');
  
  const currentSearch = searchTerm || (searchInput ? searchInput.value.trim() : '');
  const currentSpecialty = specialty || (specialtyFilter ? specialtyFilter.value : '');
  
  filteredDoctors = allDoctors.filter(doctor => {
    const matchesSearch = !currentSearch || 
      doctor.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(currentSearch.toLowerCase());
    
    const matchesSpecialty = !currentSpecialty || doctor.specialty === currentSpecialty;
    
    return matchesSearch && matchesSpecialty;
  });
  
  // Reset pagination
  currentPage = 0;
  displayedDoctors = [];
  
  // Load first page
  loadMoreDoctors();
}

function loadMoreDoctors() {
  /** Load next page of doctors. */
  const startIndex = currentPage * DOCTORS_PER_PAGE;
  const endIndex = startIndex + DOCTORS_PER_PAGE;
  const nextPageDoctors = filteredDoctors.slice(startIndex, endIndex);
  
  if (nextPageDoctors.length > 0) {
    displayedDoctors.push(...nextPageDoctors);
    currentPage++;
    renderDoctors();
  }
  
  updateLoadMoreButton();
}

function renderDoctors() {
  /** Render the doctors grid. */
  const doctorsList = document.getElementById('doctors-list');
  if (!doctorsList) {
    console.warn('[doctors] Doctors list container not found');
    return;
  }
  
  // Set loading state
  doctorsList.setAttribute('aria-busy', 'false');
  
  if (displayedDoctors.length === 0) {
    showEmptyState();
    return;
  }
  
  // Create responsive grid
  doctorsList.className = 'grid grid-cols-1 sm-grid-cols-2 md-grid-cols-3 lg-grid-cols-4';
  doctorsList.style.cssText = 'gap: 1.5rem; margin-top: 1.5rem;';
  
  // Clear existing content if this is the first page
  if (currentPage === 1) {
    doctorsList.innerHTML = '';
  }
  
  // Render new doctors (only the ones not already rendered)
  const startIndex = (currentPage - 1) * DOCTORS_PER_PAGE;
  const newDoctors = displayedDoctors.slice(startIndex);
  
  newDoctors.forEach(doctor => {
    const doctorCard = createDoctorCard(doctor);
    doctorsList.appendChild(doctorCard);
  });
  
  updateLoadMoreButton();
}

function createDoctorCard(doctor) {
  /** Create a doctor card element. */
  const card = document.createElement('div');
  card.className = 'card doctor-card';
  card.style.cssText = 'height: fit-content; transition: transform 0.2s, box-shadow 0.2s;';
  card.setAttribute('role', 'listitem');
  
  // Handle missing or placeholder images
  const imageUrl = doctor.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=28bf96&color=ffffff&size=200`;
  
  // Generate star rating
  const stars = generateStarRating(doctor.rating);
  
  // Availability status
  const availabilityText = doctor.accepting_patients 
    ? `Next available: ${doctor.next_availability}`
    : 'Not accepting new patients';
  
  const availabilityClass = doctor.accepting_patients ? 'var(--success)' : 'var(--error)';
  
  card.innerHTML = `
    <div style="position: relative; overflow: hidden;">
      <img 
        src="${imageUrl}" 
        alt="${doctor.name}" 
        style="width: 100%; height: 200px; object-fit: cover;"
        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=28bf96&color=ffffff&size=200'"
      />
      ${!doctor.accepting_patients ? '<div style="position: absolute; top: 0.5rem; right: 0.5rem; background: var(--error); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Unavailable</div>' : ''}
    </div>
    <div style="padding: 1rem;">
      <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.1rem; font-weight: 600;">${doctor.name}</h3>
      <p style="margin: 0 0 0.5rem 0; color: var(--primary-color); font-weight: 500; font-size: 0.9rem;">${doctor.specialty}</p>
      
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
        <div style="color: #fbbf24;">${stars}</div>
        <span style="color: var(--text-light); font-size: 0.875rem;">(${doctor.rating}.0)</span>
      </div>
      
      ${doctor.bio ? `<p style="margin: 0 0 0.75rem 0; color: var(--text-light); font-size: 0.875rem; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${doctor.bio}</p>` : ''}
      
      <div style="margin-top: auto;">
        <p style="margin: 0; color: ${availabilityClass}; font-size: 0.875rem; font-weight: 500;">
          <i class="ri-calendar-line" aria-hidden="true"></i> ${availabilityText}
        </p>
      </div>
    </div>
  `;
  
  // Add hover effect
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-2px)';
    card.style.boxShadow = 'var(--shadow-lg)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'var(--shadow-sm)';
  });
  
  return card;
}

function generateStarRating(rating) {
  /** Generate star rating HTML. */
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="ri-star-fill" aria-hidden="true"></i>';
  }
  
  // Half star
  if (hasHalfStar) {
    starsHtml += '<i class="ri-star-half-line" aria-hidden="true"></i>';
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="ri-star-line" aria-hidden="true"></i>';
  }
  
  return starsHtml;
}

function getRandomAvailability() {
  /** Generate random next availability date. */
  const days = ['Today', 'Tomorrow', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const times = ['9:00 AM', '10:30 AM', '2:00 PM', '3:30 PM', '4:00 PM'];
  
  const randomDay = days[Math.floor(Math.random() * days.length)];
  const randomTime = times[Math.floor(Math.random() * times.length)];
  
  return `${randomDay} ${randomTime}`;
}

function updateLoadMoreButton() {
  /** Update load more button visibility and state. */
  let loadMoreBtn = document.getElementById('load-more-doctors');
  const doctorsSection = document.getElementById('our-doctors');
  
  if (!loadMoreBtn && doctorsSection) {
    // Create load more button
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'load-more-doctors';
    loadMoreBtn.className = 'btn';
    loadMoreBtn.style.cssText = 'margin: 2rem auto 0; display: block;';
    loadMoreBtn.innerHTML = '<i class="ri-add-line" aria-hidden="true"></i> Load More Doctors';
    loadMoreBtn.addEventListener('click', loadMoreDoctors);
    doctorsSection.appendChild(loadMoreBtn);
  }
  
  if (loadMoreBtn) {
    const hasMoreDoctors = displayedDoctors.length < filteredDoctors.length;
    loadMoreBtn.style.display = hasMoreDoctors ? 'block' : 'none';
    
    // Update button text with count
    const remainingCount = filteredDoctors.length - displayedDoctors.length;
    if (hasMoreDoctors) {
      loadMoreBtn.innerHTML = `<i class="ri-add-line" aria-hidden="true"></i> Load More (${remainingCount} remaining)`;
    }
  }
}

function showEmptyState(message = null) {
  /** Show empty state when no doctors are found. */
  const doctorsList = document.getElementById('doctors-list');
  if (!doctorsList) return;
  
  const emptyMessage = message || (filteredDoctors.length === 0 && allDoctors.length > 0 
    ? 'No doctors found matching your search criteria.' 
    : 'No doctors available at the moment.');
  
  doctorsList.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-light);">
      <i class="ri-user-search-line" aria-hidden="true" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
      <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">${message ? 'Error Loading' : 'No Doctors Found'}</h3>
      <p style="margin: 0;">${emptyMessage}</p>
      ${filteredDoctors.length === 0 && allDoctors.length > 0 ? '<button class="btn" onclick="document.getElementById(\'doctors-search\').value=\'\'; document.getElementById(\'doctors-specialty-filter\').value=\'\'; window.doctorsModule.applyFilters();" style="margin-top: 1rem;">Clear Filters</button>' : ''}
    </div>
  `;
  
  // Hide load more button
  const loadMoreBtn = document.getElementById('load-more-doctors');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = 'none';
  }
}

function setLoadingState(loading) {
  /** Set loading state for the doctors section. */
  isLoading = loading;
  const doctorsList = document.getElementById('doctors-list');
  
  if (doctorsList) {
    doctorsList.setAttribute('aria-busy', loading.toString());
    
    if (loading) {
      doctorsList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-light);">
          <i class="ri-loader-4-line" aria-hidden="true" style="font-size: 2rem; animation: spin 1s linear infinite;"></i>
          <p style="margin: 1rem 0 0 0;">Loading doctors...</p>
        </div>
      `;
      
      // Add spinner animation
      if (!document.getElementById('spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'spinner-styles';
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }
}

function openAddDoctorModal() {
  /** Open the add doctor modal with accessibility features. */
  if (!isAdmin()) {
    showToast('error', 'Access Denied', 'Only administrators can add doctors.');
    return;
  }
  
  const modal = document.getElementById('add-doctor-modal');
  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('is-open');
    
    // Focus the first input
    const firstInput = modal.querySelector('input[name="name"]');
    if (firstInput) {
      firstInput.focus();
    }
    
    // Set aria-hidden on main content
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('aria-hidden', 'true');
    }
  }
}

function closeAddDoctorModal() {
  /** Close the add doctor modal and clean up. */
  const modal = document.getElementById('add-doctor-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('is-open');
    
    // Remove aria-hidden from main content
    const main = document.querySelector('main');
    if (main) {
      main.removeAttribute('aria-hidden');
    }
    
    // Clear form and status
    clearAddDoctorForm();
  }
}

async function handleAddDoctorSubmit(event) {
  /** Handle add doctor form submission. */
  event.preventDefault();
  
  if (!isAdmin()) {
    showToast('error', 'Access Denied', 'Only administrators can add doctors.');
    return;
  }
  
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const statusDiv = document.getElementById('add-doctor-status');
  
  // Clear previous status
  if (statusDiv) {
    statusDiv.textContent = '';
  }
  
  // Validate form
  const validation = validateAddDoctorForm(form);
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
    submitButton.textContent = 'Adding...';
  }
  
  try {
    const formData = new FormData(form);
    const imageFile = formData.get('image');
    
    const doctorData = {
      name: formData.get('name').trim(),
      specialty: formData.get('specialty').trim(),
      bio: formData.get('bio').trim(),
      imageUrl: formData.get('imageUrl').trim(),
      acceptingPatients: formData.get('acceptingPatients') === 'on',
      imageFile: imageFile && imageFile.size > 0 ? imageFile : null
    };
    
    const result = await addDoctor(doctorData);
    
    if (result.ok) {
      // Add to local state optimistically
      const newDoctor = result.data;
      allDoctors.unshift(newDoctor);
      
      // Re-apply filters and re-render
      applyFilters();
      
      // Update appointment doctor dropdown
      updateAppointmentDoctorDropdown();
      
      showToast('success', 'Doctor Added!', `${newDoctor.name} has been added to the directory.`);
      closeAddDoctorModal();
      
      if (statusDiv) {
        statusDiv.textContent = 'Doctor added successfully!';
        statusDiv.style.color = 'var(--success)';
      }
    }
    
  } catch (error) {
    console.error('[doctors] Error adding doctor:', error);
    showToast('error', 'Add Failed', error.message);
    
    if (statusDiv) {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = 'var(--error)';
    }
  } finally {
    // Re-enable submit button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Save Doctor';
    }
  }
}

function validateAddDoctorForm(form) {
  /** Validate add doctor form inputs. */
  const formData = new FormData(form);
  
  const name = formData.get('name')?.trim();
  const specialty = formData.get('specialty')?.trim();
  const imageUrl = formData.get('imageUrl')?.trim();
  const imageFile = formData.get('image');
  
  if (!name) {
    return { isValid: false, message: 'Doctor name is required.' };
  }
  
  if (name.length < 2) {
    return { isValid: false, message: 'Doctor name must be at least 2 characters long.' };
  }
  
  if (!specialty) {
    return { isValid: false, message: 'Specialty is required.' };
  }
  
  if (specialty.length < 2) {
    return { isValid: false, message: 'Specialty must be at least 2 characters long.' };
  }
  
  // Validate image URL if provided
  if (imageUrl) {
    try {
      new URL(imageUrl);
    } catch {
      return { isValid: false, message: 'Please enter a valid image URL.' };
    }
  }
  
  // Validate image file if provided
  if (imageFile && imageFile.size > 0) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      return { isValid: false, message: 'Please upload a valid image file (JPEG, PNG, GIF, WebP).' };
    }
    
    // Check file size (5MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      return { isValid: false, message: 'Image file must be smaller than 5MB.' };
    }
  }
  
  return { isValid: true, message: 'Valid' };
}

async function uploadDoctorImage(imageFile, doctorName) {
  /** Upload doctor image to Supabase Storage. */
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  
  try {
    // Generate unique filename
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${doctorName.replace(/[^a-zA-Z0-9]/g, '-')}.${fileExt}`;
    
    // Upload to doctors bucket
    const { data, error } = await supabase.storage
      .from('doctors')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('doctors')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('[doctors] Error uploading image:', error);
    throw error;
  }
}

function updateAppointmentDoctorDropdown() {
  /** Update the appointment form doctor dropdown with current doctors. */
  const appointmentDoctorSelect = document.getElementById('appointment-doctor');
  if (!appointmentDoctorSelect) return;
  
  // Clear existing options except the first one
  appointmentDoctorSelect.innerHTML = '<option value="">Select a doctor...</option>';
  
  // Add active doctors only
  const activeDoctors = allDoctors.filter(doctor => doctor.accepting_patients);
  
  activeDoctors.forEach(doctor => {
    const option = document.createElement('option');
    option.value = doctor.id;
    option.textContent = `${doctor.name} - ${doctor.specialty}`;
    appointmentDoctorSelect.appendChild(option);
  });
}

function clearAddDoctorForm() {
  /** Clear add doctor form and status messages. */
  const form = document.getElementById('add-doctor-form');
  const statusDiv = document.getElementById('add-doctor-status');
  
  if (form) {
    form.reset();
  }
  
  if (statusDiv) {
    statusDiv.textContent = '';
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

// Export for global access (for clear filters button)
window.doctorsModule = {
  applyFilters: () => applyFilters()
};

console.debug('[doctors] Module loaded.');
