/**
 * RecCenter Manager - Mock UI Application
 */

// Global state
const state = {
  currentRole: 'owner',
  currentPage: 'dashboard',
  mockData: null,
  selectedDate: new Date()
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await loadMockData();
  initializeNavigation();
  initializeRoleSwitcher();
  updateDateTime();
  setInterval(updateDateTime, 60000);
});

// Load mock data
async function loadMockData() {
  try {
    const response = await fetch('data/mock-data.json');
    state.mockData = await response.json();
    console.log('Mock data loaded:', state.mockData);
  } catch (error) {
    console.error('Failed to load mock data:', error);
    // Fallback to inline data if fetch fails
    state.mockData = getInlineMockData();
  }
}

// Navigation
function initializeNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      if (href && href !== '#') return; // Let normal links work

      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// Role Switcher
function initializeRoleSwitcher() {
  const switcher = document.getElementById('role-switcher');
  if (switcher) {
    switcher.addEventListener('change', (e) => {
      state.currentRole = e.target.value;
      updateUIForRole(state.currentRole);
    });
  }
}

function updateUIForRole(role) {
  // Show/hide elements based on role
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowedRoles = el.dataset.role.split(',');
    el.style.display = allowedRoles.includes(role) ? '' : 'none';
  });

  // Update navigation visibility
  document.querySelectorAll('.nav-item[data-role]').forEach(el => {
    const allowedRoles = el.dataset.role.split(',');
    el.style.display = allowedRoles.includes(role) ? '' : 'none';
  });
}

// Update date/time display
function updateDateTime() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
  }

  const timeEl = document.getElementById('current-time');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

// Schedule navigation
function navigateSchedule(direction) {
  const delta = direction === 'prev' ? -1 : 1;
  state.selectedDate.setDate(state.selectedDate.getDate() + delta);
  updateScheduleDisplay();
}

function updateScheduleDisplay() {
  const dateDisplay = document.getElementById('schedule-date');
  if (dateDisplay) {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    dateDisplay.textContent = state.selectedDate.toLocaleDateString('en-US', options);
  }
}

// Filter chips
function toggleFilter(element, type) {
  element.classList.toggle('active');
  applyFilters();
}

function applyFilters() {
  const activeFilters = Array.from(document.querySelectorAll('.filter-chip.active'))
    .map(chip => chip.dataset.filter);

  // Apply filters to schedule bookings
  document.querySelectorAll('.schedule-booking').forEach(booking => {
    const bookingType = booking.dataset.service;
    if (activeFilters.length === 0 || activeFilters.includes(bookingType)) {
      booking.style.display = '';
    } else {
      booking.style.display = 'none';
    }
  });
}

// Modal functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Session actions
function markSessionComplete(sessionId) {
  const sessionEl = document.querySelector(`[data-session-id="${sessionId}"]`);
  if (sessionEl) {
    const statusBadge = sessionEl.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = 'status-badge completed';
      statusBadge.textContent = 'Completed';
    }

    // Show success feedback
    showToast('Session marked as completed', 'success');
  }
}

function markSessionCancelled(sessionId) {
  openModal('cancel-modal');
  document.getElementById('cancel-session-id').value = sessionId;
}

function confirmCancellation() {
  const sessionId = document.getElementById('cancel-session-id').value;
  const reason = document.getElementById('cancel-reason').value;

  const sessionEl = document.querySelector(`[data-session-id="${sessionId}"]`);
  if (sessionEl) {
    const statusBadge = sessionEl.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = 'status-badge cancelled';
      statusBadge.textContent = 'Cancelled';
    }
  }

  closeModal('cancel-modal');
  showToast('Session cancelled', 'warning');
}

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'warning' ? '!' : 'i'}</span>
    <span class="toast-message">${message}</span>
  `;

  // Add toast styles if not present
  if (!document.getElementById('toast-styles')) {
    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: white;
        font-size: 0.875rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        z-index: 2000;
      }
      .toast-success { background: #22c55e; }
      .toast-warning { background: #f59e0b; }
      .toast-info { background: #3b82f6; }
      .toast-error { background: #ef4444; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Payroll functions
function approvePayroll(coachId) {
  const row = document.querySelector(`[data-coach-id="${coachId}"]`);
  if (row) {
    const statusCell = row.querySelector('.status-badge');
    if (statusCell) {
      statusCell.className = 'status-badge completed';
      statusCell.textContent = 'Approved';
    }
  }
  showToast('Payroll approved', 'success');
}

function approveAllPayroll() {
  document.querySelectorAll('[data-coach-id] .status-badge').forEach(badge => {
    badge.className = 'status-badge completed';
    badge.textContent = 'Approved';
  });
  showToast('All payroll approved', 'success');
}

// RC Billing functions
function submitRCBilling() {
  showToast('RC billing report submitted', 'success');
  document.querySelectorAll('.rc-claim-status').forEach(status => {
    status.className = 'status-badge rc-claim-status completed';
    status.textContent = 'Submitted';
  });
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Mobile sidebar toggle
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');
}

// Inline mock data fallback
function getInlineMockData() {
  return {
    facility: { name: "Wint's Recreation Center" },
    coaches: [
      { id: "c1", name: "Marcus Johnson", avatar: "MJ", services: ["swim", "fitness"] },
      { id: "c2", name: "Sarah Chen", avatar: "SC", services: ["swim"] },
      { id: "c3", name: "David Williams", avatar: "DW", services: ["basketball", "fitness"] },
      { id: "c4", name: "Emily Rodriguez", avatar: "ER", services: ["swim", "fitness"] }
    ],
    weeklyStats: {
      totalBookings: 47,
      completedSessions: 32,
      cancelledSessions: 4,
      revenue: { direct: 2850, regionalCenter: 3200, total: 6050 },
      fillRate: 0.72
    }
  };
}

// Export functions for use in HTML onclick handlers
window.navigateSchedule = navigateSchedule;
window.toggleFilter = toggleFilter;
window.openModal = openModal;
window.closeModal = closeModal;
window.markSessionComplete = markSessionComplete;
window.markSessionCancelled = markSessionCancelled;
window.confirmCancellation = confirmCancellation;
window.approvePayroll = approvePayroll;
window.approveAllPayroll = approveAllPayroll;
window.submitRCBilling = submitRCBilling;
window.toggleSidebar = toggleSidebar;
