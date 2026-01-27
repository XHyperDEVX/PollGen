/**
 * Pollinations Image Generator - Main Application Logic
 * Rebuilt for new UI layout
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  apiKey: null,
  models: [],
  selectedModel: null,
  selectedAspectRatio: 'Querformat (4:3)',
  contentType: 'auto',
  isGenerating: false,
  currentImage: null
};

// Aspect ratio mappings
const aspectRatios = {
  'Ultrabreit (21:9)': { width: 2394, height: 1026, ratio: '21:9' },
  'Breitbild (16:9)': { width: 1824, height: 1026, ratio: '16:9' },
  'Klassisch (5:4)': { width: 1280, height: 1024, ratio: '5:4' },
  'Querformat (4:3)': { width: 1366, height: 1025, ratio: '4:3' },
  'Breit (3:2)': { width: 1536, height: 1024, ratio: '3:2' },
  'Quadratisch (1:1)': { width: 1024, height: 1024, ratio: '1:1' },
  'Standard (4:5)': { width: 1024, height: 1280, ratio: '4:5' },
  'Hochformat (3:4)': { width: 1025, height: 1366, ratio: '3:4' },
  'Hoch (2:3)': { width: 1024, height: 1536, ratio: '2:3' },
  'Vertikal (9:16)': { width: 1026, height: 1824, ratio: '9:16' }
};

// English aspect ratio mappings
const aspectRatiosEn = {
  'Ultra-wide (21:9)': { width: 2394, height: 1026, ratio: '21:9' },
  'Widescreen (16:9)': { width: 1824, height: 1026, ratio: '16:9' },
  'Classic (5:4)': { width: 1280, height: 1024, ratio: '5:4' },
  'Landscape (4:3)': { width: 1366, height: 1025, ratio: '4:3' },
  'Wide (3:2)': { width: 1536, height: 1024, ratio: '3:2' },
  'Square (1:1)': { width: 1024, height: 1024, ratio: '1:1' },
  'Standard (4:5)': { width: 1024, height: 1280, ratio: '4:5' },
  'Portrait (3:4)': { width: 1025, height: 1366, ratio: '3:4' },
  'Tall (2:3)': { width: 1024, height: 1536, ratio: '2:3' },
  'Vertical (9:16)': { width: 1026, height: 1824, ratio: '9:16' }
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

function loadApiKey() {
  const saved = sessionStorage.getItem('pollinations_api_key');
  if (saved && saved.trim()) {
    state.apiKey = saved.trim();
    const input = document.getElementById('api-key-input');
    if (input) {
      input.value = saved;
    }
    updateBalanceDisplay();
    return true;
  }
  return false;
}

function saveApiKey(key) {
  if (!key || !key.trim()) {
    return false;
  }
  const trimmedKey = key.trim();
  sessionStorage.setItem('pollinations_api_key', trimmedKey);
  state.apiKey = trimmedKey;
  return true;
}

// ============================================================================
// BALANCE DISPLAY
// ============================================================================

function formatBalanceDisplay(balance) {
  const currentLang = i18n.getCurrentLanguage();
  const decimalSeparator = currentLang === 'de' ? ',' : '.';

  const rounded = Math.round(balance * 100000) / 100000;
  let formatted = rounded.toString();

  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  return formatted.replace('.', decimalSeparator);
}

async function updateBalanceDisplay() {
  const balanceDisplay = document.getElementById('balance-display');
  const apiKeySection = document.getElementById('api-key-section');
  const apiKeyHint = document.getElementById('api-key-hint');

  if (!state.apiKey || !state.apiKey.trim()) {
    if (balanceDisplay) balanceDisplay.classList.remove('visible');
    if (apiKeySection) apiKeySection.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch('https://gen.pollinations.ai/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${state.apiKey.trim()}`
      }
    });

    if (!response.ok) {
      if (balanceDisplay) balanceDisplay.classList.remove('visible');
      return;
    }

    const data = await response.json();
    const balance = data.balance;

    if (typeof balance === 'number' && !isNaN(balance)) {
      if (balanceDisplay) {
        balanceDisplay.textContent = `${formatBalanceDisplay(balance)} ${i18n.t('balanceRemaining')}`;
        balanceDisplay.classList.add('visible');
      }
      if (apiKeySection) apiKeySection.classList.add('hidden');
    }
  } catch (error) {
    console.log('Balance API call failed:', error.message);
    if (balanceDisplay) balanceDisplay.classList.remove('visible');
  }
}

// ============================================================================
// MODEL MANAGEMENT
// ============================================================================

const MODELS_CACHE_KEY = 'pollinations_models_cache';
const MODELS_CACHE_TIMESTAMP_KEY = 'pollinations_models_cache_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

async function fetchModelsFromAPI() {
  try {
    const response = await fetch('https://gen.pollinations.ai/image/models');
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();

    const imageModels = data.filter(model => {
      const modalities = model.output_modalities || [];
      return modalities.includes('image') && !modalities.includes('video');
    });

    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(imageModels));
    localStorage.setItem(MODELS_CACHE_TIMESTAMP_KEY, Date.now().toString());

    return imageModels;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

function getCachedModels() {
  try {
    const cached = localStorage.getItem(MODELS_CACHE_KEY);
    const timestamp = localStorage.getItem(MODELS_CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION_MS) {
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached models:', error);
    return null;
  }
}

async function loadModels() {
  showStatus(i18n.t('modelLoading'), 'info');

  try {
    const models = await fetchModelsFromAPI();
    state.models = models;
    renderModelOptions();
    hideStatus();
  } catch (error) {
    const cached = getCachedModels();
    if (cached && cached.length > 0) {
      state.models = cached;
      renderModelOptions();
      hideStatus();
    } else {
      showStatus(i18n.t('modelLoadError'), 'error');
    }
  }
}

function formatModelPrice(model) {
  const pricing = model.pricing || {};
  let completionTokens = pricing.completionImageTokens || pricing.completion || 0;

  if (typeof completionTokens === 'string') {
    completionTokens = parseFloat(completionTokens);
  }

  if (!completionTokens || completionTokens === 0) {
    return '0 pollen';
  }

  let priceStr;
  if (completionTokens < 0.000001) {
    priceStr = completionTokens.toExponential(2);
  } else if (completionTokens < 0.01) {
    priceStr = completionTokens.toFixed(6).replace(/\.?0+$/, '');
  } else if (completionTokens < 1) {
    priceStr = completionTokens.toFixed(4).replace(/\.?0+$/, '');
  } else {
    priceStr = completionTokens.toFixed(2).replace(/\.?0+$/, '');
  }

  return `${priceStr} pollen`;
}

function renderModelOptions() {
  const popover = document.getElementById('model-popover');
  if (!popover) return;

  popover.innerHTML = '';

  const sortedModels = [...state.models].sort((a, b) => {
    let priceA = a.pricing?.completionImageTokens || a.pricing?.completion || 0;
    let priceB = b.pricing?.completionImageTokens || b.pricing?.completion || 0;

    if (typeof priceA === 'string') priceA = parseFloat(priceA) || 0;
    if (typeof priceB === 'string') priceB = parseFloat(priceB) || 0;

    return priceA - priceB;
  });

  sortedModels.forEach(model => {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.dataset.model = model.name;

    const name = model.name || 'Unknown';
    const price = formatModelPrice(model);

    option.innerHTML = `
      <div class="dropdown-badge" style="width: 20px; height: 20px; font-size: 8px;">AI</div>
      <span style="flex: 1;">${name}</span>
      <span style="color: var(--muted-text); font-size: 11px;">${price}</span>
    `;

    option.addEventListener('click', () => {
      selectModel(model.name, model);
      closeDropdown('model-dropdown');
    });

    popover.appendChild(option);
  });

  updateCostDisplay();
}

function selectModel(modelName, model) {
  state.selectedModel = modelName;

  const valueDisplay = document.getElementById('model-value');
  if (valueDisplay) {
    valueDisplay.textContent = modelName;
  }

  document.querySelectorAll('#model-popover .dropdown-option').forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.model === modelName) {
      opt.classList.add('selected');
    }
  });

  // Update hidden input
  const modelInput = document.getElementById('model-input');
  if (modelInput) {
    modelInput.value = modelName;
  }

  updateCostDisplay();
}

function updateCostDisplay() {
  const costText = document.getElementById('cost-text');
  if (!costText) return;

  if (state.selectedModel && state.models.length > 0) {
    const model = state.models.find(m => m.name === state.selectedModel);
    if (model) {
      const pricing = model.pricing || {};
      let completionTokens = pricing.completionImageTokens || pricing.completion || 0;

      if (typeof completionTokens === 'string') {
        completionTokens = parseFloat(completionTokens) || 0;
      }

      if (completionTokens && completionTokens > 0) {
        let priceStr;
        if (completionTokens < 0.01) {
          priceStr = completionTokens.toFixed(6).replace(/\.?0+$/, '');
        } else {
          priceStr = completionTokens.toFixed(4).replace(/\.?0+$/, '');
        }
        costText.textContent = `${priceStr} pollen`;
      } else {
        costText.textContent = '0.002 pollen';
      }
    }
  } else {
    costText.textContent = '0.002 pollen';
  }
}

// ============================================================================
// ASPECT RATIO DROPDOWN
// ============================================================================

function renderAspectRatioOptions() {
  const popover = document.getElementById('aspect-popover');
  if (!popover) return;

  popover.innerHTML = '';

  const currentLang = i18n.getCurrentLanguage();
  const ratios = currentLang === 'de' ? aspectRatios : aspectRatiosEn;

  const ratioKeys = Object.keys(ratios).map(key => {
    return { key, ratio: ratios[key] };
  });

  ratioKeys.forEach(({ key, ratio }) => {
    const option = document.createElement('div');
    option.className = 'dropdown-option';
    option.dataset.ratio = key;

    const isSelected = state.selectedAspectRatio === key;
    if (isSelected) {
      option.classList.add('selected');
    }

    option.innerHTML = `
      <div class="dropdown-option-icon" style="aspect-ratio: ${ratio.ratio};"></div>
      <span>${key}</span>
      ${isSelected ? '<svg class="dropdown-option-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
    `;

    option.addEventListener('click', () => {
      selectAspectRatio(key, ratio);
      closeDropdown('aspect-dropdown');
    });

    popover.appendChild(option);
  });
}

function selectAspectRatio(ratioKey, ratio) {
  state.selectedAspectRatio = ratioKey;

  const valueDisplay = document.getElementById('aspect-value');
  if (valueDisplay) {
    valueDisplay.textContent = ratioKey;
  }

  // Update hidden inputs
  const aspectInput = document.getElementById('aspect-ratio-input');
  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');

  if (aspectInput) aspectInput.value = ratioKey;
  if (widthInput) widthInput.value = ratio.width;
  if (heightInput) heightInput.value = ratio.height;

  renderAspectRatioOptions();
}

// ============================================================================
// DROPDOWN HANDLING
// ============================================================================

function initDropdowns() {
  const modelDropdown = document.getElementById('model-dropdown');
  const aspectDropdown = document.getElementById('aspect-dropdown');

  if (modelDropdown) {
    const trigger = modelDropdown.querySelector('.dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown('model-dropdown');
      });
    }
  }

  if (aspectDropdown) {
    const trigger = aspectDropdown.querySelector('.dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown('aspect-dropdown');
      });
    }
  }

  document.addEventListener('click', () => {
    closeAllDropdowns();
  });

  renderAspectRatioOptions();
}

function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.dropdown-trigger');
  const popover = dropdown.querySelector('.dropdown-popover');

  if (popover.classList.contains('visible')) {
    closeDropdown(dropdownId);
  } else {
    closeAllDropdowns();
    popover.classList.add('visible');
    trigger.classList.add('active');
  }
}

function closeDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.dropdown-trigger');
  const popover = dropdown.querySelector('.dropdown-popover');

  popover.classList.remove('visible');
  trigger.classList.remove('active');
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-popover').forEach(popover => {
    popover.classList.remove('visible');
  });
  document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
    trigger.classList.remove('active');
  });
}

// ============================================================================
// PANEL COLLAPSING
// ============================================================================

function initPanels() {
  document.querySelectorAll('.panel-header').forEach(header => {
    header.addEventListener('click', () => {
      const panel = header.closest('.panel');
      if (panel) {
        panel.classList.toggle('collapsed');
      }
    });
  });
}

// ============================================================================
// GALLERY MANAGEMENT
// ============================================================================

function initGalleries() {
  initGallery('composition-gallery', 'composition-upload');
  initGallery('styles-gallery', 'styles-upload');
}

function initGallery(galleryId, uploadId) {
  const gallery = document.getElementById(galleryId);
  const upload = document.getElementById(uploadId);

  if (!gallery || !upload) return;

  // Add some sample thumbnails
  const sampleImages = [
    { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="86" height="86"%3E%3Crect fill="%232a2a2c" width="86" height="86"/%3E%3Ctext x="43" y="48" text-anchor="middle" fill="%239E9E9E" font-size="12"%3E1%3C/text%3E%3C/svg%3E', alt: 'Sample 1' },
    { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="86" height="86"%3E%3Crect fill="%233a3a3c" width="86" height="86"/%3E%3Ctext x="43" y="48" text-anchor="middle" fill="%239E9E9E" font-size="12"%3E2%3C/text%3E%3C/svg%3E', alt: 'Sample 2' },
    { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="86" height="86"%3E%3Crect fill="%234a4a4c" width="86" height="86"/%3E%3Ctext x="43" y="48" text-anchor="middle" fill="%239E9E9E" font-size="12"%3E3%3C/text%3E%3C/svg%3E', alt: 'Sample 3' },
    { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="86" height="86"%3E%3Crect fill="%235a5a5c" width="86" height="86"/%3E%3Ctext x="43" y="48" text-anchor="middle" fill="%239E9E9E" font-size="12"%3E4%3C/text%3E%3C/svg%3E', alt: 'Sample 4' },
    { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="86" height="86"%3E%3Crect fill="%232a2a2c" width="86" height="86"/%3E%3Ctext x="43" y="48" text-anchor="middle" fill="%239E9E9E" font-size="12"%3E5%3C/text%3E%3C/svg%3E', alt: 'Sample 5' },
    { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="86" height="86"%3E%3Crect fill="%233a3a3c" width="86" height="86"/%3E%3Ctext x="43" y="48" text-anchor="middle" fill="%239E9E9E" font-size="12"%3E6%3C/text%3E%3C/svg%3E', alt: 'Sample 6' }
  ];

  sampleImages.forEach((img, index) => {
    addThumbnailToGallery(gallery, img.src, img.alt, index === 0);
  });

  // Upload functionality
  upload.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          addThumbnailToGallery(gallery, event.target.result, file.name, true);
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // Drag and drop
  upload.addEventListener('dragover', (e) => {
    e.preventDefault();
    upload.style.borderColor = 'rgba(37, 99, 235, 0.5)';
    upload.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
  });

  upload.addEventListener('dragleave', () => {
    upload.style.borderColor = '';
    upload.style.backgroundColor = '';
  });

  upload.addEventListener('drop', (e) => {
    e.preventDefault();
    upload.style.borderColor = '';
    upload.style.backgroundColor = '';

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        addThumbnailToGallery(gallery, event.target.result, file.name, true);
      };
      reader.readAsDataURL(file);
    }
  });
}

function addThumbnailToGallery(gallery, src, alt, select = false) {
  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail';
  if (select) {
    thumbnail.classList.add('selected');
  }

  thumbnail.innerHTML = `
    <img src="${src}" alt="${alt}">
    <div class="thumbnail-overlay">
      <svg class="thumbnail-remove" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </div>
  `;

  // Click to select
  thumbnail.querySelector('img').addEventListener('click', (e) => {
    e.stopPropagation();
    gallery.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('selected'));
    thumbnail.classList.add('selected');
  });

  // Click overlay to remove
  thumbnail.querySelector('.thumbnail-overlay').addEventListener('click', (e) => {
    e.stopPropagation();
    thumbnail.remove();
  });

  gallery.appendChild(thumbnail);
}

// ============================================================================
// CONTENT TYPE TOGGLES
// ============================================================================

function initContentTypeToggles() {
  const toggles = document.querySelectorAll('#content-type-toggles .toggle-btn');

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggles.forEach(t => t.classList.remove('active'));
      toggle.classList.add('active');
      state.contentType = toggle.dataset.type;

      const input = document.getElementById('content-type-input');
      if (input) {
        input.value = state.contentType;
      }
    });
  });
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

async function generateImage() {
  if (!state.apiKey) {
    showStatus(i18n.t('apiKeyMissing'), 'error');
    return;
  }

  const prompt = document.getElementById('prompt-input').value.trim();
  if (!prompt) {
    showStatus(i18n.t('promptMissing'), 'error');
    return;
  }

  if (!state.selectedModel) {
    showStatus(i18n.t('modelMissing'), 'error');
    return;
  }

  state.isGenerating = true;
  updateGenerateButtonState();
  showStatus(i18n.t('generatingImage'), 'info');

  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');
  const guidanceScale = document.getElementById('guidance-scale');
  const seedInput = document.getElementById('seed-input');
  const qualityInput = document.getElementById('quality-input');
  const negativePromptInput = document.getElementById('negative-prompt-input');
  const enhanceInput = document.getElementById('enhance-input');
  const privateInput = document.getElementById('private-input');
  const nologoInput = document.getElementById('nologo-input');
  const nofeedInput = document.getElementById('nofeed-input');
  const safeInput = document.getElementById('safe-input');
  const transparentInput = document.getElementById('transparent-input');

  const width = widthInput ? parseInt(widthInput.value) : 1366;
  const height = heightInput ? parseInt(heightInput.value) : 1025;
  const seed = seedInput ? parseInt(seedInput.value) || Math.floor(Math.random() * 900000) + 100000 : Math.floor(Math.random() * 900000) + 100000;

  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`;
  const params = new URLSearchParams();

  params.append('model', state.selectedModel);
  params.append('width', width);
  params.append('height', height);
  params.append('seed', seed);

  if (guidanceScale) {
    params.append('guidance_scale', guidanceScale.value);
  }
  if (qualityInput && qualityInput.value) {
    params.append('quality', qualityInput.value);
  }
  if (negativePromptInput && negativePromptInput.value) {
    params.append('negative_prompt', negativePromptInput.value);
  }
  if (enhanceInput && enhanceInput.value) {
    params.append('enhance', 'true');
  }
  if (privateInput && privateInput.value) {
    params.append('private', 'true');
  }
  if (nologoInput && nologoInput.value) {
    params.append('nologo', 'true');
  }
  if (nofeedInput && nofeedInput.value) {
    params.append('nofeed', 'true');
  }
  if (safeInput && safeInput.value) {
    params.append('safe', 'true');
  }
  if (transparentInput && transparentInput.value) {
    params.append('transparent', 'true');
  }

  const url = `${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${state.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    displayResult(imageUrl, blob.type);
    showStatus(i18n.t('generationSuccess'), 'success');
    updateBalanceDisplay();
  } catch (error) {
    console.error('Generation error:', error);
    showStatus(i18n.t('generationError'), 'error');
  } finally {
    state.isGenerating = false;
    updateGenerateButtonState();
  }
}

function displayResult(imageUrl, contentType) {
  const emptyState = document.getElementById('empty-state');
  const imageDisplay = document.getElementById('image-display');
  const generatedImage = document.getElementById('generated-image');

  if (emptyState) emptyState.style.display = 'none';
  if (imageDisplay) imageDisplay.classList.add('visible');
  if (generatedImage) {
    generatedImage.src = imageUrl;
    generatedImage.style.display = 'block';
  }

  state.currentImage = { imageUrl, contentType };
}

function updateGenerateButtonState() {
  const btn = document.getElementById('generate-btn');
  if (!btn) return;

  if (state.isGenerating) {
    btn.disabled = true;
    btn.innerHTML = `
      <div class="generate-btn-spinner"></div>
      <span>${i18n.t('generatingImage')}</span>
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M17.8 6.2l1.4-1.4M3 21h18M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14"/>
      </svg>
      <span data-i18n="generateImage">${i18n.t('generateImage')}</span>
    `;
  }
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;

  statusEl.className = `status-message ${type}`;
  statusEl.textContent = message;
  statusEl.classList.add('visible');

  setTimeout(() => {
    hideStatus();
  }, 3000);
}

function hideStatus() {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.classList.remove('visible');
  }
}

// ============================================================================
// DOWNLOAD AND FULLSCREEN
// ============================================================================

function initImageActions() {
  const downloadBtn = document.getElementById('download-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const modalClose = document.getElementById('modal-close');
  const modalOverlay = document.getElementById('fullscreen-modal');

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (state.currentImage && state.currentImage.imageUrl) {
        const link = document.createElement('a');
        link.href = state.currentImage.imageUrl;
        const ext = state.currentImage.contentType?.split('/')[1]?.split(';')[0] || 'png';
        link.download = `pollinations-image.${ext}`;
        link.click();
      }
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (state.currentImage && state.currentImage.imageUrl) {
        const modalImage = document.getElementById('modal-image');
        if (modalImage) {
          modalImage.src = state.currentImage.imageUrl;
        }
        if (modalOverlay) {
          modalOverlay.classList.add('visible');
        }
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      if (modalOverlay) {
        modalOverlay.classList.remove('visible');
      }
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('visible');
      }
    });
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Language toggle
  const languageToggle = document.getElementById('language-toggle');
  if (languageToggle) {
    languageToggle.addEventListener('click', () => {
      const currentLang = i18n.getCurrentLanguage();
      const newLang = currentLang === 'en' ? 'de' : 'en';
      i18n.setLanguage(newLang);
      languageToggle.textContent = newLang === 'en' ? 'EN' : 'DE';

      // Update aspect ratio options for new language
      const currentRatioEn = Object.keys(aspectRatiosEn).find(key => aspectRatiosEn[key].ratio === aspectRatios[state.selectedAspectRatio]?.ratio);
      if (currentRatioEn && newLang === 'en') {
        selectAspectRatio(currentRatioEn, aspectRatiosEn[currentRatioEn]);
      } else if (newLang === 'de') {
        const currentRatioDe = Object.keys(aspectRatios).find(key => aspectRatios[key].ratio === aspectRatiosEn[state.selectedAspectRatio]?.ratio);
        if (currentRatioDe) {
          selectAspectRatio(currentRatioDe, aspectRatios[currentRatioDe]);
        }
      }
    });

    // Set initial button text
    languageToggle.textContent = i18n.getCurrentLanguage() === 'en' ? 'EN' : 'DE';
  }

  // API Key input
  const apiKeyInput = document.getElementById('api-key-input');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('blur', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        saveApiKey(key);
        showStatus(i18n.t('apiKeyStored'), 'success');
        updateBalanceDisplay();
      }
    });

    apiKeyInput.addEventListener('input', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        saveApiKey(key);
      } else {
        state.apiKey = null;
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) balanceDisplay.classList.remove('visible');
      }
    });
  }

  // Generate button
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateImage);
  }

  // Prompt input - generate on Enter
  const promptInput = document.getElementById('prompt-input');
  if (promptInput) {
    promptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !state.isGenerating) {
        generateImage();
      }
    });
  }

  // Listen for language changes
  window.addEventListener('languageChanged', () => {
    renderAspectRatioOptions();
    updateCostDisplay();

    // Update generate button text
    if (!state.isGenerating) {
      updateGenerateButtonState();
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  // Initialize i18n
  i18n.updatePageLanguage();

  // Load API key
  loadApiKey();

  // Setup UI components
  initDropdowns();
  initPanels();
  initGalleries();
  initContentTypeToggles();
  initImageActions();

  // Setup event listeners
  setupEventListeners();

  // Load models
  loadModels();

  // Select default aspect ratio
  selectAspectRatio(state.selectedAspectRatio, aspectRatios[state.selectedAspectRatio] || aspectRatiosEn['Landscape (4:3)']);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
