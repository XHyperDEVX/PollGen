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
    costText.textContent = i18n.t('costsLabel', price);
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
  const promptInput = document.getElementById('prompt');
  const modelInput = document.getElementById('model');
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const seedInput = document.getElementById('seed');
  const qualityInput = document.getElementById('quality');
  const guidanceInput = document.getElementById('guidance_scale');
  const negativePromptInput = document.getElementById('negative_prompt');
  
  if (!promptInput) return {};
  
  const payload = {
    prompt: promptInput.value.trim(),
    model: modelInput ? modelInput.value : ''
  };
  
  if (widthInput) payload.width = Number(widthInput.value);
  if (heightInput) payload.height = Number(heightInput.value);
  
  if (seedInput && seedInput.value.trim() !== "") {
      payload.seed = Number(seedInput.value);
  } else {
      payload.seed = generateRandomSeed();
  }
  
  if (qualityInput && qualityInput.value) {
      payload.quality = qualityInput.value;
  }
  
  if (guidanceInput) {
      payload.guidance_scale = Number(guidanceInput.value);
  }
  
  if (negativePromptInput && negativePromptInput.value.trim()) {
      payload.negative_prompt = negativePromptInput.value.trim();
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
  
  if (generateBtn) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        generateBtn.innerHTML = '<div class="spinner"></div>';
    } else {
        generateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 10 7.5-7.5a2.12 2.12 0 1 1 3 3L16 13"></path><path d="m15 5 4 4"></path><path d="m8 22 3-3"></path><path d="M2 14l2-2"></path><path d="m2 22 10-10"></path><path d="m17 17 3 3"></path><path d="m2 18 1-1"></path><path d="m20 2 1 1"></path></svg> <span data-i18n="generateBtn">Generate Image</span>';
    }
  }
}

function createPlaceholderCard(genId, prompt) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `gen-card-${genId}`;
    
    const w = Number(document.getElementById('width').value) || 1024;
    const h = Number(document.getElementById('height').value) || 1024;
    const ratio = (h / w) * 100;

    card.innerHTML = `
        <div class="noise-placeholder" style="padding-bottom: ${ratio}%"></div>
        <div class="image-card-overlay">
            <button class="overlay-btn download-btn hidden" title="Download">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            </button>
        </div>
    `;
    return card;
}

function displayResultInCard(genId, data) {
    const card = document.getElementById(`gen-card-${genId}`);
    if (!card) return;
    
    const placeholder = card.querySelector('.noise-placeholder');
    const overlay = card.querySelector('.image-card-overlay');
    const downloadBtn = card.querySelector('.download-btn');
    
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

function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.classList.remove('hidden');
    }
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

function addToImageHistory(historyItem) {
  if (!historyItem || !historyItem.imageData) return;
  state.imageHistory.unshift(historyItem);
  if (state.imageHistory.length > 18) state.imageHistory.pop();
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
  const galleryFeed = document.getElementById('gallery-feed');
  const emptyState = document.getElementById('placeholder');

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

      const genId = Date.now();
      const card = createPlaceholderCard(genId, payload.prompt);
      
      if (emptyState) emptyState.style.display = 'none';
      galleryFeed.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'end' });

      toggleLoading(true);
      setStatus('', '');
      try {
        const response = await generateImage(payload);
        displayResultInCard(genId, response);
        addToImageHistory(response);
        if (state.apiKey) updateBalance(state.apiKey);
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
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            generateBtn.click();
        }
    });
  }

  const guidanceScale = document.getElementById('guidance_scale');
  const guidanceValue = document.getElementById('guidance-value');
  if (guidanceScale && guidanceValue) {
      guidanceScale.addEventListener('input', () => {
          guidanceValue.textContent = guidanceScale.value;
      });
  }

  window.addEventListener('languageChanged', () => {
      renderModelOptions(state.models);
      if (state.apiKey) updateBalance(state.apiKey);
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  i18n.updatePageLanguage();
  
  const lang = i18n.getCurrentLanguage();
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`lang-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

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
