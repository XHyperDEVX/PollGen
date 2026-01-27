/**
 * Internationalization (i18n) System
 * Supports English (default) and German
 */

const translations = {
  en: {
    // Page
    pageTitle: 'PollGen',

    // Sidebar Sections
    generalSettings: 'General Settings',
    contentType: 'Content Type',
    visualIntensity: 'Visual Intensity',
    composition: 'Composition',
    styles: 'Styles',

    // Labels
    modelLabel: 'Model',
    aspectRatioLabel: 'Aspect Ratio',
    selectModel: 'Select model...',

    // Aspect Ratios
    ultraWide: 'Ultra-wide (21:9)',
    widescreen: 'Widescreen (16:9)',
    classic: 'Classic (5:4)',
    landscape: 'Landscape (4:3)',
    wide: 'Wide (3:2)',
    square: 'Square (1:1)',
    standard: 'Standard (4:5)',
    portrait: 'Portrait (3:4)',
    tall: 'Tall (2:3)',
    vertical: 'Vertical (9:16)',

    // Content Types
    photo: 'Photo',
    art: 'Art',
    auto: 'Auto',

    // Upload & Gallery
    addImage: 'Add Image',
    searchGallery: 'Search in gallery',

    // Main Canvas
    generateImagesNow: 'Generate Images Now',
    emptyStateText: 'Describe your desired image in the prompt field. Get inspired by the gallery or',
    learnMore: 'learn more about prompting',

    // Prompt Bar
    promptLabel: 'Prompt',
    promptPlaceholder: 'Describe the image you want to generate',
    generateImage: 'Generate Image',

    // Status Messages
    apiKeyStored: 'API key saved',
    apiKeyMissing: 'Please enter your API key',
    promptMissing: 'Please enter a prompt',
    modelMissing: 'Please select a model',
    generatingImage: 'Generating image...',
    generationSuccess: 'Image generated successfully',
    generationError: 'An error occurred during generation',
    modelLoading: 'Loading models...',
    modelLoadError: 'Failed to load models',

    // Balance
    balanceRemaining: 'pollen remaining',

    // Utility
    download: 'Download',
    fullscreen: 'Fullscreen',
    close: 'Close'
  },

  de: {
    // Page
    pageTitle: 'PollGen',

    // Sidebar Sections
    generalSettings: 'Allgemeine Einstellungen',
    contentType: 'Inhaltstyp',
    visualIntensity: 'Visuelle Intensität',
    composition: 'Komposition',
    styles: 'Stile',

    // Labels
    modelLabel: 'Modell',
    aspectRatioLabel: 'Seitenverhältnis',
    selectModel: 'Modell auswählen...',

    // Aspect Ratios
    ultraWide: 'Ultrabreit (21:9)',
    widescreen: 'Breitbild (16:9)',
    classic: 'Klassisch (5:4)',
    landscape: 'Querformat (4:3)',
    wide: 'Breit (3:2)',
    square: 'Quadratisch (1:1)',
    standard: 'Standard (4:5)',
    portrait: 'Hochformat (3:4)',
    tall: 'Hoch (2:3)',
    vertical: 'Vertikal (9:16)',

    // Content Types
    photo: 'Foto',
    art: 'Kunst',
    auto: 'Auto',

    // Upload & Gallery
    addImage: 'Bild hinzufügen',
    searchGallery: 'In Galerie suchen',

    // Main Canvas
    generateImagesNow: 'Jetzt Bilder generieren',
    emptyStateText: 'Beschreiben Sie Ihr gewünschtes Bild im Prompt-Feld. Lassen Sie sich von der Galerie inspirieren oder',
    learnMore: 'erfahren Sie mehr über Prompts',

    // Prompt Bar
    promptLabel: 'Prompt',
    promptPlaceholder: 'Beschreiben Sie das Bild, das Sie generieren möchten',
    generateImage: 'Bild generieren',

    // Status Messages
    apiKeyStored: 'API-Schlüssel gespeichert',
    apiKeyMissing: 'Bitte geben Sie Ihren API-Schlüssel ein',
    promptMissing: 'Bitte geben Sie einen Prompt ein',
    modelMissing: 'Bitte wählen Sie ein Modell',
    generatingImage: 'Bild wird generiert...',
    generationSuccess: 'Bild erfolgreich generiert',
    generationError: 'Ein Fehler ist aufgetreten',
    modelLoading: 'Modelle werden geladen...',
    modelLoadError: 'Fehler beim Laden der Modelle',

    // Balance
    balanceRemaining: 'Pollen verbleibend',

    // Utility
    download: 'Herunterladen',
    fullscreen: 'Vollbild',
    close: 'Schließen'
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
