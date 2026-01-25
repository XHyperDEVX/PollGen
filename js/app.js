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
  currentImage: null,
  isGenerating: false
};

// ============================================================================
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

async function updateBalance(apiKey) {
  const balanceDisplay = document.getElementById('balance-display');
  const balanceText = document.getElementById('balance-text');
  const apiKeyInfo = document.querySelector('.api-key-info');
  
  if (!apiKey || !apiKey.trim()) {
    if (balanceDisplay) {
      balanceDisplay.classList.add('hidden');
    }
    if (apiKeyInfo) {
      apiKeyInfo.classList.remove('hidden');
    }
    return;
  }
  
  try {
    const response = await fetch('https://gen.pollinations.ai/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    
    if (!response.ok) {
      // Silently hide display on API failure
      if (balanceDisplay) {
        balanceDisplay.classList.add('hidden');
      }
      if (apiKeyInfo) {
        apiKeyInfo.classList.remove('hidden');
      }
      return;
    }
    
    const data = await response.json();
    const balance = data.balance;
    
    if (typeof balance === 'number' && !isNaN(balance)) {
      const formattedBalance = formatBalanceDisplay(balance);
      
      if (balanceText) {
        balanceText.textContent = `${formattedBalance} ${i18n.t('balanceRemaining')}`;
      }
      
      if (balanceDisplay) {
        balanceDisplay.classList.remove('hidden');
      }
      
      // Hide the API key info when balance is displayed
      if (apiKeyInfo) {
        apiKeyInfo.classList.add('hidden');
      }
    } else {
      // Silently hide display if balance is invalid
      if (balanceDisplay) {
        balanceDisplay.classList.add('hidden');
      }
      if (apiKeyInfo) {
        apiKeyInfo.classList.remove('hidden');
      }
    }
  } catch (error) {
    // Silently hide display on network errors
    console.log('Balance API call failed:', error.message);
    if (balanceDisplay) {
      balanceDisplay.classList.add('hidden');
    }
    if (apiKeyInfo) {
      apiKeyInfo.classList.remove('hidden');
    }
  }
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

function loadApiKey() {
  const saved = sessionStorage.getItem('pollinations_api_key');
  if (saved && saved.trim()) {
    state.apiKey = saved.trim();
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

function validateApiKey() {
  const input = document.getElementById('api-key');
  if (!input) return false;
  
  const key = input.value.trim();
  if (key) {
    saveApiKey(key);
    setStatus(i18n.t('apiKeyStored'), 'success');
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

async function fetchModelsFromAPI() {
  try {
    const response = await fetch('https://gen.pollinations.ai/image/models');
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();
    
    // Filter for image models only (exclude video models)
    const imageModels = data.filter(model => {
      const modalities = model.output_modalities || [];
      return modalities.includes('image') && !modalities.includes('video');
    });
    
    // Cache the models
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
      // Cache expired
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached models:', error);
    return null;
  }
}

async function loadModels() {
  setStatus(i18n.t('modelLoading'), 'info');
  
  try {
    // Try to fetch from API
    const models = await fetchModelsFromAPI();
    state.models = models;
    renderModelOptions(models);
    setStatus('', ''); // Clear status message
  } catch (error) {
    // If API fetch fails, try cache
    const cached = getCachedModels();
    if (cached && cached.length > 0) {
      state.models = cached;
      renderModelOptions(cached);
      setStatus('', ''); // Clear status message
    } else {
      setStatus(i18n.t('modelLoadError'), 'error');
      console.error('No cached models available');
    }
  }
}

function formatModelPrice(model) {
  const pricing = model.pricing || {};
  let completionTokens = pricing.completionImageTokens || pricing.completion || 0;
  
  // Handle different pricing formats
  if (typeof completionTokens === 'string') {
    completionTokens = parseFloat(completionTokens);
  }
  
  if (!completionTokens || completionTokens === 0) {
    return '0 pollen';
  }
  
  // Format the number appropriately
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

function renderModelOptions(models) {
  const select = document.getElementById('model');
  if (!select) return;
  
  const previousValue = select.value;
  select.innerHTML = '';
  
  // Add placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = i18n.t('modelPlaceholder');
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  select.appendChild(placeholderOption);
  
  // Sort models by price (cheapest first)
  const sortedModels = [...models].sort((a, b) => {
    let priceA = a.pricing?.completionImageTokens || a.pricing?.completion || 0;
    let priceB = b.pricing?.completionImageTokens || b.pricing?.completion || 0;
    
    // Handle string prices
    if (typeof priceA === 'string') priceA = parseFloat(priceA) || 0;
    if (typeof priceB === 'string') priceB = parseFloat(priceB) || 0;
    
    return priceA - priceB;
  });
  
  sortedModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.name;
    
    const name = model.name || 'Unknown';
    const description = model.description || model.name || '';
    const price = formatModelPrice(model);
    
    // Format: "Model Name - price"
    let label = name;
    if (price) {
      label += ` - ${price}`;
    }
    
    option.textContent = label;
    // Always set tooltip with description (or name if no description)
    option.title = description || name;
    select.appendChild(option);
  });
  
  // Restore previous selection if valid
  if (previousValue && [...select.options].some(opt => opt.value === previousValue)) {
    select.value = previousValue;
  }
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

async function generateImage(payload) {
  if (!state.apiKey) {
    throw new Error(i18n.t('apiKeyMissing'));
  }
  
  const endpoint = `https://gen.pollinations.ai/image/${encodeURIComponent(payload.prompt)}`;
  
  const params = new URLSearchParams();
  if (payload.model) params.append('model', payload.model);
  if (payload.width) params.append('width', payload.width);
  if (payload.height) params.append('height', payload.height);
  if (payload.seed) params.append('seed', payload.seed);
  if (payload.guidance_scale) params.append('guidance_scale', payload.guidance_scale);
  if (payload.negative_prompt) params.append('negative_prompt', payload.negative_prompt);
  if (payload.quality) params.append('quality', payload.quality);
  if (payload.enhance) params.append('enhance', 'true');
  if (payload.private) params.append('private', 'true');
  if (payload.nologo) params.append('nologo', 'true');
  if (payload.nofeed) params.append('nofeed', 'true');
  if (payload.safe) params.append('safe', 'true');
  if (payload.transparent) params.append('transparent', 'true');
  
  const url = `${endpoint}?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${state.apiKey}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${i18n.t('errorGeneration')}: ${response.status} - ${errorText}`);
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

function collectPayload() {
  const form = document.getElementById('generation-form');
  if (!form) return {};
  
  const formData = new FormData(form);
  
  const payload = {
    prompt: (formData.get('prompt') || '').toString().trim(),
    model: (formData.get('model') || '').toString()
  };
  
  const width = Number(formData.get('width'));
  if (!isNaN(width) && width > 0) {
    payload.width = width;
  }
  
  const height = Number(formData.get('height'));
  if (!isNaN(height) && height > 0) {
    payload.height = height;
  }
  
  const seed = Number(formData.get('seed'));
  if (!isNaN(seed)) {
    payload.seed = seed;
  }
  
  const guidance = Number(formData.get('guidance_scale'));
  if (!isNaN(guidance)) {
    payload.guidance_scale = guidance;
  }
  
  const negativePrompt = (formData.get('negative_prompt') || '').toString().trim();
  if (negativePrompt) {
    payload.negative_prompt = negativePrompt;
  }
  
  const quality = (formData.get('quality') || '').toString();
  if (quality) {
    payload.quality = quality;
  }
  
  // Boolean flags
  ['enhance', 'private', 'nologo', 'nofeed', 'safe', 'transparent'].forEach(flag => {
    const checkbox = document.getElementById(flag);
    if (checkbox && checkbox.checked) {
      payload[flag] = true;
    }
  });
  
  return payload;
}

// ============================================================================
// UI UPDATES
// ============================================================================

function setStatus(message, type = 'info') {
  const statusBox = document.getElementById('status');
  if (!statusBox) return;
  
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function toggleLoading(isLoading) {
  state.isGenerating = isLoading;
  
  const generateBtn = document.getElementById('generate-btn');
  const resultLoader = document.getElementById('result-loader');
  const loadingStatus = document.getElementById('loading-status');
  const placeholder = document.getElementById('placeholder');
  const resultImage = document.getElementById('result-image');
  
  if (generateBtn) {
    generateBtn.disabled = isLoading;
  }
  
  if (resultLoader) {
    if (isLoading) {
      resultLoader.classList.add('visible');
    } else {
      resultLoader.classList.remove('visible');
    }
  }
  
  // Show loading text below the loader, not in the placeholder
  if (loadingStatus) {
    if (isLoading) {
      loadingStatus.textContent = i18n.t('placeholderGenerating');
    } else {
      loadingStatus.textContent = '';
    }
  }
  
  if (placeholder) {
    if (isLoading) {
      // Keep placeholder hidden during loading
      placeholder.style.display = 'none';
    } else if (!resultImage || !resultImage.classList.contains('visible')) {
      placeholder.style.display = 'flex';
      placeholder.textContent = i18n.t('placeholderText');
    } else {
      placeholder.style.display = 'none';
    }
  }
  
  if (isLoading && resultImage) {
    resultImage.classList.remove('visible');
  }
}

function displayResult(data) {
  const resultImage = document.getElementById('result-image');
  const placeholder = document.getElementById('placeholder');
  const downloadLink = document.getElementById('download-link');
  const downloadActions = document.getElementById('result-actions');
  
  if (!resultImage || !placeholder || !downloadLink || !downloadActions) {
    return;
  }
  
  if (data.imageData) {
    resultImage.src = data.imageData;
    resultImage.classList.add('visible');
    placeholder.style.display = 'none';
    
    downloadActions.classList.remove('hidden');
    downloadLink.href = data.imageData;
    
    if (data.contentType && typeof data.contentType === 'string') {
      const ext = data.contentType.split('/')[1]?.split(';')[0] || 'png';
      downloadLink.setAttribute('download', `pollinations-image.${ext}`);
    }
    
    state.currentImage = data;
    
    // Update balance after successful image generation
    updateBalance(state.apiKey);
  }
}

function updateDimensionsFromAspectRatio() {
  const aspectRatioSelect = document.getElementById('aspect-ratio');
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');

  if (!aspectRatioSelect || !widthInput || !heightInput) {
    return;
  }

  const ratio = aspectRatioSelect.value;
  const ratios = {
    'Ultrabreit (21:9)': { width: 4788, height: 2052 },
    'Breitbild (16:9)': { width: 3648, height: 2052 },
    'Klassisch (5:4)': { width: 2560, height: 2048 },
    'Querformat (4:3)': { width: 2732, height: 2049 },
    'Breit (3:2)': { width: 3072, height: 2048 },
    'Quadratisch (1:1)': { width: 2048, height: 2048 },
    'Standard (4:5)': { width: 2048, height: 2560 },
    'Hochformat (3:4)': { width: 2049, height: 2732 },
    'Hoch (2:3)': { width: 2048, height: 3072 },
    'Vertikal (9:16)': { width: 2052, height: 3648 }
  };

  if (ratio === 'custom') {
    return;
  }

  if (ratios[ratio]) {
    widthInput.value = ratios[ratio].width;
    heightInput.value = ratios[ratio].height;
  }
}

// ============================================================================
// IMAGE MODAL FUNCTIONS
// ============================================================================

function initImageModal() {
  const modal = document.getElementById('image-modal');
  const closeBtn = document.getElementById('image-modal-close');
  const overlay = document.querySelector('.image-modal-overlay');
  const resultImage = document.getElementById('result-image');

  if (!modal || !closeBtn || !resultImage) return;

  resultImage.addEventListener('click', () => {
    openImageModal(resultImage.src);
  });

  closeBtn.addEventListener('click', closeImageModal);
  overlay.addEventListener('click', closeImageModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImageModal();
    }
  });
}

function openImageModal(imageSrc) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('image-modal-image');

  if (modal && modalImage) {
    modalImage.src = imageSrc;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  // Initialize image modal
  initImageModal();

  // Language switcher
  const languageToggle = document.getElementById('language-toggle');
  if (languageToggle) {
    languageToggle.addEventListener('click', () => {
      const currentLang = i18n.getCurrentLanguage();
      const newLang = currentLang === 'en' ? 'de' : 'en';
      i18n.setLanguage(newLang);
      
      // Update language toggle button text to show selected language
      languageToggle.textContent = newLang === 'en' ? 'EN' : 'DE';
      
      // Reload models with new language
      renderModelOptions(state.models);
      
      // Update balance display with new language if it exists
      if (state.apiKey && document.getElementById('balance-display').classList.contains('hidden') === false) {
        updateBalance(state.apiKey);
      }
    });
    
    // Set initial button text to show selected language
    languageToggle.textContent = i18n.getCurrentLanguage() === 'en' ? 'EN' : 'DE';
  }
  
  // Listen for language changes (from i18n system)
  window.addEventListener('languageChanged', (event) => {
    // Update balance display with new language if it exists
    if (state.apiKey && document.getElementById('balance-display').classList.contains('hidden') === false) {
      updateBalance(state.apiKey);
    }
  });
  
  // API Key input
  const apiKeyInput = document.getElementById('api-key');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('blur', () => {
      validateApiKey();
      updateBalance(state.apiKey);
    });
    apiKeyInput.addEventListener('input', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        saveApiKey(key);
        // Clear balance display when typing (will be restored on blur)
        const balanceDisplay = document.getElementById('balance-display');
        const apiKeyInfo = document.querySelector('.api-key-info');
        if (balanceDisplay) {
          balanceDisplay.classList.add('hidden');
        }
        if (apiKeyInfo) {
          apiKeyInfo.classList.remove('hidden');
        }
      } else {
        // Clear the API key if input is empty
        state.apiKey = null;
        const balanceDisplay = document.getElementById('balance-display');
        const apiKeyInfo = document.querySelector('.api-key-info');
        if (balanceDisplay) {
          balanceDisplay.classList.add('hidden');
        }
        if (apiKeyInfo) {
          apiKeyInfo.classList.remove('hidden');
        }
      }
    });
  }
  
  // Form submission
  const form = document.getElementById('generation-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      // Validate API key
      if (!state.apiKey) {
        validateApiKey();
        if (!state.apiKey) {
          setStatus(i18n.t('apiKeyMissing'), 'error');
          return;
        }
      }
      
      const payload = collectPayload();
      
      // Validation
      if (!payload.prompt) {
        setStatus(i18n.t('statusPromptMissing'), 'error');
        return;
      }
      if (!payload.model) {
        setStatus(i18n.t('statusModelMissing'), 'error');
        return;
      }
      if (!payload.width || !payload.height) {
        setStatus(i18n.t('statusDimensionsMissing'), 'error');
        return;
      }
      
      toggleLoading(true);
      setStatus('', ''); // Clear status during generation
      
      try {
        const response = await generateImage(payload);
        displayResult(response);
        setStatus('', ''); // Clear status on success
      } catch (error) {
        setStatus(error.message || i18n.t('statusError'), 'error');
        console.error(error);
      } finally {
        toggleLoading(false);
      }
    });
  }
  
  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (form) {
        form.reset();
        
        // Update guidance value display
        const guidanceScale = document.getElementById('guidance_scale');
        const guidanceValue = document.getElementById('guidance-value');
        if (guidanceScale && guidanceValue) {
          guidanceValue.textContent = guidanceScale.value;
        }
        
        setStatus('', ''); // Clear status on reset
      }
    });
  }
  
  // Guidance scale slider
  const guidanceScale = document.getElementById('guidance_scale');
  const guidanceValue = document.getElementById('guidance-value');
  if (guidanceScale && guidanceValue) {
    guidanceScale.addEventListener('input', () => {
      guidanceValue.textContent = guidanceScale.value;
    });
    // Set initial value
    guidanceValue.textContent = guidanceScale.value;
  }
  
  // Aspect ratio selector
  const aspectRatioSelect = document.getElementById('aspect-ratio');
  if (aspectRatioSelect) {
    aspectRatioSelect.addEventListener('change', updateDimensionsFromAspectRatio);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  // Initialize i18n
  i18n.updatePageLanguage();
  
  // Load API key from session
  loadApiKey();
  if (state.apiKey) {
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) {
      apiKeyInput.value = state.apiKey;
    }
    // Update balance display with loaded API key
    updateBalance(state.apiKey);
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Load models
  loadModels();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
