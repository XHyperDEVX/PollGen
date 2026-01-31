/**
 * Internationalization (i18n) System
 * Supports English (default) and German
 */

const translations = {
  en: {
    // Page
    pageTitle: 'PollGen',
    pageDescription: 'Create high-quality images with AI',

    // API Key
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter your Pollinations API key',
    apiKeyHint: 'Get your API key from <a href="https://pollinations.ai" target="_blank">Pollinations</a>',
    apiKeyStored: 'API key saved',
    apiKeyMissing: 'Please enter your API key',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Describe the image you want to generate',
    modelLabel: 'Model',
    aspectRatioLabel: 'Aspect Ratio',
    parametersLabel: 'Parameters',
    seedLabel: 'Seed',
    seedPlaceholder: 'Random',
    refinementLabel: 'Refinement',
    negativePromptLabel: 'Negative Prompt',
    negativePromptPlaceholder: 'What to exclude from the image',
    advancedLabel: 'Advanced Options',
    enhanceLabel: 'Enhance Prompt',
    privateLabel: 'Private Mode',
    nologoLabel: 'No Watermark',
    nofeedLabel: 'No Public Feed',
    safeLabel: 'Safety Filter',

    // Buttons
    generateBtn: 'Generate Image',

    // Common
    generatingLabel: 'Generating...',
    costLabel: 'Cost',
    pollenLabel: 'Pollen',

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
    balanceRemaining: 'pollen remaining',
    costsLabel: 'Costs: %s Pollen',
    deleteConfirm: 'Delete this image?',
    balancePermissionError: 'Please activate the balance permission for the API key',
    invalidApiKey: 'Please enter a valid API key.',
    keyValidFor: 'Key valid for ',
    hoursShort: 'h ',
    minutesShort: 'm',
    errorGeneration: 'Generation error',
  },
  de: {
    // Page
    pageTitle: 'PollGen',
    pageDescription: 'Erstellen Sie hochwertige Bilder mit KI',

    // API Key
    apiKeyLabel: 'API-Schlüssel',
    apiKeyPlaceholder: 'Geben Sie Ihren Pollinations-API-Schlüssel ein',
    apiKeyHint: 'Holen dir einen API-Schlüssel von <a href="https://pollinations.ai" target="_blank">Pollinations</a>',
    apiKeyStored: 'API-Schlüssel gespeichert',
    apiKeyMissing: 'Bitte geben Sie Ihren API-Schlüssel ein',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Beschreiben Sie das Bild, das Sie generieren möchten',
    modelLabel: 'Modell',
    aspectRatioLabel: 'Seitenverhältnis',
    parametersLabel: 'Parameter',
    seedLabel: 'Seed',
    seedPlaceholder: 'Zufällig',
    refinementLabel: 'Verfeinerung',
    negativePromptLabel: 'Negativer Prompt',
    negativePromptPlaceholder: 'Was aus dem Bild ausgeschlossen werden soll',
    advancedLabel: 'Erweiterte Optionen',
    enhanceLabel: 'Prompt verbessern',
    privateLabel: 'Privater Modus',
    nologoLabel: 'Kein Wasserzeichen',
    nofeedLabel: 'Kein öffentlicher Feed',
    safeLabel: 'Sicherheitsfilter',

    // Buttons
    generateBtn: 'Bild generieren',

    // Common
    generatingLabel: 'Generiere...',
    costLabel: 'Kosten',
    pollenLabel: 'Pollen',

    // Status Messages
    statusPromptMissing: 'Bitte geben Sie einen Prompt ein',
    statusModelMissing: 'Bitte wählen Sie ein Modell',
    statusGenerating: 'Bild wird generiert...',
    statusSuccess: 'Bild erfolgreich generiert',
    statusError: 'Ein Fehler ist aufgetreten',

    // Model Loading
    modelLoading: 'Modelle werden geladen...',
    modelLoadError: 'Fehler beim Laden der Modelle.',
    modelPlaceholder: 'Wählen Sie ein Modell...',

    // Balance
    balanceRemaining: 'Pollen verbleibend',
    costsLabel: 'Kostet: %s Pollen',
    deleteConfirm: 'Bild löschen?',
    balancePermissionError: 'Bitte aktiviere die Balance-Berechtigung für den API-Key',
    invalidApiKey: 'Bitte geben Sie einen gültigen API-Schlüssel ein.',
    keyValidFor: 'Key gültig für ',
    hoursShort: 'h ',
    minutesShort: 'm',
    errorGeneration: 'Generierungsfehler',
  }
};

class I18n {
  constructor() {
    this.currentLanguage = localStorage.getItem('pollgen_lang') || 'en';
    this.translations = translations;
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('pollgen_lang', lang);
      this.updatePageLanguage();
      // Trigger a custom event so app.js can respond if needed
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    }
  }

  t(key, replacement = null) {
    let translation = this.translations[this.currentLanguage]?.[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    if (replacement !== null) {
        translation = translation.replace('%s', replacement);
    }
    return translation;
  }

  updatePageLanguage() {
    document.documentElement.lang = this.currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
          if (key === 'apiKeyHint') {
              element.innerHTML = this.t(key);
          } else {
              element.textContent = this.t(key);
          }
      }
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
