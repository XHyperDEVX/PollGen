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
    apiKeyHint: 'Get your free API key from',
    apiKeyStored: 'API key saved',
    apiKeyMissing: 'Please enter your API key',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Describe the image you want to generate...',
    formatLabel: 'Format',
    advancedOptions: 'Advanced Options',
    selectFormat: 'Select format...',
    customFormat: 'Custom',
    widthLabel: 'Width (px)',
    heightLabel: 'Height (px)',
    modelLabel: 'Model',

    // Image Format Presets
    formatUltrabreit: 'Ultrabreit (21:9) - 2394 × 1026 px',
    formatBreitbild: 'Breitbild (16:9) - 1824 × 1026 px',
    formatKlassisch: 'Klassisch (5:4) - 1280 × 1024 px',
    formatQuerformat: 'Querformat (4:3) - 1366 × 1025 px',
    formatBreit: 'Breit (3:2) - 1536 × 1024 px',
    formatQuadratisch: 'Quadratisch (1:1) - 1024 × 1024 px',
    formatStandard: 'Standard (4:5) - 1024 × 1280 px',
    formatHochformat: 'Hochformat (3:4) - 1025 × 1366 px',
    formatHoch: 'Hoch (2:3) - 1024 × 1536 px',
    formatVertikal: 'Vertikal (9:16) - 1026 × 1824 px',

    // Advanced Options Fields
    seedLabel: 'Seed',
    seedHint: '0 = random',
    qualityLabel: 'Quality',
    qualityLow: 'Low',
    qualityMedium: 'Medium',
    qualityHigh: 'High',
    qualityHD: 'HD',
    guidanceScaleLabel: 'Guidance Scale',
    guidanceLabel: 'Guidance Scale',
    guidanceHint: 'Determines how closely the result follows the description (1 = free, 20 = strict)',
    negativePromptLabel: 'Negative Prompt',
    negativePromptPlaceholder: 'What to avoid in the image...',
    negativePromptHint: 'Optional: Describe what you don\'t want in the image',
    enhanceLabel: 'Enhance',
    enhanceDesc: 'Let AI optimize the prompt for better results',
    privateLabel: 'Private',
    privateDesc: 'Hide image from public feeds',
    noLogoLabel: 'No Logo',
    nologoLabel: 'No Logo',
    nologoDesc: 'Remove the Pollinations watermark',
    noFeedLabel: 'No Feed',
    nofeedLabel: 'No Feed',
    nofeedDesc: 'Prevent sharing in the public feed',
    safeLabel: 'Safe',
    safeDesc: 'Enable safety content filters',
    transparentLabel: 'Transparent',
    transparentDesc: 'Create transparent background (if supported)',

    // Buttons
    generateButton: 'Generate Image',
    generateBtn: 'Generate Image',
    downloadButton: 'Download',
    downloadBtn: 'Download Image',
    copyLinkButton: 'Copy Link',
    generateNewButton: 'Generate New',
    resetBtn: 'Reset Form',
    optionsLabel: 'Advanced Options',
    imageHistoryTitle: 'Image History',

    // Status Messages
    statusPromptMissing: 'Please enter a prompt',
    statusModelMissing: 'Please select a model',
    statusDimensionsMissing: 'Please set dimensions',
    statusGenerating: 'Generating image...',
    statusSuccess: 'Image generated successfully',
    statusError: 'An error occurred',

    // Model Loading
    modelLoading: 'Loading models...',
    modelLoadError: 'Failed to load models. Using cached data.',
    modelPlaceholder: 'Select a model...',

    // API Key
    apiKeyStored: 'API key saved',

    // Generation
    placeholderGenerating: 'Please wait, generating image...',
    placeholderText: 'Your generated image will appear here',
    errorGeneration: 'Image generation failed',

    // Balance
    balanceRemaining: 'pollen remaining.',

    // Validation
    noInternetConnection: 'No internet connection. Please connect and try again.',
    invalidDomain: 'This domain does not appear to be a valid instance.',

    // Preview
    previewPlaceholder: 'Your generated image will appear here'
  },

  de: {
    // Page
    pageTitle: 'PollGen',
    pageDescription: 'Erstellen Sie hochwertige Bilder mit KI',

    // API Key
    apiKeyLabel: 'API-Schlüssel',
    apiKeyPlaceholder: 'Geben Sie Ihren Pollinations-API-Schlüssel ein',
    apiKeyHint: 'Holen Sie sich Ihren kostenlosen API-Schlüssel von',
    apiKeyStored: 'API-Schlüssel gespeichert',
    apiKeyMissing: 'Bitte geben Sie Ihren API-Schlüssel ein',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Beschreiben Sie das Bild, das Sie generieren möchten...',
    formatLabel: 'Format',
    advancedOptions: 'Erweiterte Optionen',
    selectFormat: 'Format auswählen...',
    customFormat: 'Benutzerdefiniert',
    widthLabel: 'Breite (px)',
    heightLabel: 'Höhe (px)',
    modelLabel: 'Modell',

    // Image Format Presets
    formatUltrabreit: 'Ultrabreit (21:9) - 2394 × 1026 px',
    formatBreitbild: 'Breitbild (16:9) - 1824 × 1026 px',
    formatKlassisch: 'Klassisch (5:4) - 1280 × 1024 px',
    formatQuerformat: 'Querformat (4:3) - 1366 × 1025 px',
    formatBreit: 'Breit (3:2) - 1536 × 1024 px',
    formatQuadratisch: 'Quadratisch (1:1) - 1024 × 1024 px',
    formatStandard: 'Standard (4:5) - 1024 × 1280 px',
    formatHochformat: 'Hochformat (3:4) - 1025 × 1366 px',
    formatHoch: 'Hoch (2:3) - 1024 × 1536 px',
    formatVertikal: 'Vertikal (9:16) - 1026 × 1824 px',

    // Advanced Options Fields
    seedLabel: 'Seed',
    seedHint: '0 = zufällig',
    qualityLabel: 'Qualität',
    qualityLow: 'Niedrig',
    qualityMedium: 'Mittel',
    qualityHigh: 'Hoch',
    qualityHD: 'HD',
    guidanceScaleLabel: 'Leitfaden-Skalierung',
    guidanceLabel: 'Leitfaden-Skalierung',
    guidanceHint: 'Bestimmt, wie genau das Ergebnis der Beschreibung folgt (1 = frei, 20 = strikt)',
    negativePromptLabel: 'Negativer Prompt',
    negativePromptPlaceholder: 'Was im Bild vermieden werden soll...',
    negativePromptHint: 'Optional: Beschreibe, was du nicht im Bild haben möchtest',
    enhanceLabel: 'Verbessern',
    enhanceDesc: 'Lass die KI den Prompt für bessere Ergebnisse optimieren',
    privateLabel: 'Privat',
    privateDesc: 'Bild aus öffentlichen Feeds ausblenden',
    noLogoLabel: 'Kein Logo',
    nologoLabel: 'Kein Logo',
    nologoDesc: 'Entferne das Pollinations Wasserzeichen',
    noFeedLabel: 'Kein Feed',
    nofeedLabel: 'Kein Feed',
    nofeedDesc: 'Verhindere das Teilen im öffentlichen Feed',
    safeLabel: 'Sicher',
    safeDesc: 'Aktiviere Sicherheits-Inhaltsfilter',
    transparentLabel: 'Transparent',
    transparentDesc: 'Erstelle transparenten Hintergrund (falls unterstützt)',

    // Buttons
    generateButton: 'Bild generieren',
    generateBtn: 'Bild generieren',
    downloadButton: 'Herunterladen',
    downloadBtn: 'Bild herunterladen',
    copyLinkButton: 'Link kopieren',
    generateNewButton: 'Neues generieren',
    resetBtn: 'Formular zurücksetzen',
    optionsLabel: 'Erweiterte Optionen',
    imageHistoryTitle: 'Bildhistorie',

    // Status Messages
    statusPromptMissing: 'Bitte geben Sie einen Prompt ein',
    statusModelMissing: 'Bitte wählen Sie ein Modell',
    statusDimensionsMissing: 'Bitte stellen Sie die Abmessungen ein',
    statusGenerating: 'Bild wird generiert...',
    statusSuccess: 'Bild erfolgreich generiert',
    statusError: 'Ein Fehler ist aufgetreten',

    // Model Loading
    modelLoading: 'Lade Modelle...',
    modelLoadError: 'Fehler beim Laden der Modelle. Verwende gecachte Daten.',
    modelPlaceholder: 'Wähle ein Modell...',

    // API Key
    apiKeyStored: 'API-Schlüssel gespeichert',

    // Generation
    placeholderGenerating: 'Bitte warten, Bild wird erstellt...',
    placeholderText: 'Ihr generiertes Bild wird hier angezeigt',
    errorGeneration: 'Bildgenerierung fehlgeschlagen',

    // Balance
    balanceRemaining: 'Pollen verbleibend.',

    // Validation
    noInternetConnection: 'Keine Internetverbindung. Bitte verbinden Sie sich und versuchen Sie es erneut.',
    invalidDomain: 'Diese Domain scheint keine gültige Instanz zu sein.',

    // Preview
    previewPlaceholder: 'Ihr generiertes Bild wird hier angezeigt'
  }
};

class I18n {
  constructor() {
    this.currentLanguage = this.loadLanguage();
    this.translations = translations;
  }

  loadLanguage() {
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'en' || saved === 'de')) {
      return saved;
    }
    // Default to English
    return 'en';
  }

  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'de') {
      console.error('Unsupported language:', lang);
      return;
    }
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
    this.updatePageLanguage();
  }

  t(key) {
    const translation = this.translations[this.currentLanguage]?.[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key} in language: ${this.currentLanguage}`);
      return key;
    }
    return translation;
  }

  updatePageLanguage() {
    // Update document language
    document.documentElement.lang = this.currentLanguage;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        element.textContent = this.t(key);
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key) {
        element.placeholder = this.t(key);
      }
    });

    // Update page title
    document.title = this.t('pageTitle');

    // Trigger custom event for components that need to update
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: this.currentLanguage } }));
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }
}

// Export i18n instance
const i18n = new I18n();