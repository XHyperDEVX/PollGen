/**
 * Internationalization (i18n) System
 * Supports English (default) and German
 */

const translations = {
  en: {
    // Header
    pageTitle: 'PollGen',
    pageDescription: 'Create high-quality images with dynamic models and custom parameters.',
    
    // Language
    language: 'Language',
    
    // API Key Section
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter your Pollinations API key',
    apiKeyRequired: 'Required',
    apiKeyHint: 'Get your free API key from ',
    apiKeyLink: 'pollinations.ai',
    apiKeyStored: 'API key stored locally for this session',
    apiKeyMissing: 'Please enter an API key',
    
    // Prompt Section
    promptLabel: 'Image Description',
    promptPlaceholder: 'Describe your desired image in detail...',
    promptRequired: 'Required',
    
    // Model Section
    modelLabel: 'Model',
    modelPlaceholder: 'Select a model...',
    modelLoading: 'Loading models...',
    modelLoadSuccess: 'Models loaded successfully',
    modelLoadError: 'Failed to load models. Using cached data.',
    modelCached: 'Using cached models',
    
    // Dimensions & Options
    widthLabel: 'Width (px)',
    heightLabel: 'Height (px)',
    seedLabel: 'Seed',
    seedHint: '0 = random',
    qualityLabel: 'Quality',
    qualityLow: 'Low',
    qualityMedium: 'Medium',
    qualityHigh: 'High',
    qualityHD: 'HD',
    aspectRatioLabel: 'Aspect Ratio',
    aspectCustom: 'Custom',
    aspectUltrawide: 'Ultrawide (21:9)',
    aspectWidescreen: 'Widescreen (16:9)',
    aspectClassic: 'Classic (5:4)',
    aspectLandscape: 'Landscape (4:3)',
    aspectWide: 'Wide (3:2)',
    aspectSquare: 'Square (1:1)',
    aspectPortrait: 'Portrait (4:5)',
    aspectStandard: 'Standard (3:4)',
    aspectTall: 'Tall (2:3)',
    aspectVertical: 'Vertical (9:16)',
    // Aspect Ratio Dimensions
    aspectUltrawideDims: '4788 × 2052 px',
    aspectWidescreenDims: '3648 × 2052 px',
    aspectClassicDims: '2560 × 2048 px',
    aspectLandscapeDims: '2732 × 2049 px',
    aspectWideDims: '3072 × 2048 px',
    aspectSquareDims: '2048 × 2048 px',
    aspectPortraitDims: '2048 × 2560 px',
    aspectStandardDims: '2049 × 2732 px',
    aspectTallDims: '2048 × 3072 px',
    aspectVerticalDims: '2052 × 3648 px',
    
    // Guidance Scale
    guidanceLabel: 'Guidance Scale',
    guidanceHint: 'Determines how closely the result follows the description (1 = free, 20 = strict)',
    
    // Negative Prompt
    negativePromptLabel: 'Negative Prompt',
    negativePromptPlaceholder: 'What to avoid in the image...',
    negativePromptHint: 'Optional: Describe what you don\'t want in the image',
    
    // Advanced Options
    optionsLabel: 'Advanced Options',
    enhanceLabel: 'Enhance',
    enhanceDesc: 'Let AI optimize the prompt for better results',
    privateLabel: 'Private',
    privateDesc: 'Hide image from public feeds',
    nologoLabel: 'No Logo',
    nologoDesc: 'Remove the Pollinations watermark',
    nofeedLabel: 'No Feed',
    nofeedDesc: 'Prevent sharing in the public feed',
    safeLabel: 'Safe',
    safeDesc: 'Enable safety content filters',
    transparentLabel: 'Transparent',
    transparentDesc: 'Create transparent background (if supported)',
    
    // Buttons
    generateBtn: 'Generate Image',
    resetBtn: 'Reset Form',
    downloadBtn: 'Download Image',
    openSourceBtn: 'Open Source Link',
    
    // Status Messages
    statusGenerating: 'Generating image...',
    statusSuccess: 'Image generated successfully!',
    statusError: 'An error occurred',
    statusReset: 'Form reset',
    statusPromptMissing: 'Please enter an image description',
    statusModelMissing: 'Please select a model',
    statusDimensionsMissing: 'Please specify width and height',
    
    // Placeholder
    placeholderText: 'Your generated images will appear here',
    placeholderGenerating: 'Please wait, generating image...',
    
    // Errors
    errorGeneration: 'Image generation failed',
    errorApiKey: 'API key could not be loaded',
    errorModels: 'Failed to load models',
    errorNetwork: 'Network error occurred',
    
    // Model Pricing
    pricePerImage: 'per image',
    pricePerMillion: 'per million tokens',
    
    // Balance Display
    balanceRemaining: 'pollen remaining.',

    // Image History
    imageHistoryTitle: 'Image History'
  },
  
  de: {
    // Header
    pageTitle: 'PollGen',
    pageDescription: 'Erstelle hochwertige Bilder mit dynamischen Modellen und benutzerdefinierten Parametern.',
    
    // Language
    language: 'Sprache',
    
    // API Key Section
    apiKeyLabel: 'API-Schlüssel',
    apiKeyPlaceholder: 'Gib deinen Pollinations API-Schlüssel ein',
    apiKeyRequired: 'Erforderlich',
    apiKeyHint: 'Hol dir deinen kostenlosen API-Schlüssel von ',
    apiKeyLink: 'pollinations.ai',
    apiKeyStored: 'API-Schlüssel lokal für diese Sitzung gespeichert',
    apiKeyMissing: 'Bitte gib einen API-Schlüssel ein',
    
    // Prompt Section
    promptLabel: 'Bildbeschreibung',
    promptPlaceholder: 'Beschreibe dein gewünschtes Bild im Detail...',
    promptRequired: 'Erforderlich',
    
    // Model Section
    modelLabel: 'Modell',
    modelPlaceholder: 'Wähle ein Modell...',
    modelLoading: 'Lade Modelle...',
    modelLoadSuccess: 'Modelle erfolgreich geladen',
    modelLoadError: 'Fehler beim Laden der Modelle. Verwende gecachte Daten.',
    modelCached: 'Verwende gecachte Modelle',
    
    // Dimensions & Options
    widthLabel: 'Breite (px)',
    heightLabel: 'Höhe (px)',
    seedLabel: 'Seed',
    seedHint: '0 = zufällig',
    qualityLabel: 'Qualität',
    qualityLow: 'Niedrig',
    qualityMedium: 'Mittel',
    qualityHigh: 'Hoch',
    qualityHD: 'HD',
    aspectRatioLabel: 'Seitenverhältnis',
    aspectCustom: 'Benutzerdefiniert',
    aspectUltrawide: 'Ultrabreit (21:9)',
    aspectWidescreen: 'Breitbild (16:9)',
    aspectClassic: 'Klassisch (5:4)',
    aspectLandscape: 'Querformat (4:3)',
    aspectWide: 'Breit (3:2)',
    aspectSquare: 'Quadratisch (1:1)',
    aspectPortrait: 'Standard (4:5)',
    aspectStandard: 'Hochformat (3:4)',
    aspectTall: 'Hoch (2:3)',
    aspectVertical: 'Vertikal (9:16)',
    // Aspect Ratio Dimensions
    aspectUltrawideDims: '4788 × 2052 px',
    aspectWidescreenDims: '3648 × 2052 px',
    aspectClassicDims: '2560 × 2048 px',
    aspectLandscapeDims: '2732 × 2049 px',
    aspectWideDims: '3072 × 2048 px',
    aspectSquareDims: '2048 × 2048 px',
    aspectPortraitDims: '2048 × 2560 px',
    aspectStandardDims: '2049 × 2732 px',
    aspectTallDims: '2048 × 3072 px',
    aspectVerticalDims: '2052 × 3648 px',
    
    // Guidance Scale
    guidanceLabel: 'Guidance Scale',
    guidanceHint: 'Bestimmt, wie genau das Ergebnis der Beschreibung folgt (1 = frei, 20 = strikt)',
    
    // Negative Prompt
    negativePromptLabel: 'Negativer Prompt',
    negativePromptPlaceholder: 'Was im Bild vermieden werden soll...',
    negativePromptHint: 'Optional: Beschreibe, was du nicht im Bild haben möchtest',
    
    // Advanced Options
    optionsLabel: 'Erweiterte Optionen',
    enhanceLabel: 'Verbessern',
    enhanceDesc: 'Lass die KI den Prompt für bessere Ergebnisse optimieren',
    privateLabel: 'Privat',
    privateDesc: 'Bild aus öffentlichen Feeds ausblenden',
    nologoLabel: 'Kein Logo',
    nologoDesc: 'Entferne das Pollinations Wasserzeichen',
    nofeedLabel: 'Kein Feed',
    nofeedDesc: 'Verhindere das Teilen im öffentlichen Feed',
    safeLabel: 'Sicher',
    safeDesc: 'Aktiviere Sicherheits-Inhaltsfilter',
    transparentLabel: 'Transparent',
    transparentDesc: 'Erstelle transparenten Hintergrund (falls unterstützt)',
    
    // Buttons
    generateBtn: 'Bild generieren',
    resetBtn: 'Formular zurücksetzen',
    downloadBtn: 'Bild herunterladen',
    openSourceBtn: 'Quell-Link öffnen',
    
    // Status Messages
    statusGenerating: 'Generiere Bild...',
    statusSuccess: 'Bild erfolgreich generiert!',
    statusError: 'Ein Fehler ist aufgetreten',
    statusReset: 'Formular zurückgesetzt',
    statusPromptMissing: 'Bitte gib eine Bildbeschreibung ein',
    statusModelMissing: 'Bitte wähle ein Modell aus',
    statusDimensionsMissing: 'Bitte gib Breite und Höhe an',
    
    // Placeholder
    placeholderText: 'Deine generierten Bilder erscheinen hier',
    placeholderGenerating: 'Bitte warten, Bild wird erstellt...',
    
    // Errors
    errorGeneration: 'Bildgenerierung fehlgeschlagen',
    errorApiKey: 'API-Schlüssel konnte nicht geladen werden',
    errorModels: 'Fehler beim Laden der Modelle',
    errorNetwork: 'Netzwerkfehler aufgetreten',
    
    // Model Pricing
    pricePerImage: 'pro Bild',
    pricePerMillion: 'pro Million Tokens',
    
    // Balance Display
    balanceRemaining: 'Pollen verbleibend.',

    // Image History
    imageHistoryTitle: 'Bildhistorie'
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
        // Check if this is an option element with dimensions
        if (element.tagName === 'OPTION' && element.hasAttribute('data-i18n-dims')) {
          const dimsKey = element.getAttribute('data-i18n-dims');
          element.textContent = `${this.t(key)} - ${this.t(dimsKey)}`;
        } else {
          element.textContent = this.t(key);
        }
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
