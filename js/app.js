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
  isGenerating: false,
  imageHistory: []
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
  
  if (!apiKey || !apiKey.trim()) {
    if (balanceDisplay) {
      balanceDisplay.classList.add('hidden');
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
      if (balanceDisplay) {
        balanceDisplay.classList.add('hidden');
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
    } else {
      if (balanceDisplay) {
        balanceDisplay.classList.add('hidden');
      }
    }
  } catch (error) {
    console.log('Balance API call failed:', error.message);
    if (balanceDisplay) {
      balanceDisplay.classList.add('hidden');
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
    
    // Filter for image models only
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
    if (!cached || !timestamp) return null;
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION_MS) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached models:', error);
    return null;
  }
}

async function loadModels() {
  setStatus(i18n.t('modelLoading'), 'info');
  try {
    const models = await fetchModelsFromAPI();
    state.models = models;
    renderModelOptions(models);
    setStatus('', '');
  } catch (error) {
    const cached = getCachedModels();
    if (cached && cached.length > 0) {
      state.models = cached;
      renderModelOptions(cached);
      setStatus('', '');
    } else {
      setStatus(i18n.t('modelLoadError'), 'error');
    }
  }
}

function formatModelPrice(model) {
  const pricing = model.pricing || {};
  let completionTokens = pricing.completionImageTokens || pricing.completion || 0;
  if (typeof completionTokens === 'string') completionTokens = parseFloat(completionTokens);
  if (!completionTokens || completionTokens === 0) return '0 pollen';
  
  let priceStr;
  if (completionTokens < 0.000001) priceStr = completionTokens.toExponential(2);
  else if (completionTokens < 0.01) priceStr = completionTokens.toFixed(6).replace(/\.?0+$/, '');
  else if (completionTokens < 1) priceStr = completionTokens.toFixed(4).replace(/\.?0+$/, '');
  else priceStr = completionTokens.toFixed(2).replace(/\.?0+$/, '');
  
  return `${priceStr} pollen`;
}

function renderModelOptions(models) {
  const select = document.getElementById('model');
  const modelPopover = document.getElementById('model-popover');
  const currentModelName = document.getElementById('current-model-name');
  if (!select || !modelPopover) return;
  
  const previousValue = select.value;
  select.innerHTML = '';
  modelPopover.innerHTML = '';
  
  const sortedModels = [...models].sort((a, b) => {
    let priceA = a.pricing?.completionImageTokens || a.pricing?.completion || 0;
    let priceB = b.pricing?.completionImageTokens || b.pricing?.completion || 0;
    if (typeof priceA === 'string') priceA = parseFloat(priceA) || 0;
    if (typeof priceB === 'string') priceB = parseFloat(priceB) || 0;
    return priceA - priceB;
  });
  
  sortedModels.forEach(model => {
    const name = model.name || 'Unknown';
    const description = model.description || model.name || '';
    const price = formatModelPrice(model);
    
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = name;
    select.appendChild(option);

    const item = document.createElement('div');
    item.className = 'popover-item';
    if (model.name === previousValue) item.classList.add('selected');
    
    let label = name;
    if (price) label += ` - ${price}`;
    
    item.innerHTML = `
      <div class="model-badge" style="background-color: ${stringToColor(name)}"></div>
      <span>${label}</span>
    `;
    item.title = description;
    
    item.onclick = (e) => {
      e.stopPropagation();
      select.value = model.name;
      currentModelName.textContent = name;
      const btnBadge = document.querySelector('#model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(name);
      modelPopover.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      updateCostDisplay(model);
      modelPopover.classList.remove('visible');
    };
    
    modelPopover.appendChild(item);
  });
  
  if (previousValue && [...select.options].some(opt => opt.value === previousValue)) {
    select.value = previousValue;
    const model = sortedModels.find(m => m.name === previousValue);
    if (model) {
      currentModelName.textContent = model.name;
      const btnBadge = document.querySelector('#model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(model.name);
      updateCostDisplay(model);
    }
  } else if (sortedModels.length > 0) {
    select.value = sortedModels[0].name;
    currentModelName.textContent = sortedModels[0].name;
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

function updateCostDisplay(model) {
  const costText = document.getElementById('cost-text');
  if (costText) {
    const price = formatModelPrice(model);
    costText.textContent = `Costs ${price}`;
  }
}

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
    headers: { 'Authorization': `Bearer ${state.apiKey}` }
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

function generateRandomSeed() {
  return Math.floor(100000 + Math.random() * 900000);
}

function collectPayload() {
  const form = document.getElementById('generation-form');
  const promptInput = document.getElementById('prompt');
  if (!form || !promptInput) return {};
  
  const formData = new FormData(form);
  let prompt = promptInput.value.trim();

  // Add content type to prompt if not Auto
  const activeType = document.querySelector('.toggle-btn.active');
  if (activeType && activeType.id === 'type-photo') {
      prompt += ', photo';
  } else if (activeType && activeType.id === 'type-art') {
      prompt += ', art';
  }

  const payload = {
    prompt: prompt,
    model: (formData.get('model') || '').toString()
  };
  
  const width = Number(document.getElementById('width').value);
  if (!isNaN(width) && width > 0) payload.width = width;
  const height = Number(document.getElementById('height').value);
  if (!isNaN(height) && height > 0) payload.height = height;
  
  let seed = generateRandomSeed();
  payload.seed = seed;
  
  const guidance = Number(document.getElementById('guidance_scale').value);
  if (!isNaN(guidance)) payload.guidance_scale = guidance;
  
  // Boolean flags from hidden form
  ['enhance', 'private', 'nologo', 'nofeed', 'safe', 'transparent'].forEach(flag => {
    const checkbox = document.getElementById(flag);
    if (checkbox && checkbox.checked) payload[flag] = true;
  });
  
  return payload;
}

// ============================================================================
// UI UPDATES
// ============================================================================

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

function toggleLoading(isLoading) {
  state.isGenerating = isLoading;
  const generateBtn = document.getElementById('generate-btn');
  const resultLoader = document.getElementById('result-loader');
  const placeholder = document.getElementById('placeholder');
  const resultImageContainer = document.getElementById('result-container');
  const resultImage = document.getElementById('result-image');
  
  if (generateBtn) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        generateBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Generating...';
    } else {
        generateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg> Generate Image';
    }
  }
  
  if (resultLoader) {
    if (isLoading) resultLoader.classList.add('visible');
    else resultLoader.classList.remove('visible');
  }
  
  if (isLoading) {
    if (placeholder) placeholder.style.display = 'none';
    if (resultImageContainer) resultImageContainer.classList.add('visible');
    if (resultImage) resultImage.style.opacity = '0.3';
  } else {
    if (resultImage) resultImage.style.opacity = '1';
    if (!resultImage || !resultImage.src) {
        if (placeholder) placeholder.style.display = 'block';
        if (resultImageContainer) resultImageContainer.classList.remove('visible');
    }
  }
}

function displayResult(data) {
  const resultImage = document.getElementById('result-image');
  const resultContainer = document.getElementById('result-container');
  const placeholder = document.getElementById('placeholder');
  if (!resultImage || !placeholder || !resultContainer) return;

  if (data.imageData) {
    resultImage.src = data.imageData;
    resultContainer.classList.add('visible');
    placeholder.style.display = 'none';
    state.currentImage = data;
    addToImageHistory(data);
    if (state.apiKey) updateBalance(state.apiKey);
  }
}

function addToImageHistory(historyItem) {
  if (!historyItem || !historyItem.imageData) return;
  state.imageHistory.unshift(historyItem);
  if (state.imageHistory.length > 18) state.imageHistory.pop();
}

function displayInMainView(historyItem) {
  const resultImage = document.getElementById('result-image');
  const resultContainer = document.getElementById('result-container');
  const placeholder = document.getElementById('placeholder');
  if (!resultImage || !placeholder || !resultContainer) return;
  resultImage.src = historyItem.imageData;
  resultContainer.classList.add('visible');
  placeholder.style.display = 'none';
  state.currentImage = historyItem;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  const apiKeyInput = document.getElementById('api-key');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('blur', () => {
      validateApiKey();
      updateBalance(state.apiKey);
    });
    apiKeyInput.addEventListener('input', () => {
      const key = apiKeyInput.value.trim();
      if (key) saveApiKey(key);
      else state.apiKey = null;
    });
  }
  
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
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
      toggleLoading(true);
      setStatus('', '');
      try {
        const response = await generateImage(payload);
        displayResult(response);
      } catch (error) {
        setStatus(error.message || i18n.t('statusError'), 'error');
        console.error(error);
      } finally {
        toggleLoading(false);
      }
    });
  }

  const promptInput = document.getElementById('prompt');
  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            generateBtn.click();
        }
    });
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  i18n.updatePageLanguage();
  loadApiKey();
  if (state.apiKey) {
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) apiKeyInput.value = state.apiKey;
    updateBalance(state.apiKey);
  }
  setupEventListeners();
  loadModels();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
