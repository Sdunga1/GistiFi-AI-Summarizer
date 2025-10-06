/**
 * Profile Manager
 * Handles user profile settings and storage
 */
class ProfileManager {
  constructor() {
    this.profileData = {
      name: '',
      title: '',
      bio: '',
      avatar: null,
    };
    this.init();
  }

  init() {
    this.loadProfile();
    this.setupEventListeners();
    this.updateProfileDisplay();
  }

  setupEventListeners() {
    // Edit profile button in header
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        this.openProfileModal();
      });
    }

    // Profile modal close buttons
    const closeButtons = document.querySelectorAll(
      '[data-modal="profile-modal"]'
    );
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeProfileModal();
      });
    });

    // Change avatar button
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const imageInput = document.getElementById('profile-image-input');

    if (changeAvatarBtn && imageInput) {
      changeAvatarBtn.addEventListener('click', () => {
        imageInput.click();
      });

      imageInput.addEventListener('change', e => {
        this.handleImageUpload(e);
      });
    }

    // Save profile button
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => {
        this.saveProfile();
      });
    }

    // Character counters
    this.setupCharacterCounters();
  }

  setupCharacterCounters() {
    const nameInput = document.getElementById('profile-name');
    const titleInput = document.getElementById('profile-title');
    const bioInput = document.getElementById('profile-bio');

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.updateCharacterCounter(nameInput, 30);
      });
    }

    if (titleInput) {
      titleInput.addEventListener('input', () => {
        this.updateCharacterCounter(titleInput, 50);
      });
    }

    if (bioInput) {
      bioInput.addEventListener('input', () => {
        this.updateCharacterCounter(bioInput, 150);
      });
    }
  }

  updateCharacterCounter(input, maxLength) {
    const currentLength = input.value.length;
    const remaining = maxLength - currentLength;

    // Remove existing counter
    const existingCounter = input.parentNode.querySelector('.char-counter');
    if (existingCounter) {
      existingCounter.remove();
    }

    // Add new counter
    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.style.color = remaining < 10 ? '#ef4444' : '#6b7280';

    input.parentNode.appendChild(counter);
  }

  openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
      this.populateForm();
      modal.classList.remove('hidden');
    }
  }

  closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  populateForm() {
    const nameInput = document.getElementById('profile-name');
    const titleInput = document.getElementById('profile-title');
    const bioInput = document.getElementById('profile-bio');
    const avatarPreview = document.getElementById('profile-avatar-preview');

    if (nameInput) nameInput.value = this.profileData.name || '';
    if (titleInput) titleInput.value = this.profileData.title || '';
    if (bioInput) bioInput.value = this.profileData.bio || '';

    if (avatarPreview) {
      if (this.profileData.avatar) {
        avatarPreview.src = this.profileData.avatar;
      } else {
        avatarPreview.src = '../assets/icon.png';
      }
    }

    // Update character counters
    this.setupCharacterCounters();
  }

  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const avatarPreview = document.getElementById('profile-avatar-preview');
      if (avatarPreview) {
        avatarPreview.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  saveProfile() {
    const nameInput = document.getElementById('profile-name');
    const titleInput = document.getElementById('profile-title');
    const bioInput = document.getElementById('profile-bio');
    const avatarPreview = document.getElementById('profile-avatar-preview');

    // Get form data
    const profileData = {
      name: nameInput?.value.trim() || '',
      title: titleInput?.value.trim() || '',
      bio: bioInput?.value.trim() || '',
      avatar: avatarPreview?.src || null,
    };

    // Save to storage
    this.profileData = profileData;
    this.saveToStorage();

    // Update display
    this.updateProfileDisplay();

    // Close modal
    this.closeProfileModal();

    // Show success message
    this.showSuccessMessage('Profile saved successfully!');
  }

  saveToStorage() {
    try {
      chrome.storage.local.set({
        userProfile: this.profileData,
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  loadProfile() {
    try {
      chrome.storage.local.get(['userProfile'], result => {
        if (result.userProfile) {
          this.profileData = { ...this.profileData, ...result.userProfile };
          this.updateProfileDisplay();
        }
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  updateProfileDisplay() {
    // Update header profile display
    const headerAvatar = document.getElementById('header-profile-avatar');
    const headerName = document.getElementById('header-profile-name');
    const headerTitle = document.getElementById('header-profile-title');

    if (headerAvatar && headerName) {
      if (
        this.profileData &&
        this.profileData.avatar &&
        this.profileData.avatar !== '../assets/icon.png'
      ) {
        headerAvatar.src = this.profileData.avatar;
      } else {
        headerAvatar.src = '../assets/icon.png';
      }

      if (this.profileData && this.profileData.name) {
        headerName.textContent = this.profileData.name;
      } else {
        headerName.textContent = 'User';
      }
    }

    if (headerTitle) {
      if (this.profileData && this.profileData.title) {
        headerTitle.textContent = this.profileData.title;
      } else {
        headerTitle.textContent = 'Set your profile';
      }
    }

    // Dispatch event for other components to listen to
    this.dispatchProfileUpdate();
  }

  dispatchProfileUpdate() {
    // Dispatch custom event for other components to listen to
    const event = new CustomEvent('profileUpdated', {
      detail: this.profileData,
    });
    document.dispatchEvent(event);
  }

  showSuccessMessage(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      successDiv.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 300);
    }, 3000);
  }

  getProfileData() {
    return this.profileData;
  }

  hasProfile() {
    return !!(this.profileData.name || this.profileData.avatar);
  }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.profileManager = new ProfileManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileManager;
} else if (typeof window !== 'undefined') {
  window.ProfileManager = ProfileManager;
}
