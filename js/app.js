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
  hidePremiumModels: false, // Whether to hide premium (paid_only) models
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

function isApiKeyValidForGeneration() {
  return Boolean(
    state.apiKey &&
      state.keyInfo &&
      state.keyInfoApiKey === state.apiKey &&
      state.keyInfo.valid !== false
  );
}

async function updateBalance(apiKey) {
  const apiKeyHint = document.getElementById('api-key-hint');
  if (!apiKeyHint) return;

  apiKeyHint.classList.remove('hidden');

  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    apiKeyHint.innerHTML = i18n.t('apiKeyHint');
    state.keyInfo = null;
    state.keyInfoApiKey = null;
    state.allowedModels = null;
    setGenerateButtonEnabled(false);
    const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
    renderModelOptions(modelsToRender);
    return;
  }

  let keyInfo = state.keyInfo;

  if (!keyInfo || state.keyInfoApiKey !== trimmedKey) {
    keyInfo = await validateApiKeyInfo(trimmedKey);

    if (state.apiKey !== trimmedKey) return;

    if (!keyInfo || keyInfo.valid === false) {
      apiKeyHint.textContent = i18n.t('invalidApiKey');
      state.keyInfo = null;
      state.keyInfoApiKey = null;
      state.allowedModels = null;
      setGenerateButtonEnabled(false);
      const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
      renderModelOptions(modelsToRender);
      return;
    }

    state.keyInfo = keyInfo;
    state.keyInfoApiKey = trimmedKey;
  }

  setGenerateButtonEnabled(true);

  if (keyInfo.permissions && keyInfo.permissions.models) {
    state.allowedModels = keyInfo.permissions.models;
  } else {
    state.allowedModels = null;
  }

  // Render models based on current mode
  const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
  renderModelOptions(modelsToRender);

  const hasBalancePermission =
    keyInfo.permissions &&
    keyInfo.permissions.account &&
    keyInfo.permissions.account.includes('balance');

  if (!hasBalancePermission) {
    apiKeyHint.textContent = i18n.t('balancePermissionError');
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
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

// Premium Models Filter
function loadHidePremiumModels() {
  const saved = localStorage.getItem('pollgen_hide_premium_models');
  if (saved !== null) {
    state.hidePremiumModels = saved === 'true';
  } else {
    state.hidePremiumModels = false;
  }
  // Update checkbox state
  const checkbox = document.getElementById('hide-premium-models');
  if (checkbox) {
    checkbox.checked = state.hidePremiumModels;
  }
  return state.hidePremiumModels;
}

function saveHidePremiumModels(hide) {
  state.hidePremiumModels = hide;
  localStorage.setItem('pollgen_hide_premium_models', hide.toString());
}

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

    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(imageModels));
    localStorage.setItem('pollinations_video_models_cache', JSON.stringify(videoModels));
    localStorage.setItem(MODELS_CACHE_TIMESTAMP_KEY, Date.now().toString());

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

async function loadModels() {
  setStatus(i18n.t('modelLoading'), 'info');
  try {
    const { imageModels, videoModels } = await fetchModelsFromAPI();
    state.models = imageModels;
    state.videoModels = videoModels;
    renderModelOptions(state.currentMode === 'video' ? videoModels : imageModels);
    setStatus('', '');
  } catch (error) {
    const cached = getCachedModels();
    if (cached && cached.imageModels && cached.imageModels.length > 0) {
      state.models = cached.imageModels;
      state.videoModels = cached.videoModels || [];
      renderModelOptions(state.currentMode === 'video' ? state.videoModels : state.models);
      setStatus('', '');
    } else {
      setStatus(i18n.t('modelLoadError'), 'error');
    }
  }
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

  // Filter out premium models if hidePremiumModels is enabled
  if (state.hidePremiumModels) {
    filteredModels = filteredModels.filter(model => model.paid_only !== true);
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
  
  // Calculate max width needed for descriptions
  let maxWidth = 280; // Default minimum width
  const measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  
  // Helper function to get premium indicator HTML
  const getPremiumIndicator = () => `<span class="model-premium" title="${i18n.t('paidOnlyError')}">⭐ ${i18n.t('paidOnlyLabel')}</span>`;
  
  sortedModels.forEach(model => {
    const name = model.name || 'Unknown';
    const description = model.description || '';
    const priceInfo = formatModelPrice(model);
    const isPremium = model.paid_only === true;
    
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
      displayHTML += `<div class="model-name-desc">${name}${isPremium ? getPremiumIndicator() : ''}</div>`;
      displayHTML += `<div class="model-description">${description}</div>`;
      
      // Measure width for both lines
      const nameWidth = ctx.measureText(name).width;
      const descWidth = ctx.measureText(description).width;
      const textWidth = Math.max(nameWidth, descWidth) + 120; // Add padding for badge, premium indicator, and margins
      maxWidth = Math.max(maxWidth, textWidth);
    } else {
      displayHTML += `<div class="model-name-single">${name}${isPremium ? getPremiumIndicator() : ''}</div>`;
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
      const btnPremiumIndicator = isPremium ? getPremiumIndicator() : '';
      currentModelName.innerHTML = name + btnPremiumIndicator;
      const btnBadge = document.querySelector('#model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(name);
      modelPopover.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      updateCostDisplay(model);
      modelPopover.classList.remove('visible');
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
      const btnPremiumIndicator = isPremium ? getPremiumIndicator() : '';
      currentModelName.innerHTML = model.name + btnPremiumIndicator;
      const btnBadge = document.querySelector('#model-select-btn .model-badge');
      if (btnBadge) btnBadge.style.backgroundColor = stringToColor(model.name);
      updateCostDisplay(model);
    }
  } else if (sortedModels.length > 0) {
    select.value = sortedModels[0].name;
    const isPremium = sortedModels[0].paid_only === true;
    const btnPremiumIndicator = isPremium ? getPremiumIndicator() : '';
    currentModelName.innerHTML = sortedModels[0].name + btnPremiumIndicator;
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

  if (activeFireflyRo) activeFireflyRo.disconnect();
  if (window.ResizeObserver) {
    activeFireflyRo = new ResizeObserver(updateBounds);
    activeFireflyRo.observe(layer);
  }

  const last = { t: performance.now() };

  const tick = (t) => {
    const dt = Math.min(0.05, Math.max(0.008, (t - last.t) / 1000));
    last.t = t;

    if (!bounds.w || !bounds.h) {
      updateBounds();
      activeFireflyRaf = requestAnimationFrame(tick);
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

    activeFireflyRaf = requestAnimationFrame(tick);
  };

  if (activeFireflyRaf) cancelAnimationFrame(activeFireflyRaf);
  activeFireflyRaf = requestAnimationFrame(tick);
}

function stopFireflyTicker() {
  if (activeFireflyRaf) {
    cancelAnimationFrame(activeFireflyRaf);
    activeFireflyRaf = null;
  }
  if (activeFireflyRo) {
    activeFireflyRo.disconnect();
    activeFireflyRo = null;
  }
}

function toggleLoading(isLoading) {
  state.isGenerating = isLoading;
  const generateBtn = document.getElementById('generate-btn');
  const modeInput = document.getElementById('mode');
  const isVideoMode = modeInput && modeInput.value === 'video';

  if (!isLoading) {
    stopFireflyTicker();
  }

  if (generateBtn) {
    if (isLoading) {
      generateBtn.disabled = true;
    } else {
      setGenerateButtonEnabled(isApiKeyValidForGeneration());
    }

    const btnText = generateBtn.querySelector('#generate-btn-text');
    if (btnText) {
      if (isLoading) {
        btnText.textContent = isVideoMode ? i18n.t('generatingVideoLabel') : i18n.t('generatingLabel');
      } else {
        btnText.textContent = isVideoMode ? i18n.t('generateVideoBtn') : i18n.t('generateBtn');
      }
    }
    if (isLoading) {
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

function createPlaceholderCard(genId) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `gen-card-${genId}`;
    
    const w = Number(document.getElementById('width').value) || 1024;
    const h = Number(document.getElementById('height').value) || 1024;
    const ratio = (h / w) * 100;

    card.dataset.w = w.toString();
    card.dataset.h = h.toString();
    applyImageCardSizing(card);

    const placeholder = document.createElement('div');
    placeholder.className = 'noise-placeholder';
    placeholder.style.paddingBottom = `${ratio}%`;

    // Create firefly animation (bounded to image area)
    const fireflyLayer = document.createElement('div');
    fireflyLayer.className = 'firefly-layer';
    placeholder.appendChild(fireflyLayer);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00ffaa'];
    const baseCount = Math.min(55, Math.max(28, Math.round((w * h) / 55000)));
    const fireflyCount = prefersReducedMotion ? 0 : baseCount;

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
        const speed = Math.random() * 45 + 18; // px/s
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        firefly.dataset.vx = vx.toString();
        firefly.dataset.vy = vy.toString();

        firefly.style.animationDelay = Math.random() * 4 + 's';
        firefly.style.animationDuration = `${Math.random() * 2 + 3.5}s`;
        fireflyLayer.appendChild(firefly);
    }

    if (!prefersReducedMotion && fireflyCount > 0) {
        requestAnimationFrame(() => startFireflyTicker(fireflyLayer));
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

function createVideoPlaceholderCard(genId) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.id = `gen-card-${genId}`;

    // Use the selected aspect ratio for videos
    const w = Number(document.getElementById('width').value) || 1024;
    const h = Number(document.getElementById('height').value) || 576;
    const ratio = (h / w) * 100;

    card.dataset.w = w.toString();
    card.dataset.h = h.toString();
    applyImageCardSizing(card);

    const placeholder = document.createElement('div');
    placeholder.className = 'noise-placeholder';
    placeholder.style.paddingBottom = `${ratio}%`;

    // Create firefly animation (bounded to video area)
    const fireflyLayer = document.createElement('div');
    fireflyLayer.className = 'firefly-layer';
    placeholder.appendChild(fireflyLayer);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00ffaa'];
    const baseCount = Math.min(55, Math.max(28, Math.round((w * h) / 55000)));
    const fireflyCount = prefersReducedMotion ? 0 : baseCount;

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

    if (!prefersReducedMotion && fireflyCount > 0) {
        requestAnimationFrame(() => startFireflyTicker(fireflyLayer));
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

    return card;
}

function displayVideoResultInCard(genId, data) {
    const card = document.getElementById(`gen-card-${genId}`);
    if (!card) return;

    const placeholder = card.querySelector('.noise-placeholder');
    const overlay = card.querySelector('.image-card-overlay');
    const downloadBtn = card.querySelector('.download-btn');

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
  // Premium models filter checkbox
  const hidePremiumCheckbox = document.getElementById('hide-premium-models');
  if (hidePremiumCheckbox) {
    hidePremiumCheckbox.addEventListener('change', () => {
      saveHidePremiumModels(hidePremiumCheckbox.checked);
      const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
      renderModelOptions(modelsToRender, true);
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
        const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
        renderModelOptions(modelsToRender);
      }

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
      const isVideoMode = payload.mode === 'video';
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
      try {
        if (isVideoMode) {
          const response = await generateVideo(payload);
          displayVideoResultInCard(genId, response);
          addToVideoHistory(response);
        } else {
          const response = await generateImage(payload);
          displayResultInCard(genId, response);
          addToImageHistory(response);
        }
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

  window.addEventListener('languageChanged', () => {
      const modelsToRender = state.currentMode === 'video' ? state.videoModels : state.models;
      renderModelOptions(modelsToRender);
      updateBalance(state.apiKey);
  });
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

  // Load premium models filter setting
  loadHidePremiumModels();

  // Check screen resolution
  checkResolution();
  window.addEventListener('resize', checkResolution);

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

  window.addEventListener('resize', scheduleImageCardResize);
  scheduleImageCardResize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
