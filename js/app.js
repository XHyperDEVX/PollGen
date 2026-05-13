/**
 * Pollinations Image Generator - Main Application Logic
 * Vanilla JavaScript implementation with i18n support
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const WORKSHOP_SYSTEM_PROMPT = "You are a prompt engineer. Your task is to refine the user's image generation prompt to make it more detailed and effective for AI image generation. Return only the refined prompt, no other text.";

const state = {
  apiKey: null,
  models: [],
  videoModels: [],
  currentMode: 'image', // 'image' or 'video'
  currentImage: null,
  isGenerating: false,
  generateEnabled: false,
  imageHistory: [],
  videoHistory: [],
  allowedModels: null, // For filtering models based on API key permissions
  keyInfo: null, // Store key info from /account/key endpoint
  keyInfoApiKey: null, // Which API key the keyInfo was validated for
  accountBalance: null,
  showPremiumModels: false, // Whether to show premium models when toggle is available
  premiumToggleVisible: false, // Whether premium toggle should be shown
  uploadConsent: false, // Whether user has consented to external upload
  profile: null, // User profile data from /account/profile
  allModels: [], // Full model list (no API key)
  allVideoModels: [], // Full video model list (no API key)
  selectedModel: null,
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
  uploadSlots: Array.from({ length: 2 }, () => ({
    uploadedImageUrl: null,
    uploadedImageId: null,
    uploadedImageFile: null,
    isUploading: false,
    isDeletingUpload: false
  })),
  performanceMode: false, // Performance mode flag
  activeLoadingScopes: 0,
  generationStartTimes: new Map(),
  timerIntervals: new Map(),
  persistedGenerations: [],
  isRestoringGenerations: false,
  // Workshop Prompt state
  workshopEnabled: false,
  workshopModel: null,
  workshopSystemPrompt: '',
  workshopParallelPerImage: false,
  workshopThinking: true,
  textModels: []
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

const UPLOAD_SLOT_COUNT = state.uploadSlots.length;

function getUploadSlotState(slotIndex = 0) {
  if (slotIndex < 0 || slotIndex >= state.uploadSlots.length) return null;
  return state.uploadSlots[slotIndex];
}

function getUploadSlotSuffix(slotIndex = 0) {
  return slotIndex === 0 ? '' : `-${slotIndex + 1}`;
}

function getUploadElement(baseId, slotIndex = 0) {
  return document.getElementById(`${baseId}${getUploadSlotSuffix(slotIndex)}`);
}

function forEachUploadSlot(callback) {
  for (let slotIndex = 0; slotIndex < UPLOAD_SLOT_COUNT; slotIndex += 1) {
    callback(slotIndex, getUploadSlotState(slotIndex));
  }
}

function getUploadedImageUrls() {
  return state.uploadSlots
    .map(slot => slot?.uploadedImageUrl)
    .filter(Boolean);
}

function getNextAvailableUploadSlotIndex() {
  const emptyIndex = state.uploadSlots.findIndex(slot =>
    slot && !slot.uploadedImageUrl && !slot.isUploading && !slot.isDeletingUpload
  );
  return emptyIndex >= 0 ? emptyIndex : 0;
}

function updateUploadUI() {
  const supported = isImageUploadSupported();
  const hasValidKey = isApiKeyValidForGeneration();

  const editingPanel = document.querySelector('.image-editing-panel');
  if (editingPanel) {
    editingPanel.classList.toggle('hidden', !supported);
  }

  forEachUploadSlot((slotIndex, slot) => {
    const uploadIcon = getUploadElement('upload-icon', slotIndex);
    const uploadIconContainer = getUploadElement('upload-icon-container', slotIndex);
    const thumbnailWrapper = getUploadElement('upload-thumbnail-wrapper', slotIndex);

    if (!uploadIcon || !uploadIconContainer || !thumbnailWrapper || !slot) return;

    if (!supported) {
      thumbnailWrapper.classList.remove('visible');
      uploadIconContainer.style.display = 'none';
      return;
    }

    if (slot.isUploading || slot.uploadedImageUrl) {
      thumbnailWrapper.classList.add('visible');
      uploadIconContainer.style.display = 'none';
    } else {
      thumbnailWrapper.classList.remove('visible');
      uploadIconContainer.style.display = 'flex';

      if (hasValidKey) {
        uploadIcon.classList.remove('disabled');
        uploadIcon.style.cursor = 'pointer';
      } else {
        uploadIcon.classList.add('disabled');
        uploadIcon.style.cursor = 'not-allowed';
      }
    }
  });
  if (typeof state !== 'undefined' && state.textModels && state.textModels.length > 0) {
    renderWorkshopModelOptions(state.textModels);
  }
}

function showUploadProgress(show, slotIndex = 0) {
  const progressEl = getUploadElement('upload-progress', slotIndex);
  if (progressEl) {
    progressEl.style.display = show ? 'flex' : 'none';
  }
}

function showDeleteProgress(show, slotIndex = 0) {
  const progressEl = getUploadElement('upload-delete-progress', slotIndex);
  if (progressEl) {
    progressEl.style.display = show ? 'flex' : 'none';
  }
}

function setUploadThumbnailFromUrl(url, slotIndex = 0) {
  const thumbnail = getUploadElement('upload-thumbnail', slotIndex);
  const preview = getUploadElement('upload-thumbnail-preview', slotIndex);
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

function resetUploadSlot(slotIndex = 0) {
  const slot = getUploadSlotState(slotIndex);
  if (!slot) return;

  slot.uploadedImageUrl = null;
  slot.uploadedImageId = null;
  slot.uploadedImageFile = null;
  slot.isUploading = false;
  slot.isDeletingUpload = false;

  setUploadThumbnailFromUrl('', slotIndex);
  showUploadProgress(false, slotIndex);
  showDeleteProgress(false, slotIndex);

  const fileInput = getUploadElement('image-upload-input', slotIndex);
  if (fileInput) fileInput.value = '';
}

function clearUploadedImage(slotIndex = null) {
  if (slotIndex === null || slotIndex === undefined) {
    forEachUploadSlot((index) => {
      resetUploadSlot(index);
    });
  } else {
    resetUploadSlot(slotIndex);
  }

  updateUploadUI();
      if (state.textModels.length > 0) renderWorkshopModelOptions(state.textModels);
}

async function deleteUploadedImage(slotIndex = 0) {
  const slot = getUploadSlotState(slotIndex);
  if (!slot) return;

  clearUploadedImage(slotIndex);
  setStatus(i18n.t('uploadDeleteSuccess'), 'success');
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

function generateRandomFilename() {
  return `pollgen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function uploadImageToPollinationsMedia(file, slotIndex = 0) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    setStatus(validation.error, 'error');
    return null;
  }

  if (!state.apiKey) {
    setStatus(i18n.t('uploadErrorAuth'), 'error');
    return null;
  }

  const slot = getUploadSlotState(slotIndex);
  if (!slot) return null;

  slot.isUploading = true;
  showUploadProgress(true, slotIndex);
  updateUploadUI();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

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

    slot.uploadedImageId = getUploadIdFromResponse(data);

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
    slot.isUploading = false;
    showUploadProgress(false, slotIndex);
    updateUploadUI();
  }
}

async function handleImageUpload(file, slotIndex = 0) {
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

  const slot = getUploadSlotState(slotIndex);
  if (!slot) return;

  slot.uploadedImageUrl = null;
  slot.uploadedImageId = null;
  slot.uploadedImageFile = null;
  setUploadThumbnailFromUrl('', slotIndex);
  updateUploadUI();

  const url = await uploadImageToPollinationsMedia(file, slotIndex);

  if (url) {
    slot.uploadedImageUrl = url;
    slot.uploadedImageFile = null;
    setUploadThumbnailFromUrl(url, slotIndex);
    if (typeof window.adjustAspectRatioToImage === 'function') {
      const previewImg = new Image();
      previewImg.onload = () => {
        window.adjustAspectRatioToImage(previewImg.naturalWidth, previewImg.naturalHeight);
      };
      previewImg.src = url;
    }
    setStatus(i18n.t('uploadSuccess') || 'Image uploaded successfully', 'success');
    updateUploadUI();
  } else {
    clearUploadedImage(slotIndex);
  }
}

function setupImageUploadHandlers() {
  forEachUploadSlot((slotIndex, slot) => {
    const uploadIconContainer = getUploadElement('upload-icon-container', slotIndex);
    const fileInput = getUploadElement('image-upload-input', slotIndex);
    const deleteBtn = getUploadElement('upload-thumbnail-delete', slotIndex);

    if (uploadIconContainer) {
      uploadIconContainer.addEventListener('click', () => {
        if (!state.apiKey) {
          setStatus(i18n.t('uploadErrorAuth'), 'error');
          return;
        }

        if (isImageUploadSupported() && slot && !slot.isUploading) {
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
        const file = e.target.files?.[0];
        if (file) {
          handleImageUpload(file, slotIndex);
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteUploadedImage(slotIndex);
      });
    }
  });
}

function setupSessionControls() {
  const clearBtn = document.getElementById('clear-history-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearGenerationHistory();
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser(true);
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
      <button type="button" class="upload-consent-close" aria-label="${i18n.t('closeLabel')}">&times;</button>
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
  
  const closePopup = () => {
    popup.classList.remove('visible');
  };

  const closeBtn = popup.querySelector('.upload-consent-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePopup);
  }
  popup.addEventListener('click', (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });
  
  // Handle confirm
  const confirmBtn = popup.querySelector('.upload-consent-confirm');
  confirmBtn.addEventListener('click', () => {
    saveUploadConsent(true);
    closePopup();
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
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${i18n.t('keyValidFor')}${days}${i18n.t('daysShort')}${hours}${i18n.t('hoursShort')}${minutes}${i18n.t('minutesShort')}`;
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

async function fetchAccountBalance(apiKey) {
  if (!apiKey || !apiKey.trim()) return null;

  try {
    const response = await fetch('https://gen.pollinations.ai/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || typeof data.balance === 'undefined' || data.balance === null) return null;

    const numericBalance = Number(data.balance);
    if (!Number.isFinite(numericBalance)) return null;

    return numericBalance;
  } catch (error) {
    console.warn('Balance API call failed:', error.message);
    return null;
  }
}

function hasPromptForGeneration() {
  const promptInput = document.getElementById('prompt');
  return Boolean(promptInput && promptInput.value.trim());
}

function hasSelectedModelForGeneration() {
  const modelInput = document.getElementById('model');
  return Boolean(modelInput && modelInput.value);
}

function filterModelsByPermissions(models) {
  if (!Array.isArray(models)) return [];

  if (state.allowedModels === null || state.allowedModels === undefined) {
    return models;
  }

  if (Array.isArray(state.allowedModels)) {
    if (state.allowedModels.length === 0) return [];
    return models.filter(model => state.allowedModels.includes(model.name));
  }

  return models;
}

function hasSelectableModelsForMode(mode = state.currentMode) {
  const models = mode === 'video' ? state.videoModels : state.models;
  return filterModelsByPermissions(models).length > 0;
}

function hasParallelJobsInFlight() {
  return state.parallelQueue.length > 0 || state.activeJobs.size > 0;
}

function refreshGenerateButtonState() {
  const generateBtn = document.getElementById('generate-btn');
  if (!generateBtn) return;

  const modeInput = document.getElementById('mode');
  const isVideoMode = modeInput && modeInput.value === 'video';
  const btnText = document.getElementById('generate-btn-text');
  const btnSubtext = document.getElementById('generate-btn-subtext');
  const btnStatus = document.getElementById('generate-btn-status');

  const hasValidKey = state.generateEnabled && isApiKeyValidForGeneration();
  const hasModels = hasSelectableModelsForMode(state.currentMode);
  const hasModel = hasSelectedModelForGeneration();
  const hasPrompt = hasPromptForGeneration();
  const canGenerate = hasValidKey && hasModels && hasModel && hasPrompt;
  const hasParallelJobs = hasParallelJobsInFlight();
  const allowQueueAdd = canGenerate && (
    (state.parallelMode && hasParallelJobs) ||
    (!state.parallelMode && state.isGenerating)
  );

  generateBtn.disabled = !canGenerate || (state.parallelMode && state.isGenerating && !allowQueueAdd);

  const noun = i18n.t(isVideoMode ? 'videosLabel' : 'imagesLabel');

  if (btnText) {
    if (state.isGenerating && !allowQueueAdd) {
      btnText.textContent = isVideoMode ? i18n.t('generatingVideoLabel') : i18n.t('generatingLabel');
    } else if (allowQueueAdd) {
      btnText.textContent = i18n.t('queueAddLabel');
    } else if (state.parallelMode && state.parallelCount > 1) {
      btnText.textContent = i18n.t('generateBatchBtn', [state.parallelCount, noun]);
    } else {
      btnText.textContent = isVideoMode ? i18n.t('generateVideoBtn') : i18n.t('generateBtn');
    }
  }

  if (btnSubtext) {
    if (!hasValidKey) {
      btnSubtext.textContent = i18n.t('generateStateMissingKey');
    } else if (!hasModels) {
      btnSubtext.textContent = i18n.t('generateStateNoModels');
    } else if (!hasModel) {
      btnSubtext.textContent = i18n.t('statusModelMissing');
    } else if (!hasPrompt) {
      btnSubtext.textContent = i18n.t('generateStateAddPrompt');
    } else if (state.parallelMode && hasParallelJobs) {
      btnSubtext.textContent = i18n.t('queueStatus', [state.activeJobs.size, state.parallelQueue.length]);
    } else if (state.parallelMode && state.parallelCount > 1) {
      btnSubtext.textContent = i18n.t('parallelReady', [state.parallelCount, noun]);
    } else {
      btnSubtext.textContent = i18n.t('generateReady');
    }
  }

  if (btnStatus) {
    if (state.parallelMode && hasParallelJobs) {
      btnStatus.textContent = `${state.activeJobs.size + state.parallelQueue.length}`;
      btnStatus.classList.add('visible');
    } else if (state.parallelMode && state.parallelCount > 1) {
      btnStatus.textContent = `×${state.parallelCount}`;
      btnStatus.classList.add('visible');
    } else {
      btnStatus.textContent = '';
      btnStatus.classList.remove('visible');
    }
  }

  if (state.isGenerating || (state.parallelMode && hasParallelJobs)) {
    generateBtn.classList.add('loading');
  } else {
    generateBtn.classList.remove('loading');
  }
}

function setGenerateButtonEnabled(enabled) {
  state.generateEnabled = Boolean(enabled);
  refreshGenerateButtonState();
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

  updateTransparentOptionAvailability();
  updateModeAvailability();
  refreshGenerateButtonState();
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
  const logoutBtn = document.getElementById('logout-btn');
  if (!apiKeyHint) return false;

  apiKeyHint.classList.remove('hidden');

  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    apiKeyHint.innerHTML = i18n.t('apiKeyHint');
    resetAuthState();
    showAuthGate();
    return false;
  }

  const isKeyChanged = !state.keyInfo || state.keyInfoApiKey !== trimmedKey;
  const keyInfo = await validateApiKeyInfo(trimmedKey);

  if (state.apiKey !== trimmedKey) return false;

  if (!keyInfo || keyInfo.valid === false) {
    apiKeyHint.textContent = i18n.t('invalidApiKey');
    resetAuthState();
    showAuthGate();
    return false;
  }

  state.keyInfo = keyInfo;
  state.keyInfoApiKey = trimmedKey;

  persistApiKey(trimmedKey);
  saveApiKey(trimmedKey);
  hideAuthGate();
  setGenerateButtonEnabled(true);
  updateLoginButtonState(true);
  if (logoutBtn) logoutBtn.classList.remove('hidden');

  if (Object.prototype.hasOwnProperty.call(keyInfo.permissions || {}, 'models')) {
    state.allowedModels = keyInfo.permissions.models;
  } else {
    state.allowedModels = null;
  }

  setSidebarControlsEnabled(true);
  if (isKeyChanged || forceReload) {
    await loadModels();

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

  if (state.apiKey !== trimmedKey) return false;

  state.accountBalance = null;
  let displayText = i18n.t('balanceUnavailable');
  const budget = keyInfo.pollenBudget;

  if (budget === null) {
    const generalBalance = await fetchAccountBalance(trimmedKey);
    if (generalBalance !== null) {
      state.accountBalance = generalBalance;
      const formattedBalance = formatBalanceDisplay(generalBalance);
      const accountLabel = i18n.t('balanceAccountTotalLabel');
      displayText = `${formattedBalance} ${i18n.t('balanceRemaining')} (${accountLabel})`;
    }
  } else {
    const numericBudget = Number(budget);
    if (Number.isFinite(numericBudget)) {
      state.accountBalance = null;
      displayText = `${formatBalanceDisplay(numericBudget)} ${i18n.t('balanceRemaining')}`;
    }
  }

  if (keyInfo.expiresIn !== null && keyInfo.expiresIn !== undefined) {
    displayText += ` • ${formatExpirationTime(keyInfo.expiresIn)}`;
  }

  apiKeyHint.textContent = displayText;
  updateUploadUI();
  refreshGenerateButtonState();
  return true;
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

// Premium Models Filter
function loadShowPremiumModels() {
  const checkbox = document.getElementById('show-premium-models');
  if (checkbox) {
    checkbox.checked = state.showPremiumModels;
  }
  return state.showPremiumModels;
}
function legacy_loadShowPremiumModels() {

  const checkbox = document.getElementById('show-premium-models');
  if (checkbox) {
    checkbox.checked = state.showPremiumModels;
  }

  return state.showPremiumModels;
}

function saveShowPremiumModels(show) {
  state.showPremiumModels = show;
  saveSidebarSettings();
}
function legacy_saveShowPremiumModels(show) {
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
  const storedVersion = getCookie(UPLOAD_CONSENT_VERSION_COOKIE_NAME);
  const saved = getCookie(UPLOAD_CONSENT_COOKIE_NAME);

  if (storedVersion !== UPLOAD_CONSENT_VERSION) {
    state.uploadConsent = false;
    setCookie(UPLOAD_CONSENT_COOKIE_NAME, 'false');
    setCookie(UPLOAD_CONSENT_VERSION_COOKIE_NAME, UPLOAD_CONSENT_VERSION);
    return state.uploadConsent;
  }

  state.uploadConsent = saved === 'true';
  return state.uploadConsent;
}

function saveUploadConsent(consent) {
  state.uploadConsent = consent;
  setCookie(UPLOAD_CONSENT_COOKIE_NAME, consent.toString());
  setCookie(UPLOAD_CONSENT_VERSION_COOKIE_NAME, UPLOAD_CONSENT_VERSION);
}

function loadPerformanceMode() {
  const checkbox = document.getElementById('performance-mode');
  if (checkbox) {
    checkbox.checked = state.performanceMode;
  }
  return state.performanceMode;
}
function legacy_loadPerformanceMode() {

  const checkbox = document.getElementById('performance-mode');
  if (checkbox) {
    checkbox.checked = state.performanceMode;
  }

  return state.performanceMode;
}

function savePerformanceMode(enabled) {
  state.performanceMode = Boolean(enabled);
  saveSidebarSettings();
}
function legacy_savePerformanceMode(enabled) {
  state.performanceMode = Boolean(enabled);
  localStorage.setItem('pollgen_performance_mode', state.performanceMode.toString());
}

const SETTINGS_COOKIE_NAME = 'pollgen_settings';
const API_KEY_COOKIE_NAME = 'pollinations_api_key';
const PROMPT_COOKIE_NAME = 'pollgen_prompt';
const GENERATIONS_COOKIE_NAME = 'pollgen_generations';
const UPLOAD_CONSENT_COOKIE_NAME = 'pollgen_upload_consent';
const UPLOAD_CONSENT_VERSION_COOKIE_NAME = 'pollgen_upload_consent_version';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_PERSISTED_GENERATIONS = 10;
const MAX_GENERATIONS_COOKIE_LENGTH = 3500;

function setCookie(name, value, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax${secure}`;
}

function getCookie(name) {
  const nameEq = `${name}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (part.startsWith(nameEq)) {
      return decodeURIComponent(part.slice(nameEq.length));
    }
  }
  return '';
}

function deleteCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function syncApiKeyInputMask() {
  const apiKeyInput = document.getElementById('api-key');
  if (!apiKeyInput) return;
  apiKeyInput.value = state.apiKey ? '*'.repeat(35) : '';
}

function setAuthLocked(locked) {
  document.body.classList.toggle('auth-locked', locked);
}

function showAuthGate() {
  const authGate = document.getElementById('auth-gate');
  if (authGate) authGate.classList.remove('hidden');
  setAuthLocked(true);
}

function hideAuthGate() {
  const authGate = document.getElementById('auth-gate');
  if (authGate) authGate.classList.add('hidden');
  setAuthLocked(false);
}

function loadApiKey() {
  const saved = getCookie(API_KEY_COOKIE_NAME);
  if (saved && saved.trim()) {
    state.apiKey = saved.trim();
    syncApiKeyInputMask();
    return true;
  }
  return false;
}

function persistApiKey(key) {
  if (!key || !key.trim()) {
    return false;
  }
  const trimmedKey = key.trim();
  setCookie(API_KEY_COOKIE_NAME, trimmedKey);
  return true;
}

function clearPersistedApiKey() {
  deleteCookie(API_KEY_COOKIE_NAME);
}

function saveApiKey(key) {
  if (!key || !key.trim()) {
    return false;
  }
  const trimmedKey = key.trim();
  state.apiKey = trimmedKey;
  syncApiKeyInputMask();
  return true;
}

function persistPrompt() {
  const promptInput = document.getElementById('prompt');
  if (!promptInput) return;
  setCookie(PROMPT_COOKIE_NAME, promptInput.value || '');
}

function restorePrompt() {
  const promptInput = document.getElementById('prompt');
  if (!promptInput) return;
  const savedPrompt = getCookie(PROMPT_COOKIE_NAME);
  if (savedPrompt) {
    promptInput.value = savedPrompt;
  }
}

function normalizePersistedGeneration(record) {
  if (!record) return null;

  const genId = String(record.genId || record.g || '');
  const sourceUrl = record.sourceUrl || record.u;
  const rawType = record.type || record.t;
  const rawStatus = record.status || record.s;

  if (!genId || !sourceUrl) return null;

  return {
    genId,
    type: rawType === 'v' || rawType === 'video' ? 'video' : 'image',
    status: rawStatus === 'c' || rawStatus === 'completed' ? 'completed' : 'generating',
    sourceUrl,
    createdAt: Number(record.createdAt || record.c) || Date.now()
  };
}

function serializePersistedGenerations(records) {
  return records.map((record) => ({
    g: String(record.genId),
    t: record.type === 'video' ? 'v' : 'i',
    s: record.status === 'completed' ? 'c' : 'g',
    u: record.sourceUrl,
    c: Number(record.createdAt) || Date.now()
  }));
}

function persistGenerationState() {
  const normalized = state.persistedGenerations
    .map(normalizePersistedGeneration)
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-MAX_PERSISTED_GENERATIONS);

  state.persistedGenerations = normalized;

  if (!normalized.length) {
    deleteCookie(GENERATIONS_COOKIE_NAME);
    return;
  }

  let payload = serializePersistedGenerations(normalized);
  let encoded = JSON.stringify(payload);

  while (encoded.length > MAX_GENERATIONS_COOKIE_LENGTH && payload.length > 1) {
    payload.shift();
    encoded = JSON.stringify(payload);
  }

  setCookie(GENERATIONS_COOKIE_NAME, encoded);
}

function resetGalleryDisplay() {
  const galleryFeed = document.getElementById('gallery-feed');
  if (galleryFeed) {
    galleryFeed.innerHTML = '';
  }
  const miniView = document.getElementById('mini-view');
  if (miniView) {
    miniView.innerHTML = '';
    miniView.classList.remove('visible');
  }
  const placeholder = document.getElementById('placeholder');
  if (placeholder) {
    placeholder.style.display = '';
  }
}

function clearGenerationHistory() {
  state.persistedGenerations = [];
  state.imageHistory = [];
  state.videoHistory = [];
  persistGenerationState();
  resetGalleryDisplay();
  setStatus(i18n.t('historyCleared'), 'success');
}

function loadPersistedGenerations() {
  const raw = getCookie(GENERATIONS_COOKIE_NAME);
  if (!raw) {
    state.persistedGenerations = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      state.persistedGenerations = [];
      return;
    }

    state.persistedGenerations = parsed
      .map(normalizePersistedGeneration)
      .filter(Boolean)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-MAX_PERSISTED_GENERATIONS);
  } catch (error) {
    state.persistedGenerations = [];
  }
}

function upsertPersistedGeneration(record) {
  const normalized = normalizePersistedGeneration(record);
  if (!normalized) return;

  const existingIndex = state.persistedGenerations.findIndex((entry) => entry.genId === normalized.genId);
  if (existingIndex >= 0) {
    state.persistedGenerations[existingIndex] = {
      ...state.persistedGenerations[existingIndex],
      ...normalized
    };
  } else {
    state.persistedGenerations.push(normalized);
  }

  persistGenerationState();
}

function markPersistedGenerationCompleted(genId, sourceUrl = null) {
  const existing = state.persistedGenerations.find((entry) => entry.genId === String(genId));
  if (!existing) return;

  existing.status = 'completed';
  if (sourceUrl) existing.sourceUrl = sourceUrl;
  persistGenerationState();
}

function removePersistedGeneration(genId) {
  const beforeCount = state.persistedGenerations.length;
  state.persistedGenerations = state.persistedGenerations.filter((entry) => entry.genId !== String(genId));
  if (state.persistedGenerations.length !== beforeCount) {
    persistGenerationState();
  }
}

async function copyApiKeyToClipboard() {
  if (!state.apiKey) {
    setStatus(i18n.t('apiKeyMissing'), 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(state.apiKey);
    setStatus(i18n.t('copyApiKeySuccess'), 'success');
  } catch (error) {
    setStatus(i18n.t('copyApiKeyError'), 'error');
  }
}

function resetAuthState() {
  state.apiKey = null;
  state.keyInfo = null;
  state.keyInfoApiKey = null;
  state.allowedModels = null;
  state.profile = null;
  clearPersistedApiKey();
  syncApiKeyInputMask();
  setGenerateButtonEnabled(false);
  updateLoginButtonState(false);
  displayProfile(null);
  setSidebarControlsEnabled(false);
  setPremiumToggleVisible(false);
  clearModels();
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.classList.add('hidden');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  if (clearHistoryBtn) clearHistoryBtn.classList.add('hidden');
}

function logoutUser(showStatus = false) {
  resetAuthState();
  const apiKeyHint = document.getElementById('api-key-hint');
  if (apiKeyHint) {
    apiKeyHint.innerHTML = i18n.t('apiKeyHint');
  }
  showAuthGate();
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.classList.add('hidden');
  if (showStatus) {
    setStatus(i18n.t('logoutLabel'), 'info');
  }
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

async function fetchTextModels(apiKey = null) {
  try {
    const headers = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch('https://gen.pollinations.ai/text/models', { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch text models: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching text models:', error);
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

function setModelSelectEnabled(enabled) {
  const modelSelect = document.getElementById('model');
  const modelButton = document.getElementById('model-select-btn');

  if (modelSelect) {
    modelSelect.disabled = !enabled;
  }

  if (modelButton) {
    modelButton.classList.toggle('disabled', !enabled);
  }
}

function setModeButtonAvailability(mode, isAvailable) {
  const button = document.getElementById(`mode-${mode}`);
  if (!button) return;

  const shouldDisable = !isAvailable || !state.generateEnabled;
  button.disabled = shouldDisable;
  button.classList.toggle('disabled', shouldDisable);

  if (!isAvailable) {
    button.title = i18n.t('modeUnavailableHint');
  } else {
    button.removeAttribute('title');
  }
}

function updateModeAvailability() {
  const imageAvailable = hasSelectableModelsForMode('image');
  const videoAvailable = hasSelectableModelsForMode('video');

  setModeButtonAvailability('image', imageAvailable);
  setModeButtonAvailability('video', videoAvailable);

  if (!imageAvailable && !videoAvailable) {
    const fallbackActiveMode = state.currentMode || 'image';
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.getElementById(`mode-${fallbackActiveMode}`) || document.getElementById('mode-image');
    if (activeButton) activeButton.classList.add('active');
  }

  const currentAvailable = hasSelectableModelsForMode(state.currentMode);
  if (!currentAvailable) {
    const fallbackMode = imageAvailable ? 'image' : (videoAvailable ? 'video' : null);

    if (fallbackMode && fallbackMode !== state.currentMode && typeof window.switchMode === 'function') {
      window.switchMode(fallbackMode);
      return true;
    }
  }

  return false;
}

function clearModels() {
  state.models = [];
  state.videoModels = [];
  state.allModels = [];
  state.allVideoModels = [];
  state.restrictedModels = [];
  state.restrictedVideoModels = [];
  updateModeAvailability();
  renderModelOptions([]);
  updateUploadUI();
}

function applyActiveModels(forceReset = false) {
  const useAllModels = !state.premiumToggleVisible || state.showPremiumModels;
  state.models = useAllModels ? state.allModels : state.restrictedModels;
  state.videoModels = useAllModels ? state.allVideoModels : state.restrictedVideoModels;

  const modeSwitched = updateModeAvailability();
  if (!modeSwitched) {
    const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
    renderModelOptions(modelsToRender, forceReset);
  }

  refreshGenerateButtonState();
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
    const cachedCount = (cached?.imageModels?.length || 0) + (cached?.videoModels?.length || 0);
    if (cached && cachedCount > 0) {
      publicModels = cached;
    } else {
      setStatus(i18n.t('modelLoadError'), 'error');
      clearModels();
      refreshGenerateButtonState();
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
  
  try {
    const textModels = await fetchTextModels(state.apiKey);
    state.textModels = textModels;
    renderWorkshopModelOptions(textModels);
  } catch (error) {
    console.error('Failed to load text models:', error);
  }

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

function isTransparentOptionModelSupported(modelName) {
  return typeof modelName === 'string' && modelName.toLowerCase().startsWith('gpt');
}

function updateTransparentOptionAvailability() {
  const transparentOption = document.getElementById('transparent-option');
  const transparentCheckbox = document.getElementById('transparent');
  const modelSelect = document.getElementById('model');

  if (!transparentOption || !transparentCheckbox) return;

  const selectedModel = modelSelect ? modelSelect.value : '';
  const modelSupported = isTransparentOptionModelSupported(selectedModel);
  const controlsEnabled = modelSelect ? !modelSelect.disabled : true;
  const transparentEnabled = modelSupported && controlsEnabled;

  transparentCheckbox.disabled = !transparentEnabled;
  transparentOption.classList.toggle('disabled', !transparentEnabled);

  if (!transparentEnabled) {
    transparentCheckbox.checked = false;
  }

  transparentOption.title = modelSupported ? '' : i18n.t('gptModelsOnlyTooltip');
}

function renderModelOptions(models, forceReset = false) {
  const select = document.getElementById('model');
  const modelPopover = document.getElementById('model-popover');
  const currentModelName = document.getElementById('current-model-name');
  if (!select || !modelPopover) return;

  const previousValue = forceReset ? '' : (select.value || state.selectedModel);
  select.innerHTML = '';
  modelPopover.innerHTML = '';

  const filteredModels = filterModelsByPermissions(models);

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
    setModelSelectEnabled(false);
    select.value = '';
    updateCostDisplay(null);
    updateTransparentOptionAvailability();
    updateModeAvailability();
    refreshGenerateButtonState();
    return;
  }

  setModelSelectEnabled(true);
  
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
      state.selectedModel = model.name;
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
      updateTransparentOptionAvailability();
      saveSidebarSettings();
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

  updateTransparentOptionAvailability();
  updateModeAvailability();
  refreshGenerateButtonState();
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

function formatCostValue(value) {
  if (!Number.isFinite(value) || value <= 0) return '0';

  if (value < 0.01) {
    return value.toFixed(8).replace(/\.?0+$/, '');
  }
  if (value < 1) {
    return value.toFixed(4).replace(/\.?0+$/, '');
  }
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function formatTokensPerMillion(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const perMillion = value * 1e6;
  if (perMillion < 0.01) {
    return perMillion.toFixed(8).replace(/\.?0+$/, '');
  }
  if (perMillion < 1) {
    return perMillion.toFixed(4).replace(/\.?0+$/, '');
  }
  return perMillion.toFixed(2).replace(/\.?0+$/, '');
}

// Function to update cost display based on currently selected model (exposed to window)
window.updateCurrentCostDisplay = function() {
  const select = document.getElementById('model');
  if (!select) {
    updateCostDisplay(null);
    return;
  }

  const currentModelName = select.value;
  const models = state.currentMode === 'video' ? state.videoModels : state.models;
  const model = models.find(m => m.name === currentModelName) || null;
  updateCostDisplay(model);
};

function updateCostDisplay(model) {
  const costText = document.getElementById('cost-text');
  const costMeta = document.getElementById('cost-meta');
  const costBreakdown = document.getElementById('cost-breakdown');

  if (!costText) {
    refreshGenerateButtonState();
    return;
  }

  const modeInput = document.getElementById('mode');
  const isVideoMode = modeInput && modeInput.value === 'video';
  const durationInput = document.getElementById('duration');
  const duration = Math.max(1, parseInt(durationInput?.value, 10) || 5);
  const generationCount = state.parallelMode && state.parallelCount > 1 ? state.parallelCount : 1;
  const generationUnit = i18n.t(isVideoMode ? 'videosLabel' : 'imagesLabel');

  if (!model) {
    costText.textContent = '0';
    if (costMeta) costMeta.textContent = i18n.t('costMetaNoModel');
    if (costBreakdown) costBreakdown.textContent = i18n.t('costBreakdownNoModel');
    refreshGenerateButtonState();
    return;
  }

  const priceInfo = formatModelPrice(model);
  let baseCost = parseFloat(priceInfo.price);
  if (!Number.isFinite(baseCost)) baseCost = 0;

  const durationMultiplier = isVideoMode && priceInfo.isVideoModel ? duration : 1;
  const totalCost = baseCost * durationMultiplier * generationCount;
  costText.textContent = formatCostValue(totalCost);

  if (costMeta) {
    if (isVideoMode && priceInfo.isVideoModel) {
      costMeta.textContent = i18n.t('costMetaVideo', [duration]);
    } else {
      costMeta.textContent = i18n.t('costMetaImage');
    }
  }

  if (costBreakdown) {
    if (baseCost <= 0) {
      costBreakdown.textContent = i18n.t('costBreakdownFree');
    } else {
      const unitLabel = isVideoMode && priceInfo.isVideoModel ? i18n.t('perSecond') : i18n.t('perImage');
      let breakdown = `${formatCostValue(baseCost)} ${i18n.t('pollenLabel').toLowerCase()} ${unitLabel}`;
      if (durationMultiplier > 1) {
        breakdown += ` × ${duration}s`;
      }
      if (generationCount > 1) {
        breakdown += ` × ${generationCount} ${generationUnit}`;
      }
      costBreakdown.textContent = breakdown;
    }
  }

  refreshGenerateButtonState();
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

function buildGenerationUrl(payload, isVideo = false) {
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
  if (payload.transparent) params.append('transparent', 'true');

  if (isVideo) {
    if (payload.aspectRatio) params.append('aspectRatio', payload.aspectRatio);
    if (payload.duration) params.append('duration', payload.duration);
  }

  let imageParam = '';
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    imageParam = payload.images.join(',');
  } else if (payload.image) {
    imageParam = payload.image;
  }
  if (imageParam) {
    params.append('image', imageParam);
  }

  return `${endpoint}?${params.toString()}`;
}

async function requestGeneratedMedia(sourceUrl, isVideo = false) {
  const response = await fetch(sourceUrl, {
    headers: { 'Authorization': `Bearer ${state.apiKey}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseErrorMessage(errorText, response.status));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  if (isVideo) {
    return {
      success: true,
      videoData: objectUrl,
      contentType: blob.type,
      sourceUrl
    };
  }

  return {
    success: true,
    imageData: objectUrl,
    contentType: blob.type,
    sourceUrl
  };
}

async function generateImage(payload, precomputedSourceUrl = null) {
  if (!state.apiKey) throw new Error(i18n.t('apiKeyMissing'));
  const sourceUrl = precomputedSourceUrl || buildGenerationUrl(payload, false);
  return requestGeneratedMedia(sourceUrl, false);
}

async function generateVideo(payload, precomputedSourceUrl = null) {
  if (!state.apiKey) throw new Error(i18n.t('apiKeyMissing'));
  const sourceUrl = precomputedSourceUrl || buildGenerationUrl(payload, true);
  return requestGeneratedMedia(sourceUrl, true);
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
  refreshGenerateButtonState();
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
  let { genId, payload, isVideoMode, index, sourceUrl } = job;
  
  if (state.workshopEnabled && state.workshopParallelPerImage) {
    const refinedPrompt = await processWorkshopPrompt(payload.prompt, genId);
    if (refinedPrompt !== payload.prompt) {
      payload.prompt = refinedPrompt;
      sourceUrl = buildGenerationUrl(payload, isVideoMode);
    }
  }
  const card = document.getElementById(`gen-card-${genId}`);

  if (card && setId === state.currentSetId) {
    addParallelStatusBadge(card, "active", index, totalJobs);
  }

  state.activeJobs.set(genId, { job, status: "active", index, setId });

  try {
    if (isVideoMode) {
      const response = await generateVideo(payload, sourceUrl);
      stopGenerationTimer(genId);
      displayVideoResultInCard(genId, response);
      handleUsageIntegration(genId, payload.model, true);
      addToVideoHistory(response);
    } else {
      const response = await generateImage(payload, sourceUrl);
      stopGenerationTimer(genId);
      displayResultInCard(genId, response);
      handleUsageIntegration(genId, payload.model, false);
      addToImageHistory(response);
    }

    markPersistedGenerationCompleted(genId, sourceUrl);
    state.completedCount++;
    if (card && setId === state.currentSetId) {
      addParallelStatusBadge(card, "completed", index, totalJobs);
    }
    state.activeJobs.set(genId, { job, status: "completed", index, setId });
    
    // Update balance after each successful parallel job
    if (state.apiKey) updateBalance(state.apiKey); if (state.profile) displayProfile(state.profile); const promptEl = document.getElementById("prompt"); if (promptEl) promptEl.placeholder = i18n.t(state.currentMode === "video" ? "videoPromptPlaceholder" : "promptPlaceholder");
    
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
    removePersistedGeneration(genId);
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
    loadSidebarSettings();

  if (state.apiKey) {
      await updateBalance(state.apiKey); if (state.profile) displayProfile(state.profile); const promptEl = document.getElementById("prompt"); if (promptEl) promptEl.placeholder = i18n.t(state.currentMode === "video" ? "videoPromptPlaceholder" : "promptPlaceholder");
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

async function addParallelJobs(payload, isVideoMode, count) {
  const galleryFeed = document.getElementById('gallery-feed');
  
  if (state.workshopEnabled && !state.workshopParallelPerImage) {
    const refinedPrompt = await processWorkshopPrompt(payload.prompt);
    payload.prompt = refinedPrompt;
  }
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

    const sourceUrl = buildGenerationUrl(jobPayload, isVideoMode);
    upsertPersistedGeneration({
      genId: String(genId),
      type: isVideoMode ? 'video' : 'image',
      status: 'generating',
      sourceUrl,
      createdAt: Date.now() + i
    });

    state.parallelQueue.push({
      genId,
      payload: jobPayload,
      isVideoMode,
      setId,
      index: i,
      sourceUrl
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
  
  // Disable/enable workshop parallel option
  const workshopParallelPerImage = document.getElementById('workshop-parallel-per-image');
  if (workshopParallelPerImage) {
    workshopParallelPerImage.disabled = !enabled;
    workshopParallelPerImage.closest('.checkbox-item').classList.toggle('disabled', !enabled);
  }
  
  // Update cost display
  window.updateCurrentCostDisplay && window.updateCurrentCostDisplay();
  saveSidebarSettings();
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
window.refreshGenerateButtonState = refreshGenerateButtonState;

function updateParallelCount(delta) {
  const countEl = document.getElementById('parallel-count');
  if (!countEl) return;
  
  let value = parseInt(countEl.textContent, 10) || 2;
  value = Math.max(2, Math.min(9, value + delta));
  countEl.textContent = value;
  state.parallelCount = value;
  
  // Update cost display
  window.updateCurrentCostDisplay && window.updateCurrentCostDisplay();
  saveSidebarSettings();
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
  // Include uploaded image URLs for image-to-image generation
  if (mode === 'image' && isImageUploadSupported()) {
    const uploadedImageUrls = getUploadedImageUrls();
    if (uploadedImageUrls.length > 0) {
      payload.image = uploadedImageUrls.join(',');
    }
  }

  // Boolean flags
  ['enhance', 'private', 'nologo', 'nofeed', 'safe', 'transparent'].forEach(flag => {
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
  if (isLoading) {
    state.activeLoadingScopes += 1;
  } else {
    state.activeLoadingScopes = Math.max(0, state.activeLoadingScopes - 1);
  }

  state.isGenerating = state.activeLoadingScopes > 0;

  if (!state.isGenerating) {
    stopAllFireflyTickers();
  }

  refreshGenerateButtonState();
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

async function restorePersistedGenerations() {
  if (!state.apiKey || state.isRestoringGenerations) return;

  const galleryFeed = document.getElementById('gallery-feed');
  const emptyState = document.getElementById('placeholder');
  const miniView = document.getElementById('mini-view');
  if (!galleryFeed || !emptyState) return;

  if (!state.persistedGenerations.length) {
    if (galleryFeed.children.length === 0) emptyState.style.display = 'block';
    return;
  }

  state.isRestoringGenerations = true;

  galleryFeed.innerHTML = '';
  if (miniView) {
    miniView.innerHTML = '';
    miniView.classList.remove('visible');
  }
  emptyState.style.display = 'none';

  const orderedGenerations = [...state.persistedGenerations].sort((a, b) => a.createdAt - b.createdAt);

  for (const generation of orderedGenerations) {
    const genId = generation.genId;
    const isVideo = generation.type === 'video';
    const card = isVideo ? createVideoPlaceholderCard(genId) : createPlaceholderCard(genId);
    galleryFeed.appendChild(card);

    try {
      const response = await requestGeneratedMedia(generation.sourceUrl, isVideo);
      if (isVideo) {
        displayVideoResultInCard(genId, response);
      } else {
        displayResultInCard(genId, response);
      }
      markPersistedGenerationCompleted(genId, generation.sourceUrl);
    } catch (error) {
      console.error('Failed to restore generation:', error);
      removePersistedGeneration(genId);
      card.remove();
    }
  }

  if (galleryFeed.children.length === 0) {
    emptyState.style.display = 'block';
  }

  scheduleImageCardResize();
  state.isRestoringGenerations = false;
}

function adjustPromptHeight() {
    const prompt = document.getElementById('prompt');
    if (!prompt) return;

    const wasScrolled = prompt.scrollTop > 0;
    const minPromptHeight = 48;

    prompt.style.height = 'auto';

    const newHeight = Math.max(minPromptHeight, Math.min(prompt.scrollHeight, 200));
    prompt.style.height = newHeight + 'px';

    if (wasScrolled && newHeight >= 200) {
        prompt.scrollTop = prompt.scrollHeight - prompt.clientHeight;
    }

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


window.saveSidebarSettings = saveSidebarSettings;
function saveSidebarSettings() {
  const settings = {
    mode: document.getElementById('mode')?.value,
    model: document.getElementById('model')?.value,
    aspectRatio: document.getElementById('aspect-ratio')?.value,
    duration: document.getElementById('duration-hidden')?.value,
    workshopEnabled: document.getElementById('workshop-enable')?.checked,
    workshopModel: document.getElementById('workshop-model')?.value,
    workshopSystemPrompt: document.getElementById('workshop-system-prompt')?.value,
    workshopParallelPerImage: document.getElementById('workshop-parallel-per-image')?.checked,
    workshopThinking: document.getElementById('workshop-thinking')?.checked,
    seed: document.getElementById('seed')?.value,
    negativePrompt: document.getElementById('negative_prompt')?.value,
    parallelMode: document.getElementById('parallel-checkbox')?.checked,
    parallelCount: state.parallelCount,
    transparent: document.getElementById('transparent')?.checked,
    performanceMode: document.getElementById('performance-mode')?.checked,
    enhance: document.getElementById('enhance')?.checked,
    private: document.getElementById('private')?.checked,
    nologo: document.getElementById('nologo')?.checked,
    nofeed: document.getElementById('nofeed')?.checked,
    safe: document.getElementById('safe')?.checked,
    showPremiumModels: document.getElementById('show-premium-models')?.checked
  };
  setCookie(SETTINGS_COOKIE_NAME, JSON.stringify(settings));
}

function loadSidebarSettings() {
  const cookie = getCookie(SETTINGS_COOKIE_NAME);
  if (!cookie) return;

  try {
    const settings = JSON.parse(cookie);
    
    if (settings.mode && typeof window.switchMode === 'function') {
      window.switchMode(settings.mode);
    }
    
    if (settings.model) {
      const modelSelect = document.getElementById('model');
      if (modelSelect) modelSelect.value = settings.model;
      state.selectedModel = settings.model;
    }

    if (settings.aspectRatio) {
      const arInput = document.getElementById('aspect-ratio');
      if (arInput) {
        arInput.value = settings.aspectRatio;
        // Update UI for aspect ratio
        const arItem = document.querySelector(`#aspect-ratio-popover .popover-item[data-ratio="${settings.aspectRatio}"]`);
        if (arItem) {
          document.querySelectorAll('#aspect-ratio-popover .popover-item').forEach(i => i.classList.remove('selected'));
          arItem.classList.add('selected');
          document.getElementById('current-ratio-label').textContent = arItem.textContent.trim();
          document.getElementById('width').value = arItem.dataset.w;
          document.getElementById('height').value = arItem.dataset.h;
          const btnIcon = document.getElementById('current-ratio-icon');
          const itemIcon = arItem.querySelector('.ratio-icon');
          if (btnIcon && itemIcon) {
            btnIcon.style.width = itemIcon.style.width;
            btnIcon.style.height = itemIcon.style.height;
          }
        }
      }
    }

    if (settings.duration) {
      const durInput = document.getElementById('duration-hidden');
      const durSlider = document.getElementById('duration');
      const durValue = document.getElementById('duration-value');
      if (durInput) durInput.value = settings.duration;
      if (durSlider) durSlider.value = settings.duration;
      if (durValue) durValue.textContent = settings.duration + 's';
    }

    if (settings.workshopEnabled !== undefined) {
      const workshopEnable = document.getElementById('workshop-enable');
      if (workshopEnable) {
        workshopEnable.checked = settings.workshopEnabled;
        state.workshopEnabled = settings.workshopEnabled;
        document.getElementById('workshop-controls')?.classList.toggle('hidden', !settings.workshopEnabled);
      }
    }

    if (settings.workshopModel) {
      state.workshopModel = settings.workshopModel;
      const wsModelSelect = document.getElementById('workshop-model');
      if (wsModelSelect) wsModelSelect.value = settings.workshopModel;
    }

    if (settings.workshopSystemPrompt !== undefined) {
      const wsSysPrompt = document.getElementById('workshop-system-prompt');
      if (wsSysPrompt) {
        wsSysPrompt.value = settings.workshopSystemPrompt;
        state.workshopSystemPrompt = settings.workshopSystemPrompt;
      }
    }

    if (settings.workshopParallelPerImage !== undefined) {
      const wsParallel = document.getElementById('workshop-parallel-per-image');
      if (wsParallel) {
        wsParallel.checked = settings.workshopParallelPerImage;
        state.workshopParallelPerImage = settings.workshopParallelPerImage;
      }
    }

    if (settings.workshopThinking !== undefined) {
      const wsThinking = document.getElementById('workshop-thinking');
      if (wsThinking) {
        wsThinking.checked = settings.workshopThinking;
        state.workshopThinking = settings.workshopThinking;
      }
    }

    if (settings.seed !== undefined) {
      const seedInput = document.getElementById('seed');
      if (seedInput) seedInput.value = settings.seed;
    }

    if (settings.negativePrompt !== undefined) {
      const negInput = document.getElementById('negative_prompt');
      if (negInput) negInput.value = settings.negativePrompt;
    }

    if (settings.parallelCount !== undefined) {
      state.parallelCount = settings.parallelCount;
      const countEl = document.getElementById('parallel-count');
      if (countEl) countEl.textContent = settings.parallelCount;
    }

    if (settings.parallelMode !== undefined) {
      switchParallelMode(settings.parallelMode);
    }

    ['transparent', 'performance-mode', 'enhance', 'private', 'nologo', 'nofeed', 'safe', 'show-premium-models'].forEach(id => {
      const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      const val = settings[id === 'performance-mode' ? 'performanceMode' : (id === 'show-premium-models' ? 'showPremiumModels' : key)];
      if (val !== undefined) {
        const cb = document.getElementById(id);
        if (cb) cb.checked = val;
        if (id === 'performance-mode') state.performanceMode = val;
        if (id === 'show-premium-models') {
           state.showPremiumModels = val;
           // applyActiveModels is called later during init
        }
      }
    });

  } catch (e) {
    console.error('Failed to load settings', e);
  }
}

function setupEventListeners() {
  const loginBtn = document.getElementById('login-btn');
  const popupLoginBtn = document.getElementById('auth-popup-login-btn');
  [loginBtn, popupLoginBtn].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        initiateOAuthLogin();
      }
    });
  });

  const copyApiKeyBtn = document.getElementById('copy-api-key-btn');
  if (copyApiKeyBtn) {
    copyApiKeyBtn.addEventListener('click', copyApiKeyToClipboard);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logoutUser(true));
  }

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

  const generateBtn = document.getElementById('generate-btn');
  const galleryFeed = document.getElementById('gallery-feed');
  const emptyState = document.getElementById('placeholder');

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      checkResolution();
      checkMobileDevice();

      if (!isApiKeyValidForGeneration()) {
        setStatus(i18n.t('apiKeyMissing'), 'error');
        showAuthGate();
        return;
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

      persistPrompt();
      const isVideoMode = payload.mode === 'video';

      if (state.parallelMode) {
        await addParallelJobs(payload, isVideoMode, state.parallelCount);
        return;
      }

      const genId = Date.now();
      let sourceUrl = buildGenerationUrl(payload, isVideoMode);
      upsertPersistedGeneration({
        genId: String(genId),
        type: isVideoMode ? 'video' : 'image',
        status: 'generating',
        sourceUrl,
        createdAt: Date.now()
      });

      startGenerationTimer(genId);
      const card = isVideoMode ? createVideoPlaceholderCard(genId) : createPlaceholderCard(genId);

      if (emptyState) emptyState.style.display = 'none';
      galleryFeed.appendChild(card);

      setTimeout(() => {
        const scrollContainer = document.getElementById('canvas-workspace');
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 50);

      toggleLoading(true);
      setStatus('', '');
      try {
        if (state.workshopEnabled) {
          const refinedPrompt = await processWorkshopPrompt(payload.prompt, genId);
          if (refinedPrompt !== payload.prompt) {
            payload.prompt = refinedPrompt;
            sourceUrl = buildGenerationUrl(payload, isVideoMode);
          }
        }
        if (isVideoMode) {
          const response = await generateVideo(payload, sourceUrl);
          stopGenerationTimer(genId);
          displayVideoResultInCard(genId, response);
          markPersistedGenerationCompleted(genId, sourceUrl);

          Promise.all([
            handleUsageIntegration(genId, payload.model, true),
            updateBalance(state.apiKey)
          ]);

          addToVideoHistory(response);
        } else {
          const response = await generateImage(payload, sourceUrl);
          stopGenerationTimer(genId);
          displayResultInCard(genId, response);
          markPersistedGenerationCompleted(genId, sourceUrl);

          Promise.all([
            handleUsageIntegration(genId, payload.model, false),
            updateBalance(state.apiKey)
          ]);

          addToImageHistory(response);
        }
      } catch (error) {
        removePersistedGeneration(genId);
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
    promptInput.addEventListener('input', () => {
      adjustPromptHeight();
      refreshGenerateButtonState();
      persistPrompt();
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        generateBtn?.click();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        const start = promptInput.selectionStart;
        const end = promptInput.selectionEnd;
        promptInput.value = promptInput.value.substring(0, start) + "\n" + promptInput.value.substring(end);
        promptInput.selectionStart = promptInput.selectionEnd = start + 1;
        adjustPromptHeight();
        persistPrompt();
      }
    });
  }

  window.addEventListener('languageChanged', () => {
    const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
    renderModelOptions(modelsToRender);
    loadSidebarSettings();

  if (state.apiKey) {
      updateBalance(state.apiKey);
    }
  });

  setupParallelCountHandlers();
  // Workshop Prompt Event Listeners
  const workshopEnable = document.getElementById('workshop-enable');
  const workshopControls = document.getElementById('workshop-controls');
  const workshopModelBtn = document.getElementById('workshop-model-select-btn');
  const workshopModelPopover = document.getElementById('workshop-model-popover');
  const workshopSystemPrompt = document.getElementById('workshop-system-prompt');
  const workshopParallelPerImage = document.getElementById('workshop-parallel-per-image');
  const workshopThinking = document.getElementById('workshop-thinking');

  if (workshopEnable) {
    workshopEnable.addEventListener('change', () => {
      state.workshopEnabled = workshopEnable.checked;
      workshopControls.classList.toggle('hidden', !state.workshopEnabled);
    });
  }

  if (workshopModelBtn) {
    workshopModelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = workshopModelPopover.classList.contains('visible');
      document.querySelectorAll('.popover').forEach(p => p.classList.remove('visible'));
      if (!isVisible) {
        workshopModelPopover.classList.add('visible');
        if (typeof positionPopover === 'function') {
          positionPopover(workshopModelBtn, workshopModelPopover);
        }
      }
    });
  }

  if (workshopSystemPrompt) {
    workshopSystemPrompt.addEventListener('input', () => {
      state.workshopSystemPrompt = workshopSystemPrompt.value;
    });
  }

  if (workshopParallelPerImage) {
    workshopParallelPerImage.addEventListener('change', () => {
      state.workshopParallelPerImage = workshopParallelPerImage.checked;
    });
  }

  if (workshopThinking) {
    workshopThinking.addEventListener('change', () => {
      state.workshopThinking = workshopThinking.checked;
    });
  }

  setupContextMenu();
  // Automatic saving for sidebar settings
  const sidebarInputs = [
    'workshop-enable', 'workshop-model', 'workshop-system-prompt', 
    'workshop-parallel-per-image', 'workshop-thinking', 'seed', 
    'negative_prompt', 'parallel-checkbox', 'transparent', 
    'performance-mode', 'enhance', 'private', 'nologo', 
    'nofeed', 'safe', 'show-premium-models'
  ];
  sidebarInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(eventType, saveSidebarSettings);
    }
  });

  // Aspect ratio and model selects also need to save settings
  // These are handled by their click/item-click handlers usually, but we can hook into state changes if any,
  // or just add it to the existing handlers.
  // For simplicity, let's add it to some key functions that change state.

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
        const targetSlotIndex = getNextAvailableUploadSlotIndex();

        if (!state.uploadConsent) {
          showUploadConsentPopup(() => {
            handleImageUpload(file, targetSlotIndex);
          });
        } else {
          await handleImageUpload(file, targetSlotIndex);
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

async function init() {
  i18n.updatePageLanguage();

  const lang = i18n.getCurrentLanguage();
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`lang-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

  pinApiKeyFooter();

  if (typeof window.switchMode === 'function') {
    window.switchMode('image');
  } else {
    state.currentMode = 'image';
    const modeInput = document.getElementById('mode');
    if (modeInput) modeInput.value = 'image';
  }

  setGenerateButtonEnabled(false);
  setSidebarControlsEnabled(false);
  setPremiumToggleVisible(false);
  updateLoginButtonState(false);

  loadShowPremiumModels();
  loadUploadConsent();
  loadPerformanceMode();
  loadPersistedGenerations();

  restorePrompt();
  setupEventListeners();
  setupImageUploadHandlers();
  setupSessionControls();
  updateUploadUI();
  updateTransparentOptionAvailability();
  adjustPromptHeight();

  checkResolution();
  window.addEventListener('resize', checkResolution);

  checkMobileDevice();
  window.addEventListener('resize', checkMobileDevice);

  window.addEventListener('resize', scheduleImageCardResize);
  scheduleImageCardResize();

  const oauthApiKey = handleOAuthCallback();
  if (oauthApiKey) {
    saveApiKey(oauthApiKey);
    persistApiKey(oauthApiKey);
    setStatus(i18n.t('apiKeyStored'), 'success');
  } else {
    loadApiKey();
  }

  loadSidebarSettings();

  if (state.apiKey) {
    const isValid = await updateBalance(state.apiKey, true);
    if (isValid) {
      await restorePersistedGenerations();
    }
  } else {
    await updateBalance(null);
  }

  adjustPromptHeight();
  refreshGenerateButtonState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}

// ============================================================================
// OAUTH LOGIN
// ============================================================================

function initiateOAuthLogin() {
  const redirectUrl = window.location.href.split('#')[0];
  const authUrl = `https://enter.pollinations.ai/authorize?redirect_url=${encodeURIComponent(redirectUrl)}&client_id=pk_ZWDXoNBfRRBS7AEN&scope=profile,usage&expiry=3&budget=1`;
  window.location.href = authUrl;
}

function handleOAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return '';

  const params = new URLSearchParams(hash.substring(1));
  const apiKey = params.get('api_key');

  if (!apiKey) return '';

  history.replaceState(null, '', window.location.pathname + window.location.search);
  return apiKey.trim();
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
  const logoutBtn = document.getElementById('logout-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const copyApiKeyBtn = document.getElementById('copy-api-key-btn');

  if (logoutBtn) {
    logoutBtn.classList.toggle('hidden', !isLoggedIn);
  }
  if (clearHistoryBtn) {
    clearHistoryBtn.classList.toggle('hidden', !isLoggedIn);
  }
  if (copyApiKeyBtn) {
    copyApiKeyBtn.disabled = !isLoggedIn;
  }

  syncApiKeyInputMask();
}

function renderWorkshopModelOptions(models) {
  const select = document.getElementById('workshop-model');
  const modelPopover = document.getElementById('workshop-model-popover');
  const currentModelName = document.getElementById('current-workshop-model-name');
  if (!select || !modelPopover) return;

  const previousValue = select.value || state.workshopModel;
  select.innerHTML = '';
  modelPopover.innerHTML = '';

  const uploadedImageUrls = getUploadedImageUrls();
  let filteredModels = Array.isArray(models) ? [...models] : [];
  if (uploadedImageUrls.length > 0) {
    filteredModels = filteredModels.filter(model => model.input_modalities && model.input_modalities.includes('image'));
  }

  const sortedModels = filteredModels.sort((a, b) => {
    const promptA = Number(a.pricing?.promptTextTokens || 0);
    const promptB = Number(b.pricing?.promptTextTokens || 0);
    const completionA = Number(a.pricing?.completionTextTokens || 0);
    const completionB = Number(b.pricing?.completionTextTokens || 0);
    const rateA = promptA || completionA;
    const rateB = promptB || completionB;
    return rateA - rateB;
  });

  if (sortedModels.length === 0) {
    if (currentModelName) currentModelName.textContent = i18n.t('modelPlaceholder');
    select.value = '';
    return;
  }

  let maxWidth = 280;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  sortedModels.forEach(model => {
    const name = model.name || 'Unknown';
    const description = model.description || '';
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = name;
    select.appendChild(option);

    const tokenLines = [];
    const inputRate = formatTokensPerMillion(Number(model.pricing?.promptTextTokens || 0));
    const outputRate = formatTokensPerMillion(Number(model.pricing?.completionTextTokens || 0));
    const tokenSuffix = `${i18n.t('pollenLabel').toLowerCase()}${i18n.t('tokensPerMillion')}`;

    if (inputRate) {
      const line = `${i18n.t('inputLabel')}: ${inputRate} ${tokenSuffix}`;
      tokenLines.push(`<div class="workshop-token-line"><span>${i18n.t('inputLabel')}:</span><span>${inputRate} ${tokenSuffix}</span></div>`);
      maxWidth = Math.max(maxWidth, ctx.measureText(line).width + 140);
    }

    if (outputRate) {
      const line = `${i18n.t('outputLabel')}: ${outputRate} ${tokenSuffix}`;
      tokenLines.push(`<div class="workshop-token-line"><span>${i18n.t('outputLabel')}:</span><span>${outputRate} ${tokenSuffix}</span></div>`);
      maxWidth = Math.max(maxWidth, ctx.measureText(line).width + 140);
    }

    const item = document.createElement('div');
    item.className = 'popover-item';
    if (model.name === previousValue) item.classList.add('selected');

    let displayHTML = `<div class="model-badge" style="background-color: ${stringToColor(name)}"></div>`;
    displayHTML += '<div class="model-info">';

    if (description && description !== name) {
      displayHTML += `<div class="model-name-desc">${name}</div>`;
      displayHTML += `<div class="model-description">${description}</div>`;
      maxWidth = Math.max(maxWidth, ctx.measureText(description).width + 120);
    } else {
      displayHTML += `<div class="model-name-single">${name}</div>`;
      maxWidth = Math.max(maxWidth, ctx.measureText(name).width + 120);
    }

    if (tokenLines.length) {
      displayHTML += `<div class="model-price workshop-token-list">${tokenLines.join('')}</div>`;
    }

    displayHTML += '</div>';
    item.innerHTML = displayHTML;

    item.onclick = (e) => {
      e.stopPropagation();
      select.value = model.name;
      state.workshopModel = model.name;
      if (currentModelName) currentModelName.textContent = name;
      const btnBadge = document.querySelector('#workshop-model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(name);
      modelPopover.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      modelPopover.classList.remove('visible');
      saveSidebarSettings();
    };

    modelPopover.appendChild(item);
  });

  modelPopover.style.width = Math.min(maxWidth, 450) + 'px';

  if (previousValue && [...select.options].some(opt => opt.value === previousValue)) {
    select.value = previousValue;
  } else if (sortedModels.length > 0) {
    select.value = sortedModels[0].name;
    state.workshopModel = sortedModels[0].name;
    if (currentModelName) currentModelName.textContent = sortedModels[0].name;
    const btnBadge = document.querySelector('#workshop-model-select-btn .model-badge');
    if (btnBadge) btnBadge.style.backgroundColor = stringToColor(sortedModels[0].name);
    modelPopover.querySelector('.popover-item')?.classList.add('selected');
  }
}

async function processWorkshopPrompt(originalPrompt, genId = null) {
  if (!state.workshopEnabled || !state.workshopModel) return originalPrompt;

  const systemPrompt = state.workshopSystemPrompt || WORKSHOP_SYSTEM_PROMPT;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: originalPrompt }
  ];

  const uploadedImageUrls = getUploadedImageUrls();
  if (uploadedImageUrls.length > 0) {
    const userMessage = messages[1];
    const content = [{ type: 'text', text: originalPrompt }];
    uploadedImageUrls.forEach(url => {
      content.push({ type: 'image_url', image_url: { url } });
    });
    userMessage.content = content;
  }

  setStatus(i18n.t('statusWorkshopProcessingPrompt'), 'info');
  if (genId) {
    const card = document.getElementById(`gen-card-${genId}`);
    if (card) {
      const statusBadge = document.createElement('div');
      statusBadge.className = 'workshop-status-badge';
      statusBadge.style.position = 'absolute';
      statusBadge.style.top = '50%';
      statusBadge.style.left = '50%';
      statusBadge.style.transform = 'translate(-50%, -50%)';
      statusBadge.style.background = 'rgba(37, 99, 235, 0.9)';
      statusBadge.style.color = 'white';
      statusBadge.style.padding = '12px 24px';
      statusBadge.style.borderRadius = '8px';
      statusBadge.style.fontSize = '16px';
      statusBadge.style.fontWeight = 'bold';
      statusBadge.style.zIndex = '11';
      statusBadge.style.whiteSpace = 'nowrap';
      statusBadge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      statusBadge.textContent = i18n.t('statusWorkshopProcessingPrompt');
      card.appendChild(statusBadge);
    }
  }

  try {
    const response = await fetch('https://gen.pollinations.ai/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        messages,
        model: state.workshopModel,
        response_format: { type: 'text' },
        seed: -1,
        stream: false,
        thinking: { type: state.workshopThinking ? 'enabled' : 'disabled' },
        reasoning_effort: 'medium',
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Workshop API error: ${response.status}`);
    }

    const result = await response.text();
    if (genId) {
      const card = document.getElementById(`gen-card-${genId}`);
      card?.querySelector('.workshop-status-badge')?.remove();
    }
    return result.trim();
  } catch (error) {
    if (genId) {
      const card = document.getElementById(`gen-card-${genId}`);
      card?.querySelector('.workshop-status-badge')?.remove();
    }
    console.error('Workshop processing failed:', error);
    setStatus('Workshop failed: ' + error.message, 'error');
    return originalPrompt;
  }
}
