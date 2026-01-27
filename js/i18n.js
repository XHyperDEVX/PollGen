/**
 * Internationalization (i18n) System
 * Supports English (default)
 */

const translations = {
  en: {
    // Page
    pageTitle: 'PollGen',
    pageDescription: 'Create high-quality images with AI',

    // API Key
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter your Pollinations API key',
    apiKeyHint: 'Get your free API key from',
    apiKeyStored: 'API key saved',
    apiKeyMissing: 'Please enter your API key',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Describe the image you want to generate',
    modelLabel: 'Model',
    aspectRatioLabel: 'Aspect Ratio',
    visualIntensityLabel: 'Visual Intensity',
    compositionLabel: 'Composition',
    stylesLabel: 'Styles',

    // Buttons
    generateBtn: 'Generate Image',
    addBtn: 'Add Image',
    searchGallery: 'Search in gallery',

    // Status Messages
    statusPromptMissing: 'Please enter a prompt',
    statusModelMissing: 'Please select a model',
    statusGenerating: 'Generating image...',
    statusSuccess: 'Image generated successfully',
    statusError: 'An error occurred',

    // Model Loading
    modelLoading: 'Loading models...',
    modelLoadError: 'Failed to load models.',
    modelPlaceholder: 'Select a model...',

    // Balance
    balanceRemaining: 'pollen remaining.',
  }
};

class I18n {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = translations;
  }

  t(key) {
    const translation = this.translations[this.currentLanguage]?.[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation;
  }

  updatePageLanguage() {
    document.documentElement.lang = this.currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) element.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key) element.placeholder = this.t(key);
    });
    document.title = this.t('pageTitle');
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }
}

const i18n = new I18n();
