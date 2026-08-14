/* ==========================================================================
   TaskFlow AI — Shared UI UX Engine (Toast, Modals, Shortcuts, Layout)
   ========================================================================== */


// 1. Toast Notification System
function showToast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-up`;
  
  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <span style="font-weight: 700;">${iconMap[type] || 'ℹ'}</span>
    <span style="flex: 1;">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// 2. Custom Confirmation Modal Dialog (replaces window.confirm)
function showConfirmDialog({ title, message, confirmText = 'Confirm', confirmStyle = 'btn-danger', onConfirm }) {
  let backdrop = document.getElementById('confirm-modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'confirm-modal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
          <button class="modal-close" onclick="closeConfirmDialog()">&times;</button>
        </div>
        <div class="modal-body">
          <p id="confirm-modal-message" class="text-secondary" style="font-size: var(--text-sm); line-height: 1.6;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeConfirmDialog()">Cancel</button>
          <button class="btn" id="confirm-modal-action-btn">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
  }

  document.getElementById('confirm-modal-title').textContent = title || 'Confirm Action';
  document.getElementById('confirm-modal-message').textContent = message || 'Are you sure?';
  
  const actionBtn = document.getElementById('confirm-modal-action-btn');
  actionBtn.textContent = confirmText;
  actionBtn.className = `btn ${confirmStyle}`;

  // Clean old listeners
  const newActionBtn = actionBtn.cloneNode(true);
  actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);

  newActionBtn.addEventListener('click', () => {
    closeConfirmDialog();
    if (typeof onConfirm === 'function') onConfirm();
  });

  requestAnimationFrame(() => backdrop.classList.add('active'));
}

function closeConfirmDialog() {
  const backdrop = document.getElementById('confirm-modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// 3. General Modal Management
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    const firstInput = modal.querySelector('input, select, textarea, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// 4. Utility Functions
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

// 5. Sidebar Toggle & Responsive Navigation Handler
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('app-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');

  if (sidebar) {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
      });
    }

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Ignore when typing inside input elements
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openModal('create-task-modal');
    } else if (e.key === '/') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
    } else if (e.key === 'Escape') {
      // Close active modals
      document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
    }
  });
});
