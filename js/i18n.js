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
    videoPromptPlaceholder: 'Describe the video you want to generate',
    startScreenIntro: 'Describe your vision and bring it to life',
    uploadTooltip: 'Coming Soon!',
    modelLabel: 'Model',
    aspectRatioLabel: 'Aspect Ratio',
    imageModeLabel: 'Image',
    videoModeLabel: 'Video',
    durationLabel: 'Duration',
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
    generateVideoBtn: 'Generate Video',
    videoDownloadBtn: 'Download Video',

    // Common
    generatingLabel: 'Generating...',
    generatingVideoLabel: 'Generating video...',
    costLabel: 'Cost',
    pollenLabel: 'Pollen',

    // Status Messages
    statusPromptMissing: 'Please enter a prompt',
    statusModelMissing: 'Please select a model',
    statusGenerating: 'Generating image...',
    statusGeneratingVideo: 'Generating video...',
    statusSuccess: 'Image generated successfully',
    statusVideoSuccess: 'Video generated successfully',
    statusError: 'An error occurred',
    videoError: 'Failed to generate video',
    betaNotice: 'Video generation is in beta. Some models may ignore certain parameters.',

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
    paidOnlyLabel: 'Paid only',
    paidOnlyError: 'This model requires paid pollen',
    tokensPerMillion: '/million tokens',
    perImage: 'per image',
    perSecond: 'per second',

    // Parallel Mode
    parallelModeLabel: 'Parallel Generation',
    countLabel: '×',
    generatingProgress: 'Generating %d of %d...',
    parallelComplete: '%d completed, %d failed',
    parallelJobError: 'Job failed',
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
    videoPromptPlaceholder: 'Beschreiben Sie das Video, das Sie generieren möchten',
    startScreenIntro: 'Beschreiben Sie Ihre Vision und bringen Sie sie zum Leben',
    uploadTooltip: 'Bald verfügbar!',
    modelLabel: 'Modell',
    aspectRatioLabel: 'Seitenverhältnis',
    imageModeLabel: 'Bild',
    videoModeLabel: 'Video',
    durationLabel: 'Dauer',
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
    generateVideoBtn: 'Video generieren',
    videoDownloadBtn: 'Video herunterladen',

    // Common
    generatingLabel: 'Generiere...',
    generatingVideoLabel: 'Video wird generiert...',
    costLabel: 'Kosten',
    pollenLabel: 'Pollen',

    // Status Messages
    statusPromptMissing: 'Bitte geben Sie einen Prompt ein',
    statusModelMissing: 'Bitte wählen Sie ein Modell',
    statusGenerating: 'Bild wird generiert...',
    statusGeneratingVideo: 'Video wird generiert...',
    statusSuccess: 'Bild erfolgreich generiert',
    statusVideoSuccess: 'Video erfolgreich generiert',
    statusError: 'Ein Fehler ist aufgetreten',
    videoError: 'Fehler bei der Videogenerierung',
    betaNotice: 'Die Videogenerierung befindet sich in der Beta-Phase. Einige Modelle ignorieren möglicherweise bestimmte Parameter.',

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
    paidOnlyLabel: 'Paid only',
    paidOnlyError: 'Dieses Modell erfordert bezahltes Pollen',
    tokensPerMillion: '/Million Token',
    perImage: 'pro Bild',
    perSecond: 'pro Sekunde',

    // Parallel Mode
    parallelModeLabel: 'Parallele Generierung',
    countLabel: '×',
    generatingProgress: 'Generiere %d von %d...',
    parallelComplete: '%d abgeschlossen, %d fehlgeschlagen',
    parallelJobError: 'Aufgabe fehlgeschlagen',
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
      if (Array.isArray(replacement)) {
        replacement.forEach((r, i) => {
          translation = translation.replace(/%[sd]/, r);
        });
      } else {
        translation = translation.replace('%s', replacement);
      }
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
