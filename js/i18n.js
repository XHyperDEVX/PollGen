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

    // Login
    loginWithPollinations: 'Login with Pollinations',
    loggedIn: 'Logged in',
    loginPopupBlocked: 'Popup blocked. Please allow popups for this site.',
    orLabel: 'or',

    // Profile
    welcomeMessage: 'Hello %s!',
    profileSubtitle: 'What would you like to generate today?',
    funFactAccountAge: 'Fun fact: You created your Pollinations account %s ago',
    timeAgoMinute: '1 minute',
    timeAgoMinutes: '%s minutes',
    timeAgoHour: '1 hour',
    timeAgoHours: '%s hours',
    timeAgoDay: '1 day',
    timeAgoDays: '%s days',
    timeAgoWeek: '1 week',
    timeAgoWeeks: '%s weeks',
    timeAgoMonth: '1 month',
    timeAgoMonths: '%s months',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Describe the image you want to generate',
    videoPromptPlaceholder: 'Describe the video you want to generate',
    startScreenIntro: 'Describe your vision and bring it to life',
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
    img2imgSupported: 'Supports image-to-image generation',
    tokensPerMillion: '/million tokens',
    perImage: 'per image',
    perSecond: 'per second',

    // Premium Filter
    hidePremiumModelsLabel: 'Hide premium models',

    // Resolution Warning
    resolutionWarning: 'For optimal use, a resolution of at least 1080p is recommended.',
    // Parallel Mode
    parallelModeLabel: 'Parallel Generation',
    performanceModeLabel: 'Performance Mode',
    generateLabel: 'Generate',
    imagesLabel: 'Images',
    videosLabel: 'Videos',
    seedParallelPlaceholder: 'Always random in parallel mode',
    generatingProgress: 'Generating %d of %d...',
    parallelComplete: '%d completed, %d failed',
    parallelJobError: 'Job failed',

    // Context Menu
    downloadImage: 'Download Image',
    downloadVideo: 'Download Video',

    // Upload Messages
    uploadSuccess: 'Image uploaded successfully to Pollinations Media Server',
    uploadConsentTitle: 'External Upload',
    uploadConsentText: 'Maximum upload size is 10 MB. Your image will be stored permanently on Pollinations servers until you delete it. No pornography or violent content. Only legally permitted images (according to German, Swedish, and French law).\nOnly upload images you own the rights to.\n\n**Your image will be uploaded to the Pollinations Media Server and can be deleted at any time.**',
    uploadConsentConfirm: 'Confirm',
    uploadErrorNetwork: 'Upload service unavailable. Please try again later.',
    uploadErrorServer: 'Upload failed. The service may be temporarily unavailable.',
    uploadErrorFileSize: 'File too large. Please choose a smaller image.',
    uploadErrorFileType: 'Invalid file type. Please upload an image file.',
    uploadErrorGeneric: 'Upload failed. Please try again.',
    uploadErrorAuth: 'Upload requires a valid API key.',
    uploadDeleteSuccess: 'Image deleted from Pollinations Media Server',
    img2imgNotSupported: 'Image-to-image is not supported for the selected model. Please select a model that supports image input.',
  },
  de: {
    // Page
    pageTitle: 'PollGen',
    pageDescription: 'Erstelle hochwertige Bilder mit KI',

    // API Key
    apiKeyLabel: 'API-Schlüssel',
    apiKeyPlaceholder: 'Gib deinen Pollinations-API-Schlüssel ein',
    apiKeyHint: 'Hol dir einen API-Schlüssel von <a href="https://pollinations.ai" target="_blank">Pollinations</a>',
    apiKeyStored: 'API-Schlüssel gespeichert',
    apiKeyMissing: 'Bitte gib deinen API-Schlüssel ein',

    // Login
    loginWithPollinations: 'Mit Pollinations anmelden',
    loggedIn: 'Angemeldet',
    loginPopupBlocked: 'Popup blockiert. Bitte erlaube Popups für diese Seite.',
    orLabel: 'oder',

    // Profile
    welcomeMessage: 'Hallo %s!',
    profileSubtitle: 'Was möchtest du heute generieren?',
    funFactAccountAge: 'Fun Fact: Du hast deinen Pollinations-Account vor %s erstellt',
    timeAgoMinute: '1 Minute',
    timeAgoMinutes: '%s Minuten',
    timeAgoHour: '1 Stunde',
    timeAgoHours: '%s Stunden',
    timeAgoDay: '1 Tag',
    timeAgoDays: '%s Tagen',
    timeAgoWeek: '1 Woche',
    timeAgoWeeks: '%s Wochen',
    timeAgoMonth: '1 Monat',
    timeAgoMonths: '%s Monaten',

    // Form Fields
    promptLabel: 'Prompt',
    promptPlaceholder: 'Beschreibe das Bild, das du generieren möchtest',
    videoPromptPlaceholder: 'Beschreibe das Video, das du generieren möchtest',
    startScreenIntro: 'Beschreibe deine Vision und bring sie zum Leben',
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
    statusPromptMissing: 'Bitte gib einen Prompt ein',
    statusModelMissing: 'Bitte wähle ein Modell',
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
    modelPlaceholder: 'Wähle ein Modell...',

    // Balance
    balanceRemaining: 'Pollen verbleibend',
    costsLabel: 'Kostet: %s Pollen',
    deleteConfirm: 'Bild löschen?',
    balancePermissionError: 'Bitte aktiviere die Balance-Berechtigung für den API-Key',
    invalidApiKey: 'Bitte gib einen gültigen API-Schlüssel ein.',
    keyValidFor: 'Key gültig für ',
    hoursShort: 'h ',
    minutesShort: 'm',
    errorGeneration: 'Generierungsfehler',
    paidOnlyLabel: 'Paid only',
    paidOnlyError: 'Dieses Modell erfordert bezahltes Pollen',
    img2imgSupported: 'Unterstützt Bild-zu-Bild-Generierung',
    tokensPerMillion: '/Million Token',
    perImage: 'pro Bild',
    perSecond: 'pro Sekunde',

    // Premium Filter
    hidePremiumModelsLabel: 'Premium-Modelle ausblenden',

    // Resolution Warning
    resolutionWarning: 'Für die optimale Nutzung wird eine Auflösung von mindestens 1080p empfohlen.',
    // Parallel Mode
    parallelModeLabel: 'Parallele Generierung',
    performanceModeLabel: 'Performance-Modus',
    generateLabel: 'Generiere',
    imagesLabel: 'Bilder',
    videosLabel: 'Videos',
    seedParallelPlaceholder: 'Immer zufällig im Parallelmodus',
    generatingProgress: 'Generiere %d von %d...',
    parallelComplete: '%d abgeschlossen, %d fehlgeschlagen',
    parallelJobError: 'Aufgabe fehlgeschlagen',

    // Context Menu
    downloadImage: 'Bild herunterladen',
    downloadVideo: 'Video herunterladen',

    // Upload Messages
    uploadSuccess: 'Bild erfolgreich auf Pollinations Media Server hochgeladen',
    uploadConsentTitle: 'Externer Upload',
    uploadConsentText: 'Maximale Uploadgröße: 10 MB. Ihr Bild wird dauerhaft auf den Pollinations-Servern gespeichert, bis Sie es löschen. Keine pornografischen oder gewalttätigen Inhalte. Nur gesetzlich zulässige Bilder (nach deutschem, schwedischem und französischem Recht).\nLaden Sie nur Bilder hoch, deren Rechte Sie besitzen.\n\n**Ihr Bild wird auf den Pollinations Media Server hochgeladen und kann jederzeit gelöscht werden.**',
    uploadConsentConfirm: 'Bestätigen',
    uploadErrorNetwork: 'Upload-Dienst nicht verfügbar. Bitte versuchen Sie es später erneut.',
    uploadErrorServer: 'Upload fehlgeschlagen. Der Dienst ist möglicherweise vorübergehend nicht verfügbar.',
    uploadErrorFileSize: 'Datei zu groß. Bitte wählen Sie ein kleineres Bild.',
    uploadErrorFileType: 'Ungültiger Dateityp. Bitte laden Sie eine Bilddatei hoch.',
    uploadErrorGeneric: 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.',
    uploadErrorAuth: 'Upload erfordert einen gültigen API-Schlüssel.',
    uploadDeleteSuccess: 'Bild von Pollinations Media Server gelöscht',
    img2imgNotSupported: 'Bild-zu-Bild wird für das ausgewählte Modell nicht unterstützt. Bitte wählen Sie ein Modell, das Bildeingabe unterstützt.',
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
