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
  const apiKeyHint = document.getElementById('api-key-hint');
  
  if (!apiKey || !apiKey.trim()) {
    if (balanceDisplay) balanceDisplay.classList.add('hidden');
    if (apiKeyHint) {
        apiKeyHint.classList.remove('hidden');
        apiKeyHint.innerHTML = i18n.t('apiKeyHint');
    }
    return;
  }

  if (apiKeyHint) apiKeyHint.classList.add('hidden');
  
  try {
    const response = await fetch('https://gen.pollinations.ai/account/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    
    if (response.status === 403 || response.status === 401) {
       const data = await response.json();
       const errorMsg = data.error?.message || data.message || "";
       if (errorMsg.includes('account:balance') || data.error?.code === 'UNAUTHORIZED' || data.code === 'UNAUTHORIZED') {
           if (balanceDisplay && balanceText) {
               balanceText.textContent = i18n.t('balancePermissionError');
               balanceDisplay.classList.remove('hidden');
           }
           return;
       }
    }

    if (!response.ok) {
      if (balanceDisplay) balanceDisplay.classList.add('hidden');
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
  if (!completionTokens || completionTokens === 0) return '0';
  
  let priceStr;
  if (completionTokens < 0.000001) priceStr = completionTokens.toExponential(2);
  else if (completionTokens < 0.01) priceStr = completionTokens.toFixed(6).replace(/\.?0+$/, '');
  else if (completionTokens < 1) priceStr = completionTokens.toFixed(4).replace(/\.?0+$/, '');
  else priceStr = completionTokens.toFixed(2).replace(/\.?0+$/, '');
  
  return priceStr;
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
    if (price !== '0') label += ` - ${price} Pollen`;
    
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

function parseErrorMessage(text, status) {
    try {
        const json = JSON.parse(text);
        let msg = json.error?.message || json.message || text;
        if (typeof msg === 'string' && msg.startsWith('{')) {
            const inner = JSON.parse(msg);
            msg = inner.message || inner.error || msg;
        }
        return `${i18n.t('errorGeneration')}: ${status} - ${msg}`;
    } catch (e) {
        return `${i18n.t('errorGeneration')}: ${status} - ${text}`;
    }
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
    const btnText = generateBtn.querySelector('span');
    if (btnText) {
      btnText.textContent = isLoading ? 'Generating...' : i18n.t('generateBtn');
    }
    if (isLoading) {
        generateBtn.classList.add('loading');
    } else {
        generateBtn.classList.remove('loading');
    }
  }
}

function createPlaceholderCard(genId) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `gen-card-${genId}`;
    
    const w = Number(document.getElementById('width').value) || 1024;
    const h = Number(document.getElementById('height').value) || 1024;
    const ratio = (h / w) * 100;

    // Ensure vertical images don't exceed viewport height
    if (h > w) {
        card.style.maxWidth = `calc(85vh * ${w/h})`;
    } else {
        card.style.maxWidth = '100%';
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'noise-placeholder';
    placeholder.style.paddingBottom = `${ratio}%`;

    const pulse = document.createElement('div');
    pulse.className = 'mini-pulse';
    placeholder.appendChild(pulse);

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <div class="text">Generating...</div>
    `;
    placeholder.appendChild(loadingIndicator);

    card.appendChild(placeholder);
    const overlay = document.createElement('div');
    overlay.className = 'image-card-overlay';
    overlay.innerHTML = `
        <button class="overlay-btn download-btn hidden" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
        </button>
    `;
    card.appendChild(overlay);
    
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
    img.onclick = (e) => openLightbox(data.imageData, e);
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

let isZoomed = false;
let startX, startY, currentTranslateX = 0, currentTranslateY = 0;
let isDragging = false;

function openLightbox(src, e) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.classList.remove('hidden');
        lightbox.classList.remove('zoomed');
        isZoomed = false;
        currentTranslateX = 0;
        currentTranslateY = 0;
        isDragging = false;
        lightboxImg.style.transform = 'translate(0px, 0px)';
        lightboxImg.style.transformOrigin = 'center center';
    }
}

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-image');

if (lightboxImg) {
    lightboxImg.onclick = (e) => {
        e.stopPropagation();
        if (isDragging) return;

        if (isZoomed) {
            lightbox.classList.remove('zoomed');
            isZoomed = false;
            currentTranslateX = 0;
            currentTranslateY = 0;
            lightboxImg.style.transform = 'translate(0px, 0px)';
            lightboxImg.style.cursor = 'zoom-in';
        } else {
            const rect = lightboxImg.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            lightboxImg.style.transformOrigin = `${x}% ${y}%`;
            lightbox.classList.add('zoomed');
            lightboxImg.style.transform = 'scale(2.5)';
            lightboxImg.style.cursor = 'grab';
            isZoomed = true;
        }
    };

    let hasMoved = false;
    let dragStartX, dragStartY;

    lightbox.addEventListener('mousedown', (e) => {
        if (!isZoomed) return;
        isDragging = false;
        hasMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - dragStartX;
            const deltaY = moveEvent.clientY - dragStartY;

            // Minimal movement threshold to start dragging
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                hasMoved = true;
                isDragging = true;
            }

            if (!hasMoved) return;

            dragStartX = moveEvent.clientX;
            dragStartY = moveEvent.clientY;

            const rect = lightboxImg.getBoundingClientRect();
            const containerRect = lightbox.getBoundingClientRect();

            const scale = 2.5;
            const imageWidth = rect.width;
            const imageHeight = rect.height;
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            const maxTranslateX = (imageWidth - containerWidth) / 2;
            const maxTranslateY = (imageHeight - containerHeight) / 2;

            currentTranslateX += deltaX;
            currentTranslateY += deltaY;

            currentTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, currentTranslateX));
            currentTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, currentTranslateY));

            lightboxImg.style.transform = `scale(${scale}) translate(${currentTranslateX / scale}px, ${currentTranslateY / scale}px)`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (!hasMoved) {
                isDragging = false;
            }

            setTimeout(() => {
                isDragging = false;
            }, 10);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    lightboxImg.addEventListener('mousemove', (e) => {
        if (isZoomed && isDragging) {
            lightboxImg.style.cursor = 'grabbing';
        } else if (isZoomed) {
            lightboxImg.style.cursor = 'grab';
        }
    });
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

function adjustPromptHeight() {
    const prompt = document.getElementById('prompt');
    if (!prompt) return;
    
    // Store scroll position if textarea has overflow
    const wasScrolled = prompt.scrollTop > 0;
    const scrollTop = prompt.scrollTop;
    const scrollBottom = prompt.scrollHeight - prompt.scrollTop - prompt.clientHeight;
    
    prompt.style.height = 'auto';
    const newHeight = Math.min(prompt.scrollHeight, 200);
    prompt.style.height = newHeight + 'px';
    
    // Restore scroll position if needed
    if (wasScrolled) {
        prompt.scrollTop = prompt.scrollHeight - newHeight - scrollBottom;
    }
    
    // Adjust mini view position
    const miniView = document.getElementById('mini-view');
    if (miniView) {
        const barHeight = document.querySelector('.prompt-bar').offsetHeight;
        miniView.style.bottom = (barHeight + 20) + 'px';
    }
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
      updateBalance(state.apiKey);
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
      const card = createPlaceholderCard(genId);
      
      if (emptyState) emptyState.style.display = 'none';
      galleryFeed.appendChild(card);
      
      // Full scroll to bottom
      setTimeout(() => {
          const scrollContainer = document.getElementById('canvas-workspace');
          if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 50);

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
    promptInput.addEventListener('input', adjustPromptHeight);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            generateBtn.click();
        } else if ((e.key === 'Enter' || e.key === '.') && e.ctrlKey) {
            e.preventDefault();
            const start = promptInput.selectionStart;
            const end = promptInput.selectionEnd;
            promptInput.value = promptInput.value.substring(0, start) + "\n" + promptInput.value.substring(end);
            promptInput.selectionStart = promptInput.selectionEnd = start + 1;
            adjustPromptHeight();
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
      updateBalance(state.apiKey);
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
  } else {
      updateBalance(null);
  }
  setupEventListeners();
  loadModels();
  adjustPromptHeight();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
