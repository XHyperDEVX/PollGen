/**
 * Pollinations Image Generator - Main Application Logic
 * Vanilla JavaScript implementation with i18n support
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  apiKey: null,
  models: [],
  videoModels: [],
  currentMode: 'image', // 'image' or 'video'
  currentImage: null,
  isGenerating: false,
  imageHistory: [],
  videoHistory: [],
  allowedModels: null, // For filtering models based on API key permissions
  keyInfo: null, // Store key info from /account/key endpoint
  keyInfoApiKey: null, // Which API key the keyInfo was validated for
  showPremiumModels: false, // Whether to show premium models when toggle is available
  premiumToggleVisible: false, // Whether premium toggle should be shown
  uploadConsent: false, // Whether user has consented to external upload
  profile: null, // User profile data from /account/profile
  allModels: [], // Full model list (no API key)
  allVideoModels: [], // Full video model list (no API key)
  restrictedModels: [], // API-key filtered models
  restrictedVideoModels: [], // API-key filtered video models
  // Parallel mode state
  parallelMode: false,
  parallelCount: 2, // Number of images to generate in parallel
  activeJobs: new Map(), // Track active parallel jobs by genId
  parallelQueue: [], // Queue of pending jobs
  maxConcurrent: 3, // Maximum concurrent API requests
  completedCount: 0,
  failedCount: 0,
  currentSetId: null, // ID of current parallel set
  currentSetJobs: 0, // Number of jobs in current set
  // Image upload state
  uploadedImageUrl: null, // URL of uploaded image
  uploadedImageId: null, // Media server ID for uploaded image
  uploadedImageFile: null, // Original file for thumbnail display
  isUploading: false, // Upload in progress flag
  isDeletingUpload: false, // Delete in progress flag
  performanceMode: false, // Performance mode flag
  generationStartTimes: new Map(),
  timerIntervals: new Map()
};

// ============================================================================

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
const UPLOAD_CONSENT_VERSION = '2';

function isImageUploadSupported() {
  const select = document.getElementById('model');
  if (!select) return false;
  
  const currentModelName = select.value;
  const models = state.currentMode === 'video' ? state.videoModels : state.models;
  const model = models.find(m => m.name === currentModelName);
  
  if (!model) return false;
  
  const inputModalities = model.input_modalities || [];
  return inputModalities.includes('image');
}

function updateUploadUI() {
  const uploadIcon = document.getElementById('upload-icon');
  const uploadIconContainer = document.getElementById('upload-icon-container');
  const thumbnailWrapper = document.getElementById('upload-thumbnail-wrapper');
  
  if (!uploadIcon || !uploadIconContainer) return;
  
  const supported = isImageUploadSupported();
  const hasValidKey = isApiKeyValidForGeneration();

  if (!supported) {
    if (thumbnailWrapper) thumbnailWrapper.classList.remove('visible');
    uploadIconContainer.style.display = 'none';
    return;
  }
  
  if (state.isUploading || state.uploadedImageUrl) {
    if (thumbnailWrapper) thumbnailWrapper.classList.add('visible');
    uploadIconContainer.style.display = 'none';
  } else {
    if (thumbnailWrapper) thumbnailWrapper.classList.remove('visible');
    uploadIconContainer.style.display = 'flex';
    
    if (hasValidKey) {
      uploadIcon.classList.remove('disabled');
      uploadIcon.style.cursor = 'pointer';
    } else {
      uploadIcon.classList.add('disabled');
      uploadIcon.style.cursor = 'not-allowed';
    }
  }
}

function showUploadProgress(show) {
  const progressEl = document.getElementById('upload-progress');
  if (progressEl) {
    progressEl.style.display = show ? 'flex' : 'none';
  }
}

function showDeleteProgress(show) {
  const progressEl = document.getElementById('upload-delete-progress');
  if (progressEl) {
    progressEl.style.display = show ? 'flex' : 'none';
  }
}

function setUploadThumbnailFromUrl(url) {
  const thumbnail = document.getElementById('upload-thumbnail');
  const preview = document.getElementById('upload-thumbnail-preview');
  const src = url || '';
  const hasSrc = Boolean(url);

  if (thumbnail) {
    thumbnail.src = src;
    thumbnail.style.visibility = hasSrc ? 'visible' : 'hidden';
  }
  if (preview) {
    preview.src = src;
    preview.style.display = hasSrc ? 'block' : 'none';
  }
}

function clearUploadedImage() {
  state.uploadedImageUrl = null;
  state.uploadedImageId = null;
  state.uploadedImageFile = null;
  state.isUploading = false;
  state.isDeletingUpload = false;

  setUploadThumbnailFromUrl('');
  showUploadProgress(false);
  showDeleteProgress(false);
  
  const fileInput = document.getElementById('image-upload-input');
  if (fileInput) fileInput.value = '';
  
  updateUploadUI();
}

async function deleteUploadedImage() {
  const uploadId = state.uploadedImageId;

  if (!uploadId) {
    clearUploadedImage();
    return;
  }

  if (!state.apiKey) {
    setStatus(i18n.t('uploadErrorAuth'), 'error');
    clearUploadedImage();
    return;
  }

  state.isDeletingUpload = true;
  showDeleteProgress(true);

  try {
    const response = await fetch(`https://media.pollinations.ai/${encodeURIComponent(uploadId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.apiKey}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        setStatus(i18n.t('uploadErrorAuth'), 'error');
      } else {
        setStatus(i18n.t('uploadErrorServer'), 'error');
      }
    } else {
      setStatus(i18n.t('uploadDeleteSuccess'), 'success');
    }
  } catch (error) {
    console.error('Delete upload error:', error);
    setStatus(i18n.t('uploadErrorNetwork'), 'error');
  } finally {
    clearUploadedImage();
  }
}

function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: i18n.t('uploadErrorGeneric') };
  }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: i18n.t('uploadErrorFileType') };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: i18n.t('uploadErrorFileSize') };
  }
  
  return { valid: true };
}

function getUploadUrlFromResponse(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.url) return data.url;
  if (data.file && data.file.url) return data.file.url;
  if (Array.isArray(data.files) && data.files.length > 0) {
    return data.files[0].url || data.files[0].file?.url || data.files[0].src || null;
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === 'string') return first;
    return first.url || first.file?.url || null;
  }
  return null;
}

function getUploadIdFromResponse(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.id) return data.id;
  if (data.file && data.file.id) return data.file.id;
  if (Array.isArray(data.files) && data.files.length > 0) {
    return data.files[0].id || data.files[0].file?.id || null;
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first && typeof first === 'object') {
      return first.id || first.file?.id || null;
    }
  }
  return null;
}

async function uploadImageToPollinationsMedia(file) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    setStatus(validation.error, 'error');
    return null;
  }
  
  if (!state.apiKey) {
    setStatus(i18n.t('uploadErrorAuth'), 'error');
    return null;
  }
  
  state.isUploading = true;
  showUploadProgress(true);
  updateUploadUI();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const formData = new FormData();
    formData.append('file', file, file.name || `${generateRandomFilename()}.jpg`);
    
    const response = await fetch('https://media.pollinations.ai/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Upload failed:', response.status);
      if (response.status === 401 || response.status === 403) {
        setStatus(i18n.t('uploadErrorAuth'), 'error');
      } else if (response.status === 413) {
        setStatus(i18n.t('uploadErrorFileSize'), 'error');
      } else {
        setStatus(i18n.t('uploadErrorServer'), 'error');
      }
      return null;
    }
    
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      console.warn('Upload response did not include JSON:', error);
    }
    
    state.uploadedImageId = getUploadIdFromResponse(data);
    
    const uploadUrl = getUploadUrlFromResponse(data);
    if (uploadUrl) {
      return uploadUrl;
    }
    
    console.error('Upload succeeded but could not determine file URL');
    setStatus(i18n.t('uploadErrorServer'), 'error');
    return null;
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.name === 'AbortError' || error.name === 'TypeError') {
      setStatus(i18n.t('uploadErrorNetwork'), 'error');
    } else {
      setStatus(i18n.t('uploadErrorGeneric'), 'error');
    }
    
    return null;
  } finally {
    state.isUploading = false;
    showUploadProgress(false);
    updateUploadUI();
  }
}

async function handleImageUpload(file) {
  if (!isImageUploadSupported()) {
    setStatus(i18n.t('uploadErrorGeneric'), 'error');
    return;
  }
  
  if (!state.apiKey) {
    setStatus(i18n.t('uploadErrorAuth'), 'error');
    return;
  }
  
  const validation = validateImageFile(file);
  if (!validation.valid) {
    setStatus(validation.error, 'error');
    return;
  }

  state.uploadedImageUrl = null;
  state.uploadedImageId = null;
  state.uploadedImageFile = null;
  setUploadThumbnailFromUrl('');
  updateUploadUI();
  
  const url = await uploadImageToPollinationsMedia(file);
  
  if (url) {
    state.uploadedImageUrl = url;
    state.uploadedImageFile = null;
    setUploadThumbnailFromUrl(url);
    setStatus(i18n.t('uploadSuccess') || 'Image uploaded successfully', 'success');
    updateUploadUI();
  } else {
    clearUploadedImage();
  }
}

function setupImageUploadHandlers() {
  const uploadIcon = document.getElementById('upload-icon');
  const uploadIconContainer = document.getElementById('upload-icon-container');
  const fileInput = document.getElementById('image-upload-input');
  const deleteBtn = document.getElementById('upload-thumbnail-delete');
  
  if (uploadIconContainer) {
    uploadIconContainer.addEventListener('click', () => {
      if (!state.apiKey) {
        setStatus(i18n.t('uploadErrorAuth'), 'error');
        return;
      }
      if (isImageUploadSupported() && !state.isUploading) {
        // Check if user has consented to external upload
        if (!state.uploadConsent) {
          showUploadConsentPopup(() => {
            fileInput?.click();
          });
        } else {
          fileInput?.click();
        }
      }
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImageUpload(file);
      }
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteUploadedImage();
    });
  }
}

function showUploadConsentPopup(onConfirm) {
  // Check if popup already exists
  let popup = document.getElementById('upload-consent-popup');
  if (popup) {
    popup.classList.add('visible');
    return;
  }
  
  // Create popup
  popup = document.createElement('div');
  popup.id = 'upload-consent-popup';
  popup.className = 'upload-consent-popup';
  const consentText = i18n.t('uploadConsentText')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  popup.innerHTML = `
    <div class="upload-consent-content">
      <h3>${i18n.t('uploadConsentTitle')}</h3>
      <p>${consentText}</p>
      <div class="upload-consent-buttons">
        <button class="upload-consent-confirm">${i18n.t('uploadConsentConfirm')}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Show popup
  requestAnimationFrame(() => {
    popup.classList.add('visible');
  });
  
  // Handle confirm
  const confirmBtn = popup.querySelector('.upload-consent-confirm');
  confirmBtn.addEventListener('click', () => {
    saveUploadConsent(true);
    popup.classList.remove('visible');
    if (onConfirm) onConfirm();
  });
}

// Expose upload functions to window for inline script access
window.clearUploadedImage = clearUploadedImage;
window.updateUploadUI = updateUploadUI;

// BALANCE DISPLAY
// ============================================================================

function formatBalanceDisplay(balance) {
  const currentLang = i18n.getCurrentLanguage();
  const decimalSeparator = currentLang === 'de' ? ',' : '.';
  
  // Round to maximum 5 decimal places, then remove trailing zeros
  const rounded = Math.round(balance * 100000) / 100000;
  let formatted = rounded.toString();
  
  // Remove trailing zeros after decimal point
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }
  
  // Replace decimal separator based on locale
  return formatted.replace('.', decimalSeparator);
}

function formatExpirationTime(expiresIn) {
  if (expiresIn === null || expiresIn === undefined) return '';

  const seconds = Math.max(0, Number(expiresIn) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${i18n.t('keyValidFor')}${hours}${i18n.t('hoursShort')}${minutes}${i18n.t('minutesShort')}`;
}

async function validateApiKeyInfo(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  try {
    const response = await fetch('https://gen.pollinations.ai/account/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Key validation API call failed:', error.message);
    return { valid: false };
  }
}

async function fetchBalance(apiKey) {
  try {
    const response = await fetch('https://gen.pollinations.ai/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.balance;
  } catch (error) {
    console.log('Balance API call failed:', error.message);
    return null;
  }
}

function setGenerateButtonEnabled(enabled) {
  const generateBtn = document.getElementById('generate-btn');
  if (!generateBtn) return;

  if (state.isGenerating) {
    generateBtn.disabled = true;
    return;
  }

  generateBtn.disabled = !enabled;
}

function setSidebarControlsEnabled(enabled) {
  const sidebarContent = document.querySelector('.sidebar-content');
  if (!sidebarContent) return;

  const controls = sidebarContent.querySelectorAll('input, select, textarea, button');
  controls.forEach(control => {
    control.disabled = !enabled;
  });

  const customSelects = sidebarContent.querySelectorAll('.custom-select');
  customSelects.forEach(select => {
    select.classList.toggle('disabled', !enabled);
  });
}

function isApiKeyValidForGeneration() {
  return Boolean(
    state.apiKey &&
      state.keyInfo &&
      state.keyInfoApiKey === state.apiKey &&
      state.keyInfo.valid !== false
  );
}

async function updateBalance(apiKey, forceReload = false) {
  const apiKeyHint = document.getElementById('api-key-hint');
  if (!apiKeyHint) return;

  apiKeyHint.classList.remove('hidden');

  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    apiKeyHint.innerHTML = i18n.t('apiKeyHint');
    state.keyInfo = null;
    state.keyInfoApiKey = null;
    state.allowedModels = null;
    state.profile = null;
    clearPersistedApiKey();
    setGenerateButtonEnabled(false);
    updateLoginButtonState(false);
    displayProfile(null);
    setSidebarControlsEnabled(false);
    setPremiumToggleVisible(false);
    clearModels();
    return;
  }

  let keyInfo = state.keyInfo;
  let isKeyChanged = !keyInfo || state.keyInfoApiKey !== trimmedKey;

  if (isKeyChanged) {
    keyInfo = await validateApiKeyInfo(trimmedKey);

    if (state.apiKey !== trimmedKey) return;

    if (!keyInfo || keyInfo.valid === false) {
      apiKeyHint.textContent = i18n.t('invalidApiKey');
      state.keyInfo = null;
      state.keyInfoApiKey = null;
      state.allowedModels = null;
      state.profile = null;
      clearPersistedApiKey();
      setGenerateButtonEnabled(false);
      updateLoginButtonState(false);
      displayProfile(null);
      setSidebarControlsEnabled(false);
      setPremiumToggleVisible(false);
      clearModels();
      return;
    }

    state.keyInfo = keyInfo;
    state.keyInfoApiKey = trimmedKey;
  }

  persistApiKey(trimmedKey);
  setGenerateButtonEnabled(true);
  updateLoginButtonState(true);

  if (keyInfo.permissions && keyInfo.permissions.models) {
    state.allowedModels = keyInfo.permissions.models;
  } else {
    state.allowedModels = null;
  }

  setSidebarControlsEnabled(true);
  if (isKeyChanged || forceReload) {
  await loadModels();

  // Check for profile permission and fetch profile
  const hasProfilePermission =
    keyInfo.permissions &&
    keyInfo.permissions.account &&
    keyInfo.permissions.account.includes('profile');

  if (hasProfilePermission) {
    const profile = await fetchProfile(trimmedKey);
    if (state.apiKey === trimmedKey && profile) {
      state.profile = profile;
      displayProfile(profile);
    }
  } else {
    state.profile = null;
    displayProfile(null);
  }
  }

  const hasBalancePermission =
    keyInfo.permissions &&
    keyInfo.permissions.account &&
    keyInfo.permissions.account.includes('balance');

  if (!hasBalancePermission) {
    apiKeyHint.textContent = i18n.t('balancePermissionError');
    updateUploadUI();
    return;
  }

  const balance = await fetchBalance(trimmedKey);

  if (state.apiKey !== trimmedKey) return;

  if (typeof balance === 'number' && !isNaN(balance)) {
    const formattedBalance = formatBalanceDisplay(balance);
    let displayText = `${formattedBalance} ${i18n.t('balanceRemaining')}`;

    if (keyInfo.expiresIn !== null && keyInfo.expiresIn !== undefined) {
      displayText += ` • ${formatExpirationTime(keyInfo.expiresIn)}`;
    }

    apiKeyHint.textContent = displayText;
  } else {
    apiKeyHint.textContent = i18n.t('balancePermissionError');
  }
  updateUploadUI();
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

// Premium Models Filter
function loadShowPremiumModels() {
  const saved = localStorage.getItem('pollgen_show_premium_models');
  if (saved !== null) {
    state.showPremiumModels = saved === 'true';
  } else {
    state.showPremiumModels = false;
  }

  const checkbox = document.getElementById('show-premium-models');
  if (checkbox) {
    checkbox.checked = state.showPremiumModels;
  }

  return state.showPremiumModels;
}

function saveShowPremiumModels(show) {
  state.showPremiumModels = show;
  localStorage.setItem('pollgen_show_premium_models', show.toString());
}

function setPremiumToggleVisible(visible) {
  state.premiumToggleVisible = visible;
  const toggle = document.getElementById('premium-models-toggle');
  if (toggle) {
    toggle.classList.toggle('hidden', !visible);
  }
  if (!visible) {
    state.showPremiumModels = false;
    saveShowPremiumModels(false);
  }
}

function loadUploadConsent() {
  const storedVersion = localStorage.getItem('pollgen_upload_consent_version');
  const saved = localStorage.getItem('pollgen_upload_consent');

  if (storedVersion !== UPLOAD_CONSENT_VERSION) {
    state.uploadConsent = false;
    localStorage.setItem('pollgen_upload_consent', 'false');
    localStorage.setItem('pollgen_upload_consent_version', UPLOAD_CONSENT_VERSION);
    return state.uploadConsent;
  }

  if (saved !== null) {
    state.uploadConsent = saved === 'true';
  } else {
    state.uploadConsent = false;
  }

  return state.uploadConsent;
}

function saveUploadConsent(consent) {
  state.uploadConsent = consent;
  localStorage.setItem('pollgen_upload_consent', consent.toString());
  localStorage.setItem('pollgen_upload_consent_version', UPLOAD_CONSENT_VERSION);
}

function loadPerformanceMode() {
  const saved = localStorage.getItem('pollgen_performance_mode');
  if (saved !== null) {
    state.performanceMode = saved === 'true';
  } else {
    state.performanceMode = false;
  }

  const checkbox = document.getElementById('performance-mode');
  if (checkbox) {
    checkbox.checked = state.performanceMode;
  }

  return state.performanceMode;
}

function savePerformanceMode(enabled) {
  state.performanceMode = Boolean(enabled);
  localStorage.setItem('pollgen_performance_mode', state.performanceMode.toString());
}

function loadApiKey() {
  const saved = sessionStorage.getItem('pollinations_api_key');
  if (saved && saved.trim()) {
    state.apiKey = saved.trim();
    return true;
  }
  return false;
}

function persistApiKey(key) {
  if (!key || !key.trim()) {
    return false;
  }
  const trimmedKey = key.trim();
  sessionStorage.setItem('pollinations_api_key', trimmedKey);
  return true;
}

function clearPersistedApiKey() {
  sessionStorage.removeItem('pollinations_api_key');
}

function saveApiKey(key) {
  if (!key || !key.trim()) {
    return false;
  }
  const trimmedKey = key.trim();
  state.apiKey = trimmedKey;
  return true;
}

function validateApiKey() {
  const input = document.getElementById('api-key');
  if (!input) return false;
  
  const key = input.value.trim();
  if (key) {
    saveApiKey(key);
    return true;
  }
  return false;
}

// ============================================================================
// MODEL MANAGEMENT
// ============================================================================

const MODELS_CACHE_KEY = 'pollinations_models_cache';
const MODELS_CACHE_TIMESTAMP_KEY = 'pollinations_models_cache_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchModelsFromAPI(apiKey = null) {
  try {
    const headers = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch('https://gen.pollinations.ai/image/models', { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();

    // Filter for image models (exclude video models for image mode)
    const imageModels = data.filter(model => {
      const modalities = model.output_modalities || [];
      return modalities.includes('image') && !modalities.includes('video');
    });

    // Filter for video models
    const videoModels = data.filter(model => {
      const modalities = model.output_modalities || [];
      return modalities.includes('video');
    });

    if (!apiKey) {
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(imageModels));
      localStorage.setItem('pollinations_video_models_cache', JSON.stringify(videoModels));
      localStorage.setItem(MODELS_CACHE_TIMESTAMP_KEY, Date.now().toString());
    }

    return { imageModels, videoModels };
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

function getCachedModels() {
  try {
    const cached = localStorage.getItem(MODELS_CACHE_KEY);
    const videoCached = localStorage.getItem('pollinations_video_models_cache');
    const timestamp = localStorage.getItem(MODELS_CACHE_TIMESTAMP_KEY);
    if (!cached || !timestamp) return null;
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION_MS) return null;
    return {
      imageModels: JSON.parse(cached),
      videoModels: videoCached ? JSON.parse(videoCached) : []
    };
  } catch (error) {
    console.error('Error reading cached models:', error);
    return null;
  }
}

function clearModels() {
  state.models = [];
  state.videoModels = [];
  state.allModels = [];
  state.allVideoModels = [];
  state.restrictedModels = [];
  state.restrictedVideoModels = [];
  renderModelOptions([]);
  updateUploadUI();
}

function applyActiveModels(forceReset = false) {
  const useAllModels = !state.premiumToggleVisible || state.showPremiumModels;
  state.models = useAllModels ? state.allModels : state.restrictedModels;
  state.videoModels = useAllModels ? state.allVideoModels : state.restrictedVideoModels;

  const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
  renderModelOptions(modelsToRender, forceReset);
  updateUploadUI();
}

async function loadModels() {
  if (!state.apiKey) {
    clearModels();
    setPremiumToggleVisible(false);
    setStatus('', '');
    return;
  }

  setStatus(i18n.t('modelLoading'), 'info');

  let publicModels = null;
  try {
    publicModels = await fetchModelsFromAPI();
  } catch (error) {
    const cached = getCachedModels();
    if (cached && cached.imageModels && cached.imageModels.length > 0) {
      publicModels = cached;
    } else {
      setStatus(i18n.t('modelLoadError'), 'error');
      return;
    }
  }

  let keyModels = null;
  try {
    keyModels = await fetchModelsFromAPI(state.apiKey);
  } catch (error) {
    keyModels = publicModels;
  }

  state.allModels = publicModels.imageModels;
  state.allVideoModels = publicModels.videoModels || [];
  state.restrictedModels = keyModels.imageModels;
  state.restrictedVideoModels = keyModels.videoModels || [];

  const publicCount = state.allModels.length + state.allVideoModels.length;
  const restrictedCount = state.restrictedModels.length + state.restrictedVideoModels.length;

  if (restrictedCount < publicCount) {
    setPremiumToggleVisible(true);
    loadShowPremiumModels();
  } else {
    setPremiumToggleVisible(false);
    state.showPremiumModels = false;
    saveShowPremiumModels(false);
  }

  applyActiveModels(false);
  setStatus('', '');
}

function formatModelPrice(model) {
  const pricing = model.pricing || {};
  const isVideoModel = model.output_modalities && model.output_modalities.includes('video');

  // Use completionVideoTokens/completionVideoSeconds for video models, completionImageTokens for image models
  let completionTokens;
  if (isVideoModel) {
    // Some video models use completionVideoTokens, others use completionVideoSeconds
    completionTokens = pricing.completionVideoTokens || pricing.completionVideoSeconds || 0;
  } else {
    completionTokens = pricing.completionImageTokens || pricing.completion || 0;
  }
  if (typeof completionTokens === 'string') completionTokens = parseFloat(completionTokens);

  // Format as decimal number (not exponential)
  let priceStr = '0';
  if (completionTokens && completionTokens !== 0) {
    if (completionTokens < 0.01) {
      // For small values, use up to 8 decimal places to show values like 0.0000018
      priceStr = completionTokens.toFixed(8).replace(/\.?0+$/, '');
    } else if (completionTokens < 1) {
      priceStr = completionTokens.toFixed(4).replace(/\.?0+$/, '');
    } else {
      priceStr = completionTokens.toFixed(2).replace(/\.?0+$/, '');
    }
  }

  // Get currency and capitalize first letter
  let currency = pricing.currency || 'pollen';
  currency = currency.charAt(0).toUpperCase() + currency.slice(1);

  // Check for text token pricing
  let textTokenPrice = null;
  const promptTextTokens = pricing.promptTextTokens || pricing.prompt_text || 0;
  const promptImageTokens = pricing.promptImageTokens || pricing.prompt_image || 0;

  // Use promptTextTokens if available, otherwise fall back to promptImageTokens
  const textTokenValue = promptTextTokens || promptImageTokens;

  if (textTokenValue && textTokenValue !== 0) {
    const tokensPerMillion = textTokenValue * 1000000;
    if (tokensPerMillion < 0.01) {
      textTokenPrice = tokensPerMillion.toExponential(2);
    } else {
      textTokenPrice = tokensPerMillion.toString().replace(/\.?0+$/, '');
    }
  }

  return { price: priceStr, currency, textTokenPrice, hasTextTokens: !!textTokenPrice, isVideoModel };
}

function renderModelOptions(models, forceReset = false) {
  const select = document.getElementById('model');
  const modelPopover = document.getElementById('model-popover');
  const currentModelName = document.getElementById('current-model-name');
  if (!select || !modelPopover) return;

  const previousValue = forceReset ? '' : select.value;
  select.innerHTML = '';
  modelPopover.innerHTML = '';

  // Filter models by permissions if allowedModels is set
  let filteredModels = models;
  if (state.allowedModels && Array.isArray(state.allowedModels)) {
    filteredModels = models.filter(model => state.allowedModels.includes(model.name));
  }

  const sortedModels = [...filteredModels].sort((a, b) => {
    const isVideoA = a.output_modalities && a.output_modalities.includes('video');
    const isVideoB = b.output_modalities && b.output_modalities.includes('video');
    let priceA = isVideoA
      ? (a.pricing?.completionVideoTokens || a.pricing?.completionVideoSeconds || 0)
      : (a.pricing?.completionImageTokens || a.pricing?.completion || 0);
    let priceB = isVideoB
      ? (b.pricing?.completionVideoTokens || b.pricing?.completionVideoSeconds || 0)
      : (b.pricing?.completionImageTokens || b.pricing?.completion || 0);
    if (typeof priceA === 'string') priceA = parseFloat(priceA) || 0;
    if (typeof priceB === 'string') priceB = parseFloat(priceB) || 0;
    return priceA - priceB;
  });

  if (sortedModels.length === 0) {
    if (currentModelName) {
      currentModelName.textContent = i18n.t('modelPlaceholder');
    }
    select.value = '';
    const costText = document.getElementById('cost-text');
    if (costText) costText.textContent = '0';
    return;
  }
  
  // Calculate max width needed for descriptions
  let maxWidth = 280; // Default minimum width
  const measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  
  // Helper function to get premium indicator HTML
  const getPremiumIndicator = () => `<span class="model-premium" title="${i18n.t('paidOnlyError')}">⭐ ${i18n.t('paidOnlyLabel')}</span>`;
  // Helper function to get img2img indicator HTML
  const getImg2ImgIndicator = () => `<span class="model-img2img" title="${i18n.t('img2imgSupported')}">🖼️ Img2Img</span>`;
  
  sortedModels.forEach(model => {
    const name = model.name || 'Unknown';
    const description = model.description || '';
    const priceInfo = formatModelPrice(model);
    const isPremium = model.paid_only === true;
    const isImg2Img = model.input_modalities && model.input_modalities.includes('image');
    
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = name;
    select.appendChild(option);

    const item = document.createElement('div');
    item.className = 'popover-item';
    if (model.name === previousValue) item.classList.add('selected');
    
    // Create display text with name and description
    let displayHTML = `<div class="model-badge" style="background-color: ${stringToColor(name)}"></div>`;
    displayHTML += '<div class="model-info">';
    
    if (description && description !== name) {
      displayHTML += `<div class="model-name-desc">${name}${isPremium ? getPremiumIndicator() : ''}${isImg2Img ? getImg2ImgIndicator() : ''}</div>`;
      displayHTML += `<div class="model-description">${description}</div>`;
      
      // Measure width for both lines
      const nameWidth = ctx.measureText(name).width;
      const descWidth = ctx.measureText(description).width;
      const textWidth = Math.max(nameWidth, descWidth) + 120; // Add padding for badge, premium indicator, and margins
      maxWidth = Math.max(maxWidth, textWidth);
    } else {
      displayHTML += `<div class="model-name-single">${name}${isPremium ? getPremiumIndicator() : ''}${isImg2Img ? getImg2ImgIndicator() : ''}</div>`;
      const textWidth = ctx.measureText(name).width + 120;
      maxWidth = Math.max(maxWidth, textWidth);
    }
    
    if (priceInfo.price !== '0') {
      if (priceInfo.hasTextTokens) {
        // Combine image/video price and text token price on one line
        const unitLabel = priceInfo.isVideoModel ? i18n.t('perSecond') : i18n.t('perImage');
        const mediaPriceStr = `${priceInfo.price} ${priceInfo.currency.toLowerCase()} ${unitLabel}`;
        const textPriceStr = `${priceInfo.textTokenPrice} ${priceInfo.currency.toLowerCase()}${i18n.t('tokensPerMillion')}`;
        const combinedPriceStr = `${mediaPriceStr}・${textPriceStr}`;
        displayHTML += `<div class="model-price">${combinedPriceStr}</div>`;
        // Measure combined line width
        const combinedWidth = ctx.measureText(combinedPriceStr).width + 50;
        maxWidth = Math.max(maxWidth, combinedWidth);
      } else {
        const unitLabel = priceInfo.isVideoModel ? i18n.t('perSecond') : '';
        const priceDisplay = unitLabel
          ? `${priceInfo.price} ${priceInfo.currency} ${unitLabel}`
          : `${priceInfo.price} ${priceInfo.currency}`;
        displayHTML += `<div class="model-price">${priceDisplay}</div>`;
        // Measure price line width
        const priceWidth = ctx.measureText(priceDisplay).width + 50;
        maxWidth = Math.max(maxWidth, priceWidth);
      }
    } else if (priceInfo.textTokenPrice) {
      // Only text token pricing available
      const textPriceStr = `${priceInfo.textTokenPrice} ${priceInfo.currency.toLowerCase()}${i18n.t('tokensPerMillion')}`;
      displayHTML += `<div class="model-price text-token-price">${textPriceStr}</div>`;
      // Measure text token price line width
      const textTokenWidth = ctx.measureText(textPriceStr).width + 50;
      maxWidth = Math.max(maxWidth, textTokenWidth);
    }
    
    displayHTML += '</div>';
    item.innerHTML = displayHTML;
    
    item.onclick = (e) => {
      e.stopPropagation();
      select.value = model.name;
      const btnImg2ImgIndicator = isImg2Img ? getImg2ImgIndicator() : '';
      const btnPremiumIndicator = isPremium ? getPremiumIndicator() : '';
      currentModelName.innerHTML = name + btnPremiumIndicator + btnImg2ImgIndicator;
      const btnBadge = document.querySelector('#model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(name);
      modelPopover.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      updateCostDisplay(model);
      modelPopover.classList.remove('visible');
      updateUploadUI();
    };
    modelPopover.appendChild(item);
  });
  
  // Set popover width to accommodate longest description
  modelPopover.style.width = Math.min(maxWidth, 450) + 'px';
  
  if (previousValue && [...select.options].some(opt => opt.value === previousValue)) {
    select.value = previousValue;
    const model = sortedModels.find(m => m.name === previousValue);
    if (model) {
      const isPremium = model.paid_only === true;
      const isImg2Img = model.input_modalities && model.input_modalities.includes('image');
      const btnImg2ImgIndicator = isImg2Img ? getImg2ImgIndicator() : '';
      const btnPremiumIndicator = isPremium ? getPremiumIndicator() : '';
      currentModelName.innerHTML = model.name + btnPremiumIndicator + btnImg2ImgIndicator;
      const btnBadge = document.querySelector('#model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(model.name);
      updateCostDisplay(model);
    }
  } else if (sortedModels.length > 0) {
    select.value = sortedModels[0].name;
    const isPremium = sortedModels[0].paid_only === true;
    const isImg2Img = sortedModels[0].input_modalities && sortedModels[0].input_modalities.includes('image');
    const btnImg2ImgIndicator = isImg2Img ? getImg2ImgIndicator() : '';
      const btnPremiumIndicator = isPremium ? getPremiumIndicator() : '';
    currentModelName.innerHTML = sortedModels[0].name + btnPremiumIndicator + btnImg2ImgIndicator;
    const btnBadge = document.querySelector('#model-select-btn .model-badge');
    if (btnBadge) btnBadge.style.backgroundColor = stringToColor(sortedModels[0].name);
    updateCostDisplay(sortedModels[0]);
    modelPopover.querySelector('.popover-item')?.classList.add('selected');
  }
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Function to update model options when switching modes (exposed to window for inline script)
window.updateModelOptionsForMode = function(mode) {
  state.currentMode = mode;
  const modelsToRender = mode === 'video' ? state.videoModels : state.models;
  // Force reset to ensure no cross-contamination between image and video modes
  renderModelOptions(modelsToRender, true);
};

// Function to update cost display based on currently selected model (exposed to window)
window.updateCurrentCostDisplay = function() {
  const select = document.getElementById('model');
  if (!select) return;
  const currentModelName = select.value;
  const models = state.currentMode === 'video' ? state.videoModels : state.models;
  const model = models.find(m => m.name === currentModelName);
  if (model) {
    updateCostDisplay(model);
  }
};

function updateCostDisplay(model) {
  const costText = document.getElementById('cost-text');
  if (costText) {
    const priceInfo = formatModelPrice(model);
    const durationInput = document.getElementById('duration');
    const modeInput = document.getElementById('mode');
    const isVideoMode = modeInput && modeInput.value === 'video';

    let price = parseFloat(priceInfo.price) || 0;

    // For video models, multiply by duration
    if (isVideoMode && priceInfo.isVideoModel && durationInput) {
      const duration = parseInt(durationInput.value, 10) || 5;
      price = price * duration;
    }

    // In parallel mode, multiply by count
    if (state.parallelMode && state.parallelCount > 1) {
      price = price * state.parallelCount;
    }

    // Format the price as decimal (not exponential)
    let priceStr;
    if (price === 0) priceStr = '0';
    else if (price < 0.01) {
      // For small values, use up to 8 decimal places
      priceStr = price.toFixed(8).replace(/\.?0+$/, '');
    } else if (price < 1) {
      priceStr = price.toFixed(4).replace(/\.?0+$/, '');
    } else {
      priceStr = price.toFixed(2).replace(/\.?0+$/, '');
    }

    costText.textContent = priceStr;
  }
}

// Update cost display when model changes (exposed to window)
window.updateCurrentCostDisplay = function() {
  const select = document.getElementById('model');
  if (!select) return;
  const currentModelName = select.value;
  const models = state.currentMode === 'video' ? state.videoModels : state.models;
  const model = models.find(m => m.name === currentModelName);
  if (model) {
    updateCostDisplay(model);
  }
};

// ============================================================================
// IMAGE GENERATION
// ============================================================================

async function generateImage(payload) {
  if (!state.apiKey) throw new Error(i18n.t('apiKeyMissing'));
  
  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(payload.prompt)}`;
  const params = new URLSearchParams();
  if (payload.model) params.append('model', payload.model);
  if (payload.width) params.append('width', payload.width);
  if (payload.height) params.append('height', payload.height);
  if (payload.seed) params.append('seed', payload.seed);
  if (payload.negative_prompt) params.append('negative_prompt', payload.negative_prompt);
  if (payload.enhance) params.append('enhance', 'true');
  if (payload.private) params.append('private', 'true');
  if (payload.nologo) params.append('nologo', 'true');
  if (payload.nofeed) params.append('nofeed', 'true');
  if (payload.safe) params.append('safe', 'true');
  if (payload.image) params.append('image', payload.image);
  
  const url = `${endpoint}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${state.apiKey}` }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseErrorMessage(errorText, response.status));
  }
  
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);
  
  return {
    success: true,
    imageData: imageUrl,
    contentType: blob.type,
    sourceUrl: url
  };
}

async function generateVideo(payload) {
  if (!state.apiKey) throw new Error(i18n.t('apiKeyMissing'));

  // Video uses the same /image endpoint, just with a video model and duration parameter
  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(payload.prompt)}`;
  const params = new URLSearchParams();
  if (payload.model) params.append('model', payload.model);
  if (payload.width) params.append('width', payload.width);
  if (payload.height) params.append('height', payload.height);
  if (payload.aspectRatio) params.append('aspectRatio', payload.aspectRatio);
  if (payload.duration) params.append('duration', payload.duration);
  if (payload.seed) params.append('seed', payload.seed);
  if (payload.negative_prompt) params.append('negative_prompt', payload.negative_prompt);
  if (payload.enhance) params.append('enhance', 'true');
  if (payload.private) params.append('private', 'true');
  if (payload.nologo) params.append('nologo', 'true');
  if (payload.nofeed) params.append('nofeed', 'true');
  if (payload.safe) params.append('safe', 'true');
  if (payload.image) params.append('image', payload.image);

  const url = `${endpoint}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${state.apiKey}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseErrorMessage(errorText, response.status));
  }

  const blob = await response.blob();
  const videoUrl = URL.createObjectURL(blob);

  return {
    success: true,
    videoData: videoUrl,
    contentType: blob.type,
    sourceUrl: url
  };
}

function parseErrorMessage(text, status) {
    try {
        const json = JSON.parse(text);
        let msg = json.error?.message || json.message || text;
        if (typeof msg === 'string' && msg.startsWith('{')) {
            const inner = JSON.parse(msg);
            msg = inner.message || inner.error || msg;
        }
        // Check for 402 payment error with premium model message
        if (status === 402 && typeof msg === 'string') {
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes('premium model') || lowerMsg.includes('paid balance')) {
                return `${i18n.t('errorGeneration')}: ${status} - ${i18n.t('paidOnlyError')}`;
            }
        }
        return `${i18n.t('errorGeneration')}: ${status} - ${msg}`;
    } catch (e) {
        // Check for 402 payment error even when JSON parsing fails
        if (status === 402 && typeof text === 'string') {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('premium model') || lowerText.includes('paid balance')) {
                return `${i18n.t('errorGeneration')}: ${status} - ${i18n.t('paidOnlyError')}`;
            }
        }
        return `${i18n.t('errorGeneration')}: ${status} - ${text}`;
    }
}

// ============================================================================
// PARALLEL MODE
// ============================================================================

function updateParallelProgress() {
  const generateBtn = document.getElementById('generate-btn');
  const btnText = generateBtn?.querySelector('#generate-btn-text');
  if (!btnText) return;

  // Only show progress during active parallel generation
  if (state.parallelMode && state.currentSetJobs > 0) {
    const activeCount = state.activeJobs.size;
    const queueCount = state.parallelQueue.length;
    const total = state.currentSetJobs;
    const completed = state.completedCount;
    
    if (total > 1) {
      btnText.textContent = i18n.t('generatingProgress', [completed + 1, total]);
    }
  }
}

function addParallelStatusBadge(card, status, jobIndex, totalJobs) {
  // Only show badges during parallel generation
  if (!state.parallelMode) return;
  
  const existingBadge = card.querySelector('.parallel-status-badge');
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement('div');
  badge.className = `parallel-status-badge ${status}`;
  badge.innerHTML = `<span class="badge-index">${jobIndex + 1}/${totalJobs}</span><span class="badge-status"></span>`;
  
  const statusSpan = badge.querySelector('.badge-status');
  switch (status) {
    case 'pending':
    case 'active':
      statusSpan.textContent = '⏳';
      break;
    case 'completed':
      statusSpan.textContent = '✓';
      break;
    case 'error':
      statusSpan.textContent = '✗';
      break;
  }

  card.insertBefore(badge, card.firstChild);
}

function removeParallelStatusBadge(card) {
  const badge = card.querySelector('.parallel-status-badge');
  if (badge) badge.remove();
}

async function processParallelJob(job, totalJobs, setId) {
  startGenerationTimer(job.genId);
  const { genId, payload, isVideoMode, index } = job;
  const card = document.getElementById(`gen-card-${genId}`);

  if (card && setId === state.currentSetId) {
    addParallelStatusBadge(card, "active", index, totalJobs);
  }

  state.activeJobs.set(genId, { job, status: "active", index, setId });

  try {
    if (isVideoMode) {
      const response = await generateVideo(payload);
      stopGenerationTimer(genId);
      displayVideoResultInCard(genId, response);
      handleUsageIntegration(genId, payload.model, true);
      addToVideoHistory(response);
    } else {
      const response = await generateImage(payload);
      stopGenerationTimer(genId);
      displayResultInCard(genId, response);
      handleUsageIntegration(genId, payload.model, false);
      addToImageHistory(response);
    }

    state.completedCount++;
    if (card && setId === state.currentSetId) {
      addParallelStatusBadge(card, "completed", index, totalJobs);
    }
    state.activeJobs.set(genId, { job, status: "completed", index, setId });
    
    // Update balance after each successful parallel job
    if (state.apiKey) updateBalance(state.apiKey);
    
    return { success: true, genId };
  } catch (error) {
    state.failedCount++;
    if (card && setId === state.currentSetId) {
      addParallelStatusBadge(card, "error", index, totalJobs);
      const placeholder = card.querySelector(".noise-placeholder");
      if (placeholder) {
        placeholder.style.background =
          "linear-gradient(135deg, #2a2a2a 0%, #3a2a2a 100%)";
      }
    }
    state.activeJobs.set(genId, { job, status: "error", index, setId, error });
    console.error(`Parallel job ${genId} failed:`, error);
    return { success: false, genId, error };
  }
}

let parallelProcessorRunning = false;

async function startParallelProcessor(setId, totalJobs) {
  if (parallelProcessorRunning) return;
  parallelProcessorRunning = true;

  const emptyState = document.getElementById('placeholder');

  if (emptyState) emptyState.style.display = 'none';

  toggleLoading(true);
  updateParallelProgress();

  try {
    while (state.parallelQueue.length > 0 || state.activeJobs.size > 0) {
      // Start new jobs up to maxConcurrent
      while (state.activeJobs.size < state.maxConcurrent && state.parallelQueue.length > 0) {
        const job = state.parallelQueue.shift();
        processParallelJob(job, totalJobs, setId).then(() => {
          updateParallelProgress();
        });
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up completed jobs from activeJobs
      for (const [genId, jobState] of state.activeJobs) {
        if (jobState.status === 'completed' || jobState.status === 'error') {
          state.activeJobs.delete(genId);
        }
      }
    }
    
    // Update balance after all jobs complete
    if (state.apiKey) {
      await updateBalance(state.apiKey);
    }

    // Show summary if there were failures
    if (state.failedCount > 0 && state.completedCount > 0) {
      setStatus(i18n.t('parallelComplete', [state.completedCount, state.failedCount]), 'info');
    } else if (state.failedCount > 0 && state.completedCount === 0) {
      setStatus(i18n.t('statusError'), 'error');
    } else {
      setStatus('', '');
    }
  } catch (error) {
    setStatus(error.message || i18n.t('statusError'), 'error');
    console.error(error);
  } finally {
    toggleLoading(false);
    parallelProcessorRunning = false;
    // Clear set tracking
    state.currentSetId = null;
    state.currentSetJobs = 0;
  }
}

function addParallelJobs(payload, isVideoMode, count) {
  const galleryFeed = document.getElementById('gallery-feed');
  const emptyState = document.getElementById('placeholder');
  
  if (emptyState) emptyState.style.display = 'none';
  
  // Create a new set ID for this batch
  const setId = Date.now();
  state.currentSetId = setId;
  state.currentSetJobs = count;
  state.completedCount = 0;
  state.failedCount = 0;
  
  // Create a container for the parallel set
  const setContainer = document.createElement('div');
  setContainer.className = 'parallel-set';
  setContainer.id = `parallel-set-${setId}`;
  galleryFeed.appendChild(setContainer);

  // Create placeholder cards for each job and add initial badges
  for (let i = 0; i < count; i++) {
    const jobPayload = {
      ...payload,
      seed: generateRandomSeed()
    };

    const genId = Date.now() + i + Math.random();
    const card = isVideoMode ? createVideoPlaceholderCard(genId) : createPlaceholderCard(genId);
    setContainer.appendChild(card);

    // Add initial "pending" badge immediately (shows X/Y ⏳)
    addParallelStatusBadge(card, 'pending', i, count);

    state.parallelQueue.push({
      genId,
      payload: jobPayload,
      isVideoMode,
      setId,
      index: i
    });
  }

  // Scroll to show new cards
  setTimeout(() => {
    const scrollContainer = document.getElementById('canvas-workspace');
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, 50);

  // Start processor
  startParallelProcessor(setId, count);
}

function switchParallelMode(enabled) {
  state.parallelMode = enabled;
  
  // Update checkbox state if called programmatically
  const checkbox = document.getElementById('parallel-checkbox');
  if (checkbox && checkbox.checked !== enabled) {
    checkbox.checked = enabled;
  }
  
  // Show/hide the count display
  const countDisplay = document.getElementById('parallel-count-display');
  if (countDisplay) {
    countDisplay.classList.toggle('visible', enabled);
  }
  
  // Disable/enable seed field
  const seedInput = document.getElementById('seed');
  if (seedInput) {
    seedInput.disabled = enabled;
    if (enabled) {
      seedInput.placeholder = i18n.t('seedParallelPlaceholder');
      seedInput.value = '';
    } else {
      seedInput.placeholder = i18n.t('seedPlaceholder');
    }
  }
  
  // Update count unit label (Images/Videos)
  updateCountUnitLabel();
  
  // Update cost display
  window.updateCurrentCostDisplay && window.updateCurrentCostDisplay();
}

function updateCountUnitLabel() {
  const countUnit = document.getElementById('count-unit');
  if (!countUnit) return;
  
  const modeInput = document.getElementById('mode');
  const isVideoMode = modeInput && modeInput.value === 'video';
  
  countUnit.textContent = isVideoMode ? i18n.t('videosLabel') : i18n.t('imagesLabel');
}

// Expose updateCountUnitLabel to window for inline mode switch
window.updateCountUnitLabel = updateCountUnitLabel;

function updateParallelCount(delta) {
  const countEl = document.getElementById('parallel-count');
  if (!countEl) return;
  
  let value = parseInt(countEl.textContent, 10) || 2;
  value = Math.max(2, Math.min(9, value + delta));
  countEl.textContent = value;
  state.parallelCount = value;
  
  // Update cost display
  window.updateCurrentCostDisplay && window.updateCurrentCostDisplay();
}

function setupParallelCountHandlers() {
  const display = document.getElementById('parallel-count-display');
  if (!display) return;
  
  // Left-click to increment
  display.addEventListener('click', (e) => {
    e.preventDefault();
    updateParallelCount(1);
  });
  
  // Right-click to decrement
  display.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    updateParallelCount(-1);
  });
  
  // Scroll wheel to change value
  display.addEventListener('wheel', (e) => {
    e.preventDefault();
    updateParallelCount(e.deltaY > 0 ? -1 : 1);
  }, { passive: false });
  
  // Initialize state from display
  const countEl = document.getElementById('parallel-count');
  if (countEl) {
    state.parallelCount = parseInt(countEl.textContent, 10) || 2;
  }
}

// Expose switchParallelMode to window for inline onchange handlers
window.switchParallelMode = switchParallelMode;

function generateRandomSeed() {
  return Math.floor(100000 + Math.random() * 900000);
}

function collectPayload() {
  const promptInput = document.getElementById('prompt');
  const modelInput = document.getElementById('model');
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const aspectRatioInput = document.getElementById('aspect-ratio');
  const seedInput = document.getElementById('seed');
  const negativePromptInput = document.getElementById('negative_prompt');
  const modeInput = document.getElementById('mode');
  const durationInput = document.getElementById('duration');

  if (!promptInput) return {};

  const mode = modeInput ? modeInput.value : 'image';

  const payload = {
    prompt: promptInput.value.trim(),
    model: modelInput ? modelInput.value : '',
    mode: mode
  };

  // Include width/height for both image and video modes
  if (widthInput) payload.width = Number(widthInput.value);
  if (heightInput) payload.height = Number(heightInput.value);

  // Include aspectRatio for video mode
  if (mode === 'video' && aspectRatioInput && aspectRatioInput.value) {
    payload.aspectRatio = aspectRatioInput.value;
  }

  // Include duration for video mode
  if (mode === 'video' && durationInput) {
    payload.duration = Number(durationInput.value);
  }

  if (seedInput && seedInput.value.trim() !== "") {
      payload.seed = Number(seedInput.value);
  } else {
      payload.seed = generateRandomSeed();
  }

  if (negativePromptInput && negativePromptInput.value.trim()) {
      payload.negative_prompt = negativePromptInput.value.trim();
  }
  // Include uploaded image URL for image-to-image generation
  if (state.uploadedImageUrl && mode === 'image' && isImageUploadSupported()) {
    payload.image = state.uploadedImageUrl;
  }

  // Boolean flags
  ['enhance', 'private', 'nologo', 'nofeed', 'safe'].forEach(flag => {
    const checkbox = document.getElementById(flag);
    if (checkbox && checkbox.checked) payload[flag] = true;
  });

  return payload;
}

// ============================================================================
// UI UPDATES
// ============================================================================

function checkResolution() {
  const resolutionWarning = document.getElementById('resolution-warning');
  if (!resolutionWarning) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  // Add buffer to prevent false alarms on 1080p monitors
  // Accounts for browser chrome (tabs, address bar, bookmarks, etc.)
  const is1080p = width >= 1910 && height >= 900;

  if (is1080p) {
    resolutionWarning.classList.remove('visible');
  } else {
    resolutionWarning.classList.add('visible');
  }
}

function checkMobileDevice() {
  const mobileWarning = document.getElementById('mobile-warning');
  if (!mobileWarning) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  // Consider screen mobile if significantly smaller than typical desktop
  // Using 768px as common breakpoint for tablets/mobiles
  const isMobile = width < 768 || height < 600;

  if (isMobile) {
    mobileWarning.classList.add('visible');
  } else {
    mobileWarning.classList.remove('visible');
  }
}

function setStatus(message, type = 'info') {
  const statusBox = document.getElementById('status');
  if (!statusBox) return;
  if (!message) {
    statusBox.style.display = 'none';
    return;
  }
  statusBox.textContent = message;
  statusBox.className = `status-msg ${type}`;
  statusBox.style.display = 'block';
  if (type !== 'error') {
    setTimeout(() => { statusBox.style.display = 'none'; }, 5000);
  }
}

let activeFireflyRaf = null;
let activeFireflyRo = null;

// Map to track multiple firefly animations by layer element
const fireflyAnimations = new Map();

function startFireflyTicker(layer) {
  if (!layer) return;

  const fireflies = Array.from(layer.querySelectorAll('.firefly'));
  if (fireflies.length === 0) return;

  const bounds = { w: 0, h: 0 };

  const updateBounds = () => {
    bounds.w = layer.clientWidth || 0;
    bounds.h = layer.clientHeight || 0;

    if (!bounds.w || !bounds.h) return;

    const margin = Math.min(12, Math.max(4, Math.round(Math.min(bounds.w, bounds.h) * 0.02)));

    for (const el of fireflies) {
      const size = parseFloat(el.dataset.size || '0') || 0;
      const minX = margin;
      const minY = margin;
      const maxX = Math.max(minX, bounds.w - size - margin);
      const maxY = Math.max(minY, bounds.h - size - margin);

      let x = parseFloat(el.dataset.x);
      let y = parseFloat(el.dataset.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const rx = parseFloat(el.dataset.rx || '0');
        const ry = parseFloat(el.dataset.ry || '0');
        x = rx * (maxX - minX) + minX;
        y = ry * (maxY - minY) + minY;
      } else {
        x = Math.min(maxX, Math.max(minX, x));
        y = Math.min(maxY, Math.max(minY, y));
      }

      el.dataset.x = x.toString();
      el.dataset.y = y.toString();
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  };

  updateBounds();

  // Create per-layer ResizeObserver
  let ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(updateBounds);
    ro.observe(layer);
  }

  const last = { t: performance.now() };

  const tick = (t) => {
    const dt = Math.min(0.05, Math.max(0.008, (t - last.t) / 1000));
    last.t = t;

    if (!bounds.w || !bounds.h) {
      updateBounds();
      const anim = fireflyAnimations.get(layer);
      if (anim) anim.raf = requestAnimationFrame(tick);
      return;
    }

    const margin = Math.min(12, Math.max(4, Math.round(Math.min(bounds.w, bounds.h) * 0.02)));

    for (const el of fireflies) {
      const size = parseFloat(el.dataset.size || '0') || 0;
      const minX = margin;
      const minY = margin;
      const maxX = Math.max(minX, bounds.w - size - margin);
      const maxY = Math.max(minY, bounds.h - size - margin);

      let x = parseFloat(el.dataset.x);
      let y = parseFloat(el.dataset.y);
      let vx = parseFloat(el.dataset.vx || '0');
      let vy = parseFloat(el.dataset.vy || '0');

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const rx = parseFloat(el.dataset.rx || '0');
        const ry = parseFloat(el.dataset.ry || '0');
        x = rx * (maxX - minX) + minX;
        y = ry * (maxY - minY) + minY;
      }

      x += vx * dt;
      y += vy * dt;

      if (x < minX) {
        x = minX;
        vx = Math.abs(vx);
      } else if (x > maxX) {
        x = maxX;
        vx = -Math.abs(vx);
      }

      if (y < minY) {
        y = minY;
        vy = Math.abs(vy);
      } else if (y > maxY) {
        y = maxY;
        vy = -Math.abs(vy);
      }

      el.dataset.x = x.toString();
      el.dataset.y = y.toString();
      el.dataset.vx = vx.toString();
      el.dataset.vy = vy.toString();

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    const anim = fireflyAnimations.get(layer);
    if (anim) anim.raf = requestAnimationFrame(tick);
  };

  const raf = requestAnimationFrame(tick);
  
  // Store animation state for this layer
  fireflyAnimations.set(layer, { raf, ro });
  
  // Return cleanup function
  return () => stopFireflyTickerForLayer(layer);
}

function stopFireflyTickerForLayer(layer) {
  const anim = fireflyAnimations.get(layer);
  if (anim) {
    if (anim.raf) cancelAnimationFrame(anim.raf);
    if (anim.ro) anim.ro.disconnect();
    fireflyAnimations.delete(layer);
  }
}

function stopAllFireflyTickers() {
  for (const [layer, anim] of fireflyAnimations) {
    if (anim.raf) cancelAnimationFrame(anim.raf);
    if (anim.ro) anim.ro.disconnect();
  }
  fireflyAnimations.clear();
}

function stopFireflyTicker() {
  stopAllFireflyTickers();
}

function toggleLoading(isLoading) {
  state.isGenerating = isLoading;
  const generateBtn = document.getElementById('generate-btn');
  const modeInput = document.getElementById('mode');
  const isVideoMode = modeInput && modeInput.value === 'video';

  if (!isLoading) {
    stopAllFireflyTickers();
  }

  if (generateBtn) {
    // In parallel mode, keep the button enabled but show loading state
    if (state.parallelMode && (state.parallelQueue.length > 0 || state.activeJobs.size > 0)) {
      generateBtn.disabled = false; // Allow clicking to add more jobs
    } else {
      generateBtn.disabled = isLoading || !isApiKeyValidForGeneration();
    }

    const btnText = generateBtn.querySelector('#generate-btn-text');
    if (btnText) {
      const hasJobs = state.parallelQueue.length > 0 || state.activeJobs.size > 0;
      if (isLoading || (state.parallelMode && hasJobs)) {
        btnText.textContent = isVideoMode ? i18n.t('generatingVideoLabel') : i18n.t('generatingLabel');
      } else {
        btnText.textContent = isVideoMode ? i18n.t('generateVideoBtn') : i18n.t('generateBtn');
      }
    }
    if (isLoading || (state.parallelMode && (state.parallelQueue.length > 0 || state.activeJobs.size > 0))) {
      generateBtn.classList.add('loading');
    } else {
      generateBtn.classList.remove('loading');
    }
  }
}

let imageCardResizeRaf = null;

function getCanvasWorkspaceContentSize() {
  const workspace = document.getElementById('canvas-workspace');
  if (!workspace) return { w: window.innerWidth, h: window.innerHeight };

  const rect = workspace.getBoundingClientRect();
  const styles = window.getComputedStyle(workspace);
  const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
  const padY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);

  return {
    w: Math.max(240, rect.width - padX),
    h: Math.max(200, rect.height - padY)
  };
}

function applyImageCardSizing(card) {
  if (!card) return;

  const w = Number(card.dataset.w);
  const h = Number(card.dataset.h);
  if (!w || !h) return;

  const { w: availableW, h: availableH } = getCanvasWorkspaceContentSize();
  const maxW = Math.min(availableW, (availableH * w) / h);
  card.style.maxWidth = `${Math.floor(maxW)}px`;
}

function resizeAllImageCards() {
  document.querySelectorAll('.image-card, .video-card').forEach(applyImageCardSizing);
}

function scheduleImageCardResize() {
  if (imageCardResizeRaf) cancelAnimationFrame(imageCardResizeRaf);
  imageCardResizeRaf = requestAnimationFrame(() => {
    resizeAllImageCards();
    imageCardResizeRaf = null;
  });
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function createTimerOverlay(genId) {
    const timer = document.createElement('div');
    timer.className = 'generation-timer generating';
    timer.id = `timer-${genId}`;
    timer.innerHTML = `<span class="timer-value">0s</span>`;
    return timer;
}

function startGenerationTimer(genId) {
    if (state.timerIntervals.has(genId)) {
        clearInterval(state.timerIntervals.get(genId));
    }
    state.generationStartTimes.set(genId, Date.now());
    const interval = setInterval(() => {
        updateTimerDisplay(genId);
    }, 1000);
    state.timerIntervals.set(genId, interval);
}

function stopGenerationTimer(genId) {
    const interval = state.timerIntervals.get(genId);
    if (interval) {
        clearInterval(interval);
        state.timerIntervals.delete(genId);
    }
    const startTime = state.generationStartTimes.get(genId);
    if (!startTime) return 0;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    const timer = document.getElementById(`timer-${genId}`);
    if (timer && !timer.classList.contains('completed')) {
        const valueEl = timer.querySelector('.timer-value');
        if (valueEl) valueEl.textContent = formatDuration(duration);
        // Hide immediately by removing generating class
        timer.classList.remove('generating');
        // We will add 'completed' class once usage info is updated or retries exhausted
    }
    
    return duration;
}

function updateTimerDisplay(genId, finalDuration = null) {
    const timer = document.getElementById(`timer-${genId}`);
    // If completed or updating, don't touch it
    if (!timer || timer.classList.contains('completed') || timer.classList.contains('updating')) return;
    
    const valueEl = timer.querySelector('.timer-value');
    if (!valueEl) return;
    
    const startTime = state.generationStartTimes.get(genId);
    if (!startTime) return;
    const duration = finalDuration !== null ? finalDuration : Math.floor((Date.now() - startTime) / 1000);
    
    valueEl.textContent = formatDuration(duration);
}

async function fetchUsageData(apiKey) {
    if (!apiKey) return null;
    try {
        const response = await fetch('https://gen.pollinations.ai/account/usage?format=json&limit=5', {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching usage:', error);
        return null;
    }
}

function formatMeterSource(source) {
    if (source === 'tier') return 'free';
    if (source === 'pack' || source === 'crypto' || source === 'cryto') return 'paid';
    return source;
}

function formatResponseTime(ms) {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function updateTimerWithUsage(genId, usageRecord) {
    const timer = document.getElementById(`timer-${genId}`);
    if (!timer) return;
    
    const duration = usageRecord.response_time_ms ? formatResponseTime(usageRecord.response_time_ms) : formatDuration(state.generationStartTimes.has(genId) ? Math.floor((Date.now() - state.generationStartTimes.get(genId)) / 1000) : 0);
    const model = usageRecord.model || '';
    const cost = usageRecord.cost_usd !== undefined ? usageRecord.cost_usd : '';
    const source = formatMeterSource(usageRecord.meter_source);
    
    // Clear and update content
    timer.innerHTML = `
        <span class="timer-label">${i18n.t('timerModelLabel')}:</span> <span class="timer-final-value">${model}</span>, 
        <span class="timer-label">${i18n.t('timerTimeLabel')}:</span> <span class="timer-final-value">${duration}</span>, 
        <span class="timer-label">${i18n.t('timerCostLabel')}:</span> <span class="timer-final-value">${cost} P. (${source})</span>
    `;
    
    // Ensure it's hidden before adding completed class
    timer.classList.remove('generating');
    timer.classList.remove('updating');
    
    // Use a tiny delay to ensure DOM update and avoid transition issues
    requestAnimationFrame(() => {
        timer.classList.add('completed');
    });
}

async function handleUsageIntegration(genId, model, isVideo) {
    const timer = document.getElementById(`timer-${genId}`);
    if (timer) timer.classList.add('updating');

    if (!state.apiKey || !state.keyInfo) {
        stopGenerationTimer(genId);
        if (timer) {
            timer.classList.remove('updating');
            timer.classList.add('completed');
        }
        return;
    }
    
    const hasUsagePermission = state.keyInfo.permissions?.account?.includes('usage');
    if (!hasUsagePermission) {
        stopGenerationTimer(genId);
        if (timer) {
            timer.classList.remove('updating');
            timer.classList.add('completed');
        }
        return;
    }
    
    const startTime = state.generationStartTimes.get(genId);
    const type = 'generate.image';
    const keyName = state.keyInfo.name;

    for (let i = 0; i < 5; i++) {
        // Shorter initial delay, then increasing
        await new Promise(r => setTimeout(r, 1000 + i * 1500));
        
        const usageData = await fetchUsageData(state.apiKey);
        if (!usageData || !usageData.usage) continue;
        
        const matchingRecord = usageData.usage.find(r => {
            const rTime = new Date(r.timestamp.includes("Z") ? r.timestamp : r.timestamp.replace(" ", "T") + "Z").getTime();
            const timeMatch = Math.abs(rTime - startTime) < 60000;
            const typeMatch = r.type === type;
            const nameMatch = r.api_key === keyName;
            const modelMatch = r.model === model;
            

            return typeMatch && nameMatch && modelMatch && timeMatch;
        });
        
        if (matchingRecord) {
            updateTimerWithUsage(genId, matchingRecord);
            return;
        }
    }
    
    stopGenerationTimer(genId);
    if (timer) {
        timer.classList.remove('updating');
        timer.classList.add('completed');
    }
}
function createPlaceholderCard(genId) {
    const card = document.createElement("div");
    card.className = "image-card";
    card.id = `gen-card-${genId}`;

    const w = Number(document.getElementById("width").value) || 1024;
    const h = Number(document.getElementById("height").value) || 1024;
    const ratio = (h / w) * 100;

    card.dataset.w = w.toString();
    card.dataset.h = h.toString();
    applyImageCardSizing(card);

    const placeholder = document.createElement("div");
    placeholder.className = "noise-placeholder";
    placeholder.style.paddingBottom = `${ratio}%`;

    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (state.performanceMode || prefersReducedMotion) {
        placeholder.appendChild(createPerformanceLoader());
    } else {
        const fireflyLayer = document.createElement("div");
        fireflyLayer.className = "firefly-layer";
        placeholder.appendChild(fireflyLayer);

        const colors = ["#ff00ff", "#00ffff", "#ffff00", "#ff00aa", "#00ffaa"];
        const baseCount = Math.min(55, Math.max(28, Math.round((w * h) / 55000)));
        const fireflyCount = baseCount;

        for (let i = 0; i < fireflyCount; i++) {
            const firefly = document.createElement("div");
            firefly.className = "firefly";
            const size = Math.random() * 4.5 + 2;
            firefly.style.width = size + "px";
            firefly.style.height = size + "px";
            firefly.dataset.size = size.toString();
            firefly.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            const brightness = Math.random() * 0.55 + 0.45;
            firefly.style.filter = `brightness(${brightness})`;
            firefly.dataset.rx = Math.random().toString();
            firefly.dataset.ry = Math.random().toString();
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 45 + 18;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            firefly.dataset.vx = vx.toString();
            firefly.dataset.vy = vy.toString();
            firefly.style.animationDelay = Math.random() * 4 + "s";
            firefly.style.animationDuration = `${Math.random() * 2 + 3.5}s`;
            fireflyLayer.appendChild(firefly);
        }

        if (fireflyCount > 0) {
            requestAnimationFrame(() => startFireflyTicker(fireflyLayer));
        }
    }

    card.appendChild(placeholder);
    const overlay = document.createElement("div");
    overlay.className = "image-card-overlay";
    overlay.innerHTML = `
        <button class="overlay-btn download-btn hidden" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
        </button>
    `;
    card.appendChild(overlay);

    const timer = createTimerOverlay(genId);
    card.appendChild(timer);

    return card;
}

function displayResultInCard(genId, data) {
    const card = document.getElementById(`gen-card-${genId}`);
    if (!card) return;

    const placeholder = card.querySelector('.noise-placeholder');
    const overlay = card.querySelector('.image-card-overlay');
    const downloadBtn = card.querySelector('.download-btn');
    
    const fireflyLayer = placeholder?.querySelector('.firefly-layer');
    if (fireflyLayer) {
      stopFireflyTickerForLayer(fireflyLayer);
    }

    const img = new Image();
    img.src = data.imageData;
    img.onclick = () => openLightbox(data.imageData);
    img.onload = () => {
        placeholder.remove();
        card.insertBefore(img, overlay);
        img.offsetHeight;
        img.classList.add('loaded');
        downloadBtn.classList.remove('hidden');
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadImage(data.imageData, `pollgen-${genId}.png`);
        };
        addThumbnailToMiniView(genId, data.imageData);
    };
}

function createVideoPlaceholderCard(genId) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.id = `gen-card-${genId}`;

    const w = Number(document.getElementById('width').value) || 1024;
    const h = Number(document.getElementById('height').value) || 576;
    const ratio = (h / w) * 100;

    card.dataset.w = w.toString();
    card.dataset.h = h.toString();
    applyImageCardSizing(card);

    const placeholder = document.createElement('div');
    placeholder.className = 'noise-placeholder';
    placeholder.style.paddingBottom = `${ratio}%`;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (state.performanceMode || prefersReducedMotion) {
        placeholder.appendChild(createPerformanceLoader());
    } else {
        const fireflyLayer = document.createElement('div');
        fireflyLayer.className = 'firefly-layer';
        placeholder.appendChild(fireflyLayer);

        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00ffaa'];
        const baseCount = Math.min(55, Math.max(28, Math.round((w * h) / 55000)));
        const fireflyCount = baseCount;

        for (let i = 0; i < fireflyCount; i++) {
            const firefly = document.createElement('div');
            firefly.className = 'firefly';
            const size = Math.random() * 4.5 + 2;
            firefly.style.width = size + 'px';
            firefly.style.height = size + 'px';
            firefly.dataset.size = size.toString();
            firefly.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            const brightness = Math.random() * 0.55 + 0.45;
            firefly.style.filter = `brightness(${brightness})`;
            firefly.dataset.rx = Math.random().toString();
            firefly.dataset.ry = Math.random().toString();
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 45 + 18;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            firefly.dataset.vx = vx.toString();
            firefly.dataset.vy = vy.toString();
            firefly.style.animationDelay = Math.random() * 4 + 's';
            firefly.style.animationDuration = `${Math.random() * 2 + 3.5}s`;
            fireflyLayer.appendChild(firefly);
        }

        if (fireflyCount > 0) {
            requestAnimationFrame(() => startFireflyTicker(fireflyLayer));
        }
    }

    card.appendChild(placeholder);
    const overlay = document.createElement('div');
    overlay.className = 'image-card-overlay';
    overlay.innerHTML = `
        <button class="overlay-btn download-btn hidden" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
        </button>
    `;
    card.appendChild(overlay);

    const timer = createTimerOverlay(genId);
    card.appendChild(timer);

    return card;
}

function displayResultInCard(genId, data) {
    const card = document.getElementById(`gen-card-${genId}`);
    if (!card) return;

    const placeholder = card.querySelector('.noise-placeholder');
    const overlay = card.querySelector('.image-card-overlay');
    const downloadBtn = card.querySelector('.download-btn');
    
    const fireflyLayer = placeholder?.querySelector('.firefly-layer');
    if (fireflyLayer) {
      stopFireflyTickerForLayer(fireflyLayer);
    }

    const img = new Image();
    img.src = data.imageData;
    img.onclick = () => openLightbox(data.imageData);
    img.onload = () => {
        placeholder.remove();
        card.insertBefore(img, overlay);
        img.offsetHeight;
        img.classList.add('loaded');
        downloadBtn.classList.remove('hidden');
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadImage(data.imageData, `pollgen-${genId}.png`);
        };
        addThumbnailToMiniView(genId, data.imageData);
    };
}

function createVideoPlaceholderCard(genId) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.id = `gen-card-${genId}`;

    const w = Number(document.getElementById('width').value) || 1024;
    const h = Number(document.getElementById('height').value) || 576;
    const ratio = (h / w) * 100;

    card.dataset.w = w.toString();
    card.dataset.h = h.toString();
    applyImageCardSizing(card);

    const placeholder = document.createElement('div');
    placeholder.className = 'noise-placeholder';
    placeholder.style.paddingBottom = `${ratio}%`;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (state.performanceMode || prefersReducedMotion) {
        placeholder.appendChild(createPerformanceLoader());
    } else {
        const fireflyLayer = document.createElement('div');
        fireflyLayer.className = 'firefly-layer';
        placeholder.appendChild(fireflyLayer);

        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00ffaa'];
        const baseCount = Math.min(55, Math.max(28, Math.round((w * h) / 55000)));
        const fireflyCount = baseCount;

        for (let i = 0; i < fireflyCount; i++) {
            const firefly = document.createElement('div');
            firefly.className = 'firefly';
            const size = Math.random() * 4.5 + 2;
            firefly.style.width = size + 'px';
            firefly.style.height = size + 'px';
            firefly.dataset.size = size.toString();
            firefly.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            const brightness = Math.random() * 0.55 + 0.45;
            firefly.style.filter = `brightness(${brightness})`;
            firefly.dataset.rx = Math.random().toString();
            firefly.dataset.ry = Math.random().toString();
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 45 + 18;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            firefly.dataset.vx = vx.toString();
            firefly.dataset.vy = vy.toString();
            firefly.style.animationDelay = Math.random() * 4 + 's';
            firefly.style.animationDuration = `${Math.random() * 2 + 3.5}s`;
            fireflyLayer.appendChild(firefly);
        }

        if (fireflyCount > 0) {
            requestAnimationFrame(() => startFireflyTicker(fireflyLayer));
        }
    }

    card.appendChild(placeholder);
    const overlay = document.createElement('div');
    overlay.className = 'image-card-overlay';
    overlay.innerHTML = `
        <button class="overlay-btn download-btn hidden" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
        </button>
    `;
    card.appendChild(overlay);

    const timer = createTimerOverlay(genId);
    card.appendChild(timer);

    return card;
}

function displayVideoResultInCard(genId, data) {
    const card = document.getElementById(`gen-card-${genId}`);
    if (!card) return;

    const placeholder = card.querySelector('.noise-placeholder');
    const overlay = card.querySelector('.image-card-overlay');
    const downloadBtn = card.querySelector('.download-btn');
    
    // Stop the firefly animation for this card
    const fireflyLayer = placeholder?.querySelector('.firefly-layer');
    if (fireflyLayer) {
      stopFireflyTickerForLayer(fireflyLayer);
    }

    const video = document.createElement('video');
    video.src = data.videoData;
    video.controls = true;
    video.autoplay = false;
    video.preload = 'metadata';
    video.style.background = '#000';

    video.onloadedmetadata = () => {
        placeholder.remove();
        card.insertBefore(video, overlay);
        video.offsetHeight;
        video.classList.add('loaded');
        downloadBtn.classList.remove('hidden');
        downloadBtn.title = i18n.t('videoDownloadBtn');
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadVideo(data.videoData, `pollgen-video-${genId}.mp4`);
        };
        addVideoThumbnailToMiniView(genId, data.videoData);
    };

    video.onerror = () => {
        setStatus(i18n.t('videoError'), 'error');
    };
}

let isZoomed = false;
const LIGHTBOX_ZOOM_SCALE = 2.5;

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-image');

let lightboxOriginRaf = null;
let lightboxOriginX = 50;
let lightboxOriginY = 50;
let lightboxOriginTargetX = 50;
let lightboxOriginTargetY = 50;

function applyLightboxOrigin() {
    if (!lightboxImg) return;
    lightboxImg.style.transformOrigin = `${lightboxOriginX}% ${lightboxOriginY}%`;
}

function stopLightboxOriginAnimation() {
    if (lightboxOriginRaf) {
        cancelAnimationFrame(lightboxOriginRaf);
        lightboxOriginRaf = null;
    }
}

function setLightboxOriginImmediate(x, y) {
    stopLightboxOriginAnimation();

    lightboxOriginX = x;
    lightboxOriginY = y;
    lightboxOriginTargetX = x;
    lightboxOriginTargetY = y;
    applyLightboxOrigin();
}

function setLightboxOriginTarget(x, y) {
    lightboxOriginTargetX = x;
    lightboxOriginTargetY = y;

    if (lightboxOriginRaf) return;

    const tick = () => {
        const dx = lightboxOriginTargetX - lightboxOriginX;
        const dy = lightboxOriginTargetY - lightboxOriginY;

        lightboxOriginX += dx * 0.18;
        lightboxOriginY += dy * 0.18;
        applyLightboxOrigin();

        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
            lightboxOriginX = lightboxOriginTargetX;
            lightboxOriginY = lightboxOriginTargetY;
            applyLightboxOrigin();
            lightboxOriginRaf = null;
            return;
        }

        lightboxOriginRaf = requestAnimationFrame(tick);
    };

    lightboxOriginRaf = requestAnimationFrame(tick);
}

function setLightboxOriginTargetFromPointer(clientX, clientY) {
    if (!lightbox || !lightboxImg) return;

    const containerRect = lightbox.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;

    let x = ((clientX - containerRect.left) / containerRect.width) * 100;
    let y = ((clientY - containerRect.top) / containerRect.height) * 100;

    const sensitivity = 2.1;
    x = 50 + (x - 50) * sensitivity;
    y = 50 + (y - 50) * sensitivity;

    x = Math.min(100, Math.max(0, x));
    y = Math.min(100, Math.max(0, y));

    setLightboxOriginTarget(x, y);
}

function resetLightboxTransform() {
    if (!lightboxImg) return;
    setLightboxOriginImmediate(50, 50);
    lightboxImg.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
    lightboxImg.style.cursor = 'zoom-in';
}

function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    lightbox.classList.remove('zoomed');
    isZoomed = false;
    resetLightboxTransform();
}

function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
    lightbox.classList.remove('zoomed');
    isZoomed = false;
    resetLightboxTransform();
}

if (lightbox && lightboxImg) {
    const closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    lightboxImg.addEventListener('click', (e) => {
        e.stopPropagation();

        if (isZoomed) {
            lightbox.classList.remove('zoomed');
            isZoomed = false;

            stopLightboxOriginAnimation();
            lightboxImg.style.cursor = 'zoom-in';
            lightboxImg.style.transform = 'translate3d(0px, 0px, 0) scale(1)';

            setTimeout(() => {
                if (!isZoomed) setLightboxOriginImmediate(50, 50);
            }, 480);
            return;
        }

        const rect = lightboxImg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        if (Number.isFinite(x) && Number.isFinite(y)) {
            setLightboxOriginImmediate(x, y);
        } else {
            setLightboxOriginImmediate(50, 50);
        }

        lightbox.classList.add('zoomed');
        isZoomed = true;
        lightboxImg.style.cursor = 'zoom-out';
        lightboxImg.style.transform = `translate3d(0px, 0px, 0) scale(${LIGHTBOX_ZOOM_SCALE})`;
    });

    lightbox.addEventListener('mousemove', (e) => {
        if (!isZoomed) return;
        setLightboxOriginTargetFromPointer(e.clientX, e.clientY);
    }, { passive: true });

    lightbox.addEventListener('touchmove', (e) => {
        if (!isZoomed) return;
        const t = e.touches && e.touches[0];
        if (!t) return;
        setLightboxOriginTargetFromPointer(t.clientX, t.clientY);
    }, { passive: true });
}

function addThumbnailToMiniView(genId, src) {
    const miniView = document.getElementById('mini-view');
    if (!miniView) return;

    miniView.classList.add('visible');
    const thumb = document.createElement('img');
    thumb.className = 'mini-thumb';
    thumb.src = src;
    thumb.onclick = () => {
        const card = document.getElementById(`gen-card-${genId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    miniView.appendChild(thumb);
    miniView.scrollLeft = miniView.scrollWidth;
}

async function downloadVideo(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (e) {
        console.error("Video download failed", e);
        window.open(url, '_blank');
    }
}

function addVideoThumbnailToMiniView(genId, src) {
    const miniView = document.getElementById('mini-view');
    if (!miniView) return;

    miniView.classList.add('visible');
    const thumb = document.createElement('video');
    thumb.className = 'mini-thumb';
    thumb.src = src;
    thumb.muted = true;
    thumb.preload = 'metadata';
    thumb.onclick = () => {
        const card = document.getElementById(`gen-card-${genId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    miniView.appendChild(thumb);
    miniView.scrollLeft = miniView.scrollWidth;
}

async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (e) {
        console.error("Download failed", e);
        window.open(url, '_blank');
    }
}

async function copyImageToClipboard(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

async function convertToPng(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(objectUrl);
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
        img.src = objectUrl;
    });
}

function addToImageHistory(historyItem) {
  if (!historyItem || !historyItem.imageData) return;
  state.imageHistory.unshift(historyItem);
  if (state.imageHistory.length > 18) state.imageHistory.pop();
}

function addToVideoHistory(historyItem) {
  if (!historyItem || !historyItem.videoData) return;
  state.videoHistory.unshift(historyItem);
  if (state.videoHistory.length > 18) state.videoHistory.pop();
}

function adjustPromptHeight() {
    const prompt = document.getElementById('prompt');
    if (!prompt) return;

    // Store scroll position if textarea has overflow
    const wasScrolled = prompt.scrollTop > 0;
    const scrollBottom = prompt.scrollHeight - prompt.scrollTop - prompt.clientHeight;

    // Reset height to auto to get natural scrollHeight
    prompt.style.height = 'auto';

    // Calculate new height, capped at max-height (200px)
    const newHeight = Math.min(prompt.scrollHeight, 200);
    prompt.style.height = newHeight + 'px';

    // Restore scroll position if needed (keep view at bottom when typing)
    if (wasScrolled && newHeight >= 200) {
        prompt.scrollTop = prompt.scrollHeight - prompt.clientHeight;
    }

    // Adjust mini view position based on prompt bar height
    const miniView = document.getElementById('mini-view');
    const promptBar = document.querySelector('.prompt-bar');
    if (miniView && promptBar) {
        const barHeight = promptBar.offsetHeight;
        miniView.style.bottom = (barHeight + 20) + 'px';
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  // Login button handler
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (!loginBtn.disabled) {
        initiateOAuthLogin();
      }
    });
  }

  // Premium models toggle checkbox
  const showPremiumCheckbox = document.getElementById('show-premium-models');
  if (showPremiumCheckbox) {
    showPremiumCheckbox.addEventListener('change', () => {
      saveShowPremiumModels(showPremiumCheckbox.checked);
      applyActiveModels(true);
    });
  }

  const performanceCheckbox = document.getElementById('performance-mode');
  if (performanceCheckbox) {
    performanceCheckbox.addEventListener('change', () => {
      savePerformanceMode(performanceCheckbox.checked);
    });
  }

  const apiKeyInput = document.getElementById('api-key');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('blur', async () => {
      validateApiKey();
      await updateBalance(state.apiKey);
    });

    // Avoid rate limits: do not call /account/key while typing
    apiKeyInput.addEventListener('input', () => {
      const key = apiKeyInput.value.trim();
      if (key) saveApiKey(key);
      else state.apiKey = null;

      if (state.keyInfoApiKey && state.keyInfoApiKey !== state.apiKey) {
        state.keyInfo = null;
        state.keyInfoApiKey = null;
        state.allowedModels = null;
        setPremiumToggleVisible(false);
        clearModels();
      }

      if (!key) {
        setSidebarControlsEnabled(false);
        setPremiumToggleVisible(false);
        clearModels();
      }

      updateUploadUI();

      // Disable generate until validation on blur succeeds
      setGenerateButtonEnabled(false);
    });
  }
  
  const generateBtn = document.getElementById('generate-btn');
  const galleryFeed = document.getElementById('gallery-feed');
  const emptyState = document.getElementById('placeholder');

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      // Check screen resolution on generate button click
      checkResolution();
      // Check for mobile devices on generate button click
      checkMobileDevice();

      if (!state.apiKey) {
        validateApiKey();
        if (!state.apiKey) {
          setStatus(i18n.t('apiKeyMissing'), 'error');
          return;
        }
      }
      const payload = collectPayload();
      if (!payload.prompt) {
        setStatus(i18n.t('statusPromptMissing'), 'error');
        return;
      }
      if (!payload.model) {
        setStatus(i18n.t('statusModelMissing'), 'error');
        return;
      }

      const isVideoMode = payload.mode === 'video';

      // In parallel mode, generate multiple images at once
      if (state.parallelMode) {
        addParallelJobs(payload, isVideoMode, state.parallelCount);
        return;
      }

      // Single mode generation
      const genId = Date.now();
      startGenerationTimer(genId);
      const card = isVideoMode ? createVideoPlaceholderCard(genId) : createPlaceholderCard(genId);

      if (emptyState) emptyState.style.display = 'none';
      galleryFeed.appendChild(card);

      // Full scroll to bottom
      setTimeout(() => {
          const scrollContainer = document.getElementById('canvas-workspace');
          if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 50);

      toggleLoading(true);
      setStatus('', '');
      toggleLoading(true);
      setStatus('', '');
      try {
        if (isVideoMode) {
          const response = await generateVideo(payload);
          stopGenerationTimer(genId);
          displayVideoResultInCard(genId, response);
          
          // Concurrent API calls
          Promise.all([
            handleUsageIntegration(genId, payload.model, true),
            updateBalance(state.apiKey)
          ]);
          
          addToVideoHistory(response);
        } else {
          const response = await generateImage(payload);
          stopGenerationTimer(genId);
          displayResultInCard(genId, response);
          
          // Concurrent API calls
          Promise.all([
            handleUsageIntegration(genId, payload.model, false),
            updateBalance(state.apiKey)
          ]);
          
          addToImageHistory(response);
        }
      } catch (error) {
        setStatus(error.message || i18n.t('statusError'), 'error');
        console.error(error);
        card.remove();
        if (galleryFeed.children.length === 0 && emptyState) emptyState.style.display = 'block';
      } finally {
        toggleLoading(false);
      }
    });
  }

  const promptInput = document.getElementById('prompt');
  if (promptInput) {
    promptInput.addEventListener('input', adjustPromptHeight);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            generateBtn.click();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
            e.preventDefault();
            const start = promptInput.selectionStart;
            const end = promptInput.selectionEnd;
            promptInput.value = promptInput.value.substring(0, start) + "\n" + promptInput.value.substring(end);
            promptInput.selectionStart = promptInput.selectionEnd = start + 1;
            adjustPromptHeight();
        }
    });
  }

  window.addEventListener('languageChanged', () => {
      const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
      renderModelOptions(modelsToRender);
      updateBalance(state.apiKey);
  });
  
  // Setup parallel count handlers
  setupParallelCountHandlers();
  
  // Setup context menu
  setupContextMenu();
}

// Context menu state
let contextMenuTarget = null;
let contextMenuImageUrl = null;

function setupContextMenu() {
  const contextMenu = document.getElementById('context-menu');
  const downloadItem = document.getElementById('context-download');
  const copyItem = document.getElementById('context-copy');
  const referenceItem = document.getElementById('context-use-as-reference');

  if (!contextMenu) return;

  document.addEventListener('mousedown', (e) => {
    if (e.button === 2) return;
    if (contextMenu.contains(e.target)) return;
    if (contextMenu.classList.contains('visible')) {
      contextMenu.classList.remove('visible');
    }
  });

  contextMenu.addEventListener('contextmenu', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('scroll', () => {
    contextMenu.classList.remove('visible');
  }, true);

  document.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.image-card, .video-card');
    const lightboxImg = e.target.closest('#lightbox-image');

    if (card) {
      if (card.querySelector('.noise-placeholder')) return;
      e.preventDefault();
      contextMenuImageUrl = null;
      const isVideo = !!card.querySelector('video');
      updateContextMenuLabels(isVideo);
      showContextMenu(e.clientX, e.clientY, card);
    } else if (lightboxImg) {
      e.preventDefault();
      contextMenuImageUrl = lightboxImg.src;
      updateContextMenuLabels(false);
      showContextMenuForLightbox(e.clientX, e.clientY);
    }
  });

  if (downloadItem) {
    downloadItem.addEventListener('click', (e) => {
      e.stopPropagation();

      if (contextMenuImageUrl) {
        downloadImage(contextMenuImageUrl, `pollgen-${Date.now()}.png`);
      } else if (contextMenuTarget) {
        const img = contextMenuTarget.querySelector('img');
        const video = contextMenuTarget.querySelector('video');
        const genId = contextMenuTarget.id?.replace('gen-card-', '');

        if (img) {
          downloadImage(img.src, `pollgen-${genId || Date.now()}.png`);
        } else if (video) {
          downloadVideo(video.src, `pollgen-video-${genId || Date.now()}.mp4`);
        }
      }
      contextMenu.classList.remove('visible');
    });
  }

  if (copyItem) {
    copyItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      contextMenu.classList.remove('visible');

      let url = null;

      if (contextMenuImageUrl) {
        url = contextMenuImageUrl;
      } else if (contextMenuTarget) {
        const img = contextMenuTarget.querySelector('img');
        if (img) url = img.src;
      }

      if (!url) return;
      await copyImageToClipboard(url);
    });
  }

  if (referenceItem) {
    referenceItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      contextMenu.classList.remove('visible');

      let url = null;

      if (contextMenuImageUrl) {
        url = contextMenuImageUrl;
      } else if (contextMenuTarget) {
        const img = contextMenuTarget.querySelector('img');
        if (img) url = img.src;
      }

      if (!url) return;

      if (!state.apiKey) {
        setStatus(i18n.t('uploadErrorAuth'), 'error');
        return;
      }

      if (!isImageUploadSupported()) {
        setStatus(i18n.t('uploadErrorGeneric'), 'error');
        return;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        const blob = await response.blob();
        const genId = contextMenuTarget?.id?.replace('gen-card-', '') || Date.now();
        const file = new File([blob], `reference-${genId}.png`, { type: blob.type || 'image/png' });

        if (!state.uploadConsent) {
          showUploadConsentPopup(() => {
            handleImageUpload(file);
          });
        } else {
          await handleImageUpload(file);
        }
      } catch (error) {
        console.error('Failed to use image as reference:', error);
        setStatus(i18n.t('uploadErrorNetwork'), 'error');
      }
    });
  }
}

async function copyImageToClipboard(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const imageBlob = blob.type === 'image/png' ? blob : await convertBlobToPng(blob);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': imageBlob })
    ]);
    setStatus(i18n.t('copySuccess'), 'success');
  } catch (e) {
    console.error('Copy to clipboard failed', e);
    setStatus(i18n.t('copyError'), 'error');
  }
}

async function convertBlobToPng(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(pngBlob => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image load failed'));
    };
    img.src = objectUrl;
  });
}

function updateContextMenuLabels(isVideo) {
  const downloadSpan = document.querySelector('#context-download [data-i18n]');
  const copyItem = document.getElementById('context-copy');
  const referenceItem = document.getElementById('context-use-as-reference');
  if (downloadSpan) {
    const key = isVideo ? 'downloadVideo' : 'downloadImage';
    downloadSpan.setAttribute('data-i18n', key);
    downloadSpan.textContent = i18n.t(key);
  }
  if (copyItem) {
    copyItem.style.display = isVideo ? 'none' : '';
  }
  if (referenceItem) {
    const isSupported = isImageUploadSupported();
    referenceItem.style.display = (isVideo || !isSupported) ? 'none' : '';
  }
}

function showContextMenu(x, y, card) {
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) return;
  
  contextMenuTarget = card;
  contextMenuImageUrl = null;
  
  positionContextMenu(x, y);
  contextMenu.classList.add('visible');
}

function showContextMenuForLightbox(x, y) {
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) return;
  
  contextMenuTarget = null;
  
  positionContextMenu(x, y);
  contextMenu.classList.add('visible');
}

function positionContextMenu(x, y) {
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) return;


  contextMenu.style.visibility = 'hidden';
  contextMenu.style.display = 'block';

  const menuWidth = contextMenu.offsetWidth || 180;
  const menuHeight = contextMenu.offsetHeight || 100;

  contextMenu.style.display = '';
  contextMenu.style.visibility = '';


  let posX = x;
  let posY = y;

  if (x + menuWidth > window.innerWidth) {
    posX = window.innerWidth - menuWidth - 10;
  }
  if (y + menuHeight > window.innerHeight) {
    posY = window.innerHeight - menuHeight - 10;
  }

  contextMenu.style.left = `${posX}px`;
  contextMenu.style.top = `${posY}px`;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function pinApiKeyFooter() {
  const apiKeyContainer = document.querySelector('.api-key-container');
  const sidebar = document.querySelector('.sidebar');
  const promptBar = document.querySelector('.prompt-bar');

  if (!apiKeyContainer || !sidebar) return;

  apiKeyContainer.classList.add('pinned');

  const applyLayout = () => {
    const rect = sidebar.getBoundingClientRect();
    apiKeyContainer.style.left = `${rect.left}px`;
    apiKeyContainer.style.width = `${rect.width}px`;

    if (promptBar) {
      promptBar.style.left = `${rect.width}px`;
    }

    const h = apiKeyContainer.offsetHeight || 0;
    sidebar.style.setProperty('--api-footer-height', `${h}px`);
  };

  applyLayout();
  window.addEventListener('resize', applyLayout);

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(applyLayout);
    ro.observe(apiKeyContainer);
    ro.observe(sidebar);
  }
}

function init() {
  i18n.updatePageLanguage();

  const lang = i18n.getCurrentLanguage();
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`lang-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

  pinApiKeyFooter();

  // Default disabled until validated
  setGenerateButtonEnabled(false);
  setSidebarControlsEnabled(false);
  setPremiumToggleVisible(false);

  // Update login button state
  updateLoginButtonState(false);

  // Load premium models toggle setting
  loadShowPremiumModels();
  
  // Load upload consent
  loadUploadConsent();

  // Load performance mode
  loadPerformanceMode();

  // Check screen resolution
  checkResolution();
  window.addEventListener('resize', checkResolution);

  // Check for mobile devices
  checkMobileDevice();
  window.addEventListener('resize', checkMobileDevice);

  // Handle OAuth callback first (from login popup redirect)
  if (handleOAuthCallback()) {
    // OAuth callback was handled, API key is now set
  } else {
    // No OAuth callback, try to load saved API key
    loadApiKey();
    if (state.apiKey) {
      const apiKeyInput = document.getElementById('api-key');
      if (apiKeyInput) apiKeyInput.value = state.apiKey;
      updateBalance(state.apiKey);
    } else {
      updateBalance(null);
    }
  }
  setupEventListeners();
  setupImageUploadHandlers();
  updateUploadUI();
  adjustPromptHeight();

  window.addEventListener('resize', scheduleImageCardResize);
  scheduleImageCardResize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================================
// OAUTH LOGIN
// ============================================================================

function initiateOAuthLogin() {
  const redirectUrl = window.location.href.split('#')[0]; // Remove any existing hash
  const authUrl = `https://enter.pollinations.ai/authorize?redirect_url=${encodeURIComponent(redirectUrl)}&app_key=pk_ZWDXoNBfRRBS7AEN&permissions=profile,balance&expiry=3&budget=1`;
  
  // Redirect in the same tab instead of popup
  window.location.href = authUrl;
}

function handleOAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return false;
  
  const params = new URLSearchParams(hash.substring(1));
  const apiKey = params.get('api_key');
  
  if (apiKey) {
    // Clear the hash from URL immediately
    history.replaceState(null, '', window.location.pathname + window.location.search);
    
    // Save the API key
    saveApiKey(apiKey);
    
    // Update the input field
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) apiKeyInput.value = apiKey;
    
    // Validate and fetch balance/profile
    updateBalance(apiKey);
    
    setStatus(i18n.t('apiKeyStored'), 'success');
    return true;
  }
  
  return false;
}

// ============================================================================
// PROFILE DISPLAY
// ============================================================================

async function fetchProfile(apiKey) {
  try {
    const response = await fetch('https://gen.pollinations.ai/account/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Profile API call failed:', error.message);
    return null;
  }
}

function calculateTimeSince(createdAt) {
  if (!createdAt) return null;
  
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffHours < 1) {
    return { value: diffMins, unit: 'minutes' };
  } else if (diffDays < 1) {
    return { value: diffHours, unit: 'hours' };
  } else if (diffWeeks < 1) {
    return { value: diffDays, unit: 'days' };
  } else if (diffMonths < 1) {
    return { value: diffWeeks, unit: 'weeks' };
  } else {
    return { value: diffMonths, unit: 'months' };
  }
}

function formatTimeAgo(timeObj) {
  if (!timeObj) return '';
  
  const { value, unit } = timeObj;
  let translationKey;
  
  // Use singular form for value === 1, plural otherwise
  switch (unit) {
    case 'minutes':
      translationKey = value === 1 ? 'timeAgoMinute' : 'timeAgoMinutes';
      break;
    case 'hours':
      translationKey = value === 1 ? 'timeAgoHour' : 'timeAgoHours';
      break;
    case 'days':
      translationKey = value === 1 ? 'timeAgoDay' : 'timeAgoDays';
      break;
    case 'weeks':
      translationKey = value === 1 ? 'timeAgoWeek' : 'timeAgoWeeks';
      break;
    case 'months':
      translationKey = value === 1 ? 'timeAgoMonth' : 'timeAgoMonths';
      break;
    default:
      return '';
  }
  
  return i18n.t(translationKey, value);
}

function displayProfile(profile) {
  const profileDisplay = document.getElementById('profile-display');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileWelcome = document.getElementById('profile-welcome');
  const profileSubtitle = document.getElementById('profile-subtitle');
  const profileFunfact = document.getElementById('profile-funfact');
  const emptyIcon = document.getElementById('empty-icon');
  const emptyTitle = document.getElementById('empty-title');
  const emptySubtitle = document.getElementById('empty-subtitle');
  
  if (!profileDisplay || !profile) {
    if (profileDisplay) profileDisplay.classList.add('hidden');
    if (emptyIcon) emptyIcon.classList.remove('hidden');
    if (emptyTitle) emptyTitle.classList.remove('hidden');
    if (emptySubtitle) emptySubtitle.classList.remove('hidden');
    return;
  }
  
  // Set avatar - use profile image if available
  if (profileAvatar) {
    if (profile.image) {
      profileAvatar.src = profile.image;
    } else {
      profileAvatar.src = 'js/icon.png';
    }
  }
  
  // Set welcome message
  if (profileWelcome) {
    const name = profile.name || profile.username || 'User';
    profileWelcome.textContent = i18n.t('welcomeMessage', name);
  }
  
  // Set subtitle
  if (profileSubtitle) {
    profileSubtitle.textContent = i18n.t('profileSubtitle');
  }
  
  // Set fun fact about account age
  if (profileFunfact && profile.createdAt) {
    const timeObj = calculateTimeSince(profile.createdAt);
    const timeStr = formatTimeAgo(timeObj);
    if (timeStr) {
      profileFunfact.textContent = i18n.t('funFactAccountAge', timeStr);
    }
  }
  
  // Show profile display, hide default empty state elements
  profileDisplay.classList.remove('hidden');
  if (emptyIcon) emptyIcon.classList.add('hidden');
  if (emptyTitle) emptyTitle.classList.add('hidden');
  if (emptySubtitle) emptySubtitle.classList.add('hidden');
}

function updateLoginButtonState(isLoggedIn) {
  const loginBtn = document.getElementById('login-btn');
  const loginBtnText = document.getElementById('login-btn-text');
  
  if (loginBtn && loginBtnText) {
    if (isLoggedIn) {
      loginBtnText.textContent = i18n.t('loggedIn');
      loginBtn.disabled = true;
      loginBtn.classList.add('active');
    } else {
      loginBtnText.textContent = i18n.t('loginWithPollinations');
      loginBtn.disabled = false;
      loginBtn.classList.remove('active');
    }
  }
}
