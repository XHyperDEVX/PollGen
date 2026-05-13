/**
 * Internationalization (i18n) System
 * Supports English (default) and German
 */

const translations = {
  en: {
    // Meta
    pageTitle: 'PollGen',

    // Authentication & account
    apiKeyPlaceholder: 'API key (managed by Pollinations login)',
    apiKeyHint: 'Get your API key from <a href="https://pollinations.ai" target="_blank">Pollinations</a>',
    apiKeyStored: 'API key saved',
    apiKeyMissing: 'Please log in with Pollinations',
    invalidApiKey: 'Please enter a valid API key.',
    loginWithPollinations: 'Login with Pollinations',
    loggedIn: 'Logged in',
    logoutLabel: 'Logout',
    welcomePopupTitle: 'Welcome to Pollgen',
    welcomePopupText: 'Create AI images and videos with Pollinations. Please log in to continue.',
    copyApiKeySuccess: 'API key copied',
    copyApiKeyError: 'Could not copy API key',
    closeLabel: 'Close',

    // Balance & key lifetime
    balanceRemaining: 'pollen remaining',
    balanceUnlimited: 'Unlimited pollen budget',
    balanceUnavailable: 'Pollen budget unavailable',
    balanceAccountTotalLabel: 'total',
    keyValidFor: 'Key valid for ',
    daysShort: 'd ',
    hoursShort: 'h ',
    minutesShort: 'm',

    // Profile
    welcomeMessage: 'Hello %s!',
    profileSubtitle: 'What would you like to generate today?',
    funFactAccountAge: 'Fun fact: You created your Pollinations Account %s ago',
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

    // Generation controls
    promptPlaceholder: 'Describe the image you want to generate',
    videoPromptPlaceholder: 'Describe the video you want to generate',
    startScreenTitle: 'Generate Images Now',
    startScreenIntro: 'Describe your vision and bring it to life',
    modelLabel: 'Model',
    modelPlaceholder: 'Select a model...',
    aspectRatioLabel: 'Aspect Ratio',
    imageModeLabel: 'Image',
    videoModeLabel: 'Video',
    modeUnavailableHint: 'No selectable models available in this mode',
    durationLabel: 'Duration',
    seedLabel: 'Seed',
    seedPlaceholder: 'Random',
    refinementLabel: 'Refinement',
    negativePromptLabel: 'Negative Prompt',
    negativePromptPlaceholder: 'What to exclude from the image',
    advancedLabel: 'Advanced Options',
    parallelModeLabel: 'Parallel Generation',
    transparentBackgroundLabel: 'Transparent Background',
    gptModelsOnlyTooltip: 'gpt models only.',
    performanceModeLabel: 'Performance Mode',
    enhanceLabel: 'Enhance Prompt',
    privateLabel: 'Private Mode',
    nologoLabel: 'No Watermark',
    nofeedLabel: 'No Public Feed',
    safeLabel: 'Safety Filter',
    showPremiumModelsLabel: 'Also show premium models',
    modelLoading: 'Loading models...',
    modelLoadError: 'Failed to load models.',

    // Cost panel
    costLabel: 'Cost',
    pollenLabel: 'Pollen',
    costMetaNoModel: 'No model selected',
    costMetaImage: 'Estimated total per image',
    costMetaVideo: 'Estimated total for %ss video',
    costMetaParallel: 'Estimated total for %d %s',
    costBreakdownNoModel: 'Select a model to estimate cost',
    costBreakdownFree: 'Free generation',
    perImage: 'per image',
    perSecond: 'per second',
    tokensPerMillion: '/million tokens',

    // Generate button & parallel flow
    generateLabel: 'Generate',
    imagesLabel: 'Images',
    videosLabel: 'Videos',
    generateBtn: 'Generate Image',
    generateVideoBtn: 'Generate Video',
    videoDownloadBtn: 'Download Video',
    generateBatchBtn: 'Generate %d %s',
    queueAddLabel: 'Add to queue',
    generateReady: 'Ready to generate',
    generateStateMissingKey: 'Add a valid API key',
    generateStateNoModels: 'No available models in this mode',
    generateStateAddPrompt: 'Add a prompt to enable generation',
    queueStatus: '%d active • %d queued',
    parallelReady: 'Parallel mode: %d %s per click',
    seedParallelPlaceholder: 'Always random in parallel mode',
    generatingLabel: 'Generating...',
    generatingVideoLabel: 'Generating video...',
    parallelComplete: '%d completed, %d failed',
    clearHistoryBtn: 'Clear history',

    // Status & errors
    statusPromptMissing: 'Please enter a prompt',
    statusModelMissing: 'Please select a model',
    statusError: 'An error occurred',
    videoError: 'Failed to generate video',
    errorGeneration: 'Generation error',
    historyCleared: 'Generation history cleared',
    paidOnlyLabel: 'Paid only',
    paidOnlyError: 'This model requires paid pollen',
    img2imgSupported: 'Supports image-to-image generation',

    // UI misc
    betaNotice: 'Video generation is in beta. Some models may ignore certain parameters.',
    resolutionWarning: 'For optimal use, a resolution of at least 1080p is recommended.',

    // Context menu & clipboard
    downloadImage: 'Download Image',
    downloadVideo: 'Download Video',
    copyImage: 'Copy Image',
    copySuccess: 'Copied to clipboard',
    copyError: 'Failed to copy',
    useAsReferenceImage: 'Use as reference image',

    // Timer overlay
    timerModelLabel: 'Model',
    timerTimeLabel: 'Time',
    timerCostLabel: 'Cost',

    // Upload
    uploadSuccess: 'Image uploaded successfully',
    uploadDeleteSuccess: 'Uploaded image deleted',
    uploadConsentTitle: 'External Upload',
    uploadConsentText: 'The maximum upload size is 10 MB. All images are stored on the Pollinations Media Server for 30 days. Please ensure that your uploads contain no pornography or violent content, are legally permitted, and that you own the necessary rights to the images.\n\n**Your image will be uploaded and stored to the Pollinations Media Server**',
    uploadConsentConfirm: 'Confirm',
    uploadErrorNetwork: 'Upload service unavailable. Please try again later.',
    uploadErrorServer: 'Upload failed. The service may be temporarily unavailable.',
    uploadErrorFileSize: 'File too large. Please choose a smaller image.',
    uploadErrorFileType: 'Invalid file type. Please upload an image file.',
    uploadErrorGeneric: 'Upload failed. Please try again.',
    uploadErrorAuth: 'Upload requires a valid API key.',
    imageEditingTitle: 'Image Editing',

    // Workshop Prompt
    workshopPanelLabel: 'Prompt Workshop',
    workshopEnableLabel: 'Enable Workshop',
    workshopModelLabel: 'Text Model',
    workshopSystemPromptLabel: 'System Prompt Override',
    workshopSystemPromptPlaceholder: 'Leave empty for default prompt...',
    workshopParallelPerImageLabel: 'Process for each image',
    workshopThinkingLabel: 'Thinking',
    workshopDescription: 'Refines your prompt using a text AI model before generating the image to improve results.',
    statusWorkshopProcessingPrompt: 'Refining Prompt...',
    inputLabel: 'Input',
    outputLabel: 'Output'
  },

  de: {
    // Meta
    pageTitle: 'PollGen',

    // Authentication & account
    apiKeyPlaceholder: 'API-Schlüssel (über Pollinations-Login verwaltet)',
    apiKeyHint: 'Hol dir einen API-Schlüssel von <a href="https://pollinations.ai" target="_blank">Pollinations</a>',
    apiKeyStored: 'API-Schlüssel gespeichert',
    apiKeyMissing: 'Bitte melde dich mit Pollinations an',
    invalidApiKey: 'Bitte gib einen gültigen API-Schlüssel ein.',
    loginWithPollinations: 'Mit Pollinations anmelden',
    loggedIn: 'Angemeldet',
    logoutLabel: 'Abmelden',
    welcomePopupTitle: 'Willkommen bei Pollgen',
    welcomePopupText: 'Erstelle KI-Bilder und Videos mit Pollinations. Bitte melde dich an, um fortzufahren.',
    copyApiKeySuccess: 'API-Schlüssel kopiert',
    copyApiKeyError: 'API-Schlüssel konnte nicht kopiert werden',
    closeLabel: 'Schließen',

    // Balance & key lifetime
    balanceRemaining: 'Pollen verbleibend',
    balanceUnlimited: 'Unbegrenztes Pollen-Budget',
    balanceUnavailable: 'Pollen-Budget nicht verfügbar',
    balanceAccountTotalLabel: 'gesamt',
    keyValidFor: 'Key gültig für ',
    daysShort: 'T ',
    hoursShort: 'h ',
    minutesShort: 'm',

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

    // Generation controls
    promptPlaceholder: 'Beschreibe das Bild, das du generieren möchtest',
    videoPromptPlaceholder: 'Beschreibe das Video, das du generieren möchtest',
    startScreenTitle: 'Bilder jetzt generieren',
    startScreenIntro: 'Beschreibe deine Vision und bring sie zum Leben',
    modelLabel: 'Modell',
    modelPlaceholder: 'Wähle ein Modell...',
    aspectRatioLabel: 'Seitenverhältnis',
    imageModeLabel: 'Bild',
    videoModeLabel: 'Video',
    modeUnavailableHint: 'In diesem Modus sind keine auswählbaren Modelle verfügbar',
    durationLabel: 'Dauer',
    seedLabel: 'Seed',
    seedPlaceholder: 'Zufällig',
    refinementLabel: 'Verfeinerung',
    negativePromptLabel: 'Negativer Prompt',
    negativePromptPlaceholder: 'Was aus dem Bild ausgeschlossen werden soll',
    advancedLabel: 'Erweiterte Optionen',
    parallelModeLabel: 'Parallele Generierung',
    transparentBackgroundLabel: 'Transparenter Hintergrund',
    gptModelsOnlyTooltip: 'Nur für gpt-Modelle.',
    performanceModeLabel: 'Performance-Modus',
    enhanceLabel: 'Prompt verbessern',
    privateLabel: 'Privater Modus',
    nologoLabel: 'Kein Wasserzeichen',
    nofeedLabel: 'Kein öffentlicher Feed',
    safeLabel: 'Sicherheitsfilter',
    showPremiumModelsLabel: 'Auch Premium-Modelle anzeigen',
    modelLoading: 'Modelle werden geladen...',
    modelLoadError: 'Fehler beim Laden der Modelle.',

    // Cost panel
    costLabel: 'Kosten',
    pollenLabel: 'Pollen',
    costMetaNoModel: 'Kein Modell ausgewählt',
    costMetaImage: 'Geschätzte Gesamtkosten pro Bild',
    costMetaVideo: 'Geschätzte Gesamtkosten für %ss Video',
    costMetaParallel: 'Geschätzte Gesamtkosten für %d %s',
    costBreakdownNoModel: 'Wähle ein Modell, um die Kosten zu sehen',
    costBreakdownFree: 'Kostenlose Generierung',
    perImage: 'pro Bild',
    perSecond: 'pro Sekunde',
    tokensPerMillion: '/Million Token',

    // Generate button & parallel flow
    generateLabel: 'Generiere',
    imagesLabel: 'Bilder',
    videosLabel: 'Videos',
    generateBtn: 'Bild generieren',
    generateVideoBtn: 'Video generieren',
    videoDownloadBtn: 'Video herunterladen',
    generateBatchBtn: 'Generiere %d %s',
    queueAddLabel: 'Zur Warteschlange hinzufügen',
    generateReady: 'Bereit zur Generierung',
    generateStateMissingKey: 'Gültigen API-Schlüssel hinzufügen',
    generateStateNoModels: 'Keine verfügbaren Modelle in diesem Modus',
    generateStateAddPrompt: 'Füge einen Prompt hinzu, um zu starten',
    queueStatus: '%d aktiv • %d in Warteschlange',
    parallelReady: 'Parallelmodus: %d %s pro Klick',
    seedParallelPlaceholder: 'Immer zufällig im Parallelmodus',
    generatingLabel: 'Generiere...',
    generatingVideoLabel: 'Video wird generiert...',
    parallelComplete: '%d abgeschlossen, %d fehlgeschlagen',
    clearHistoryBtn: 'Verlauf löschen',

    // Status & errors
    statusPromptMissing: 'Bitte gib einen Prompt ein',
    statusModelMissing: 'Bitte wähle ein Modell',
    statusError: 'Ein Fehler ist aufgetreten',
    videoError: 'Fehler bei der Videogenerierung',
    errorGeneration: 'Generierungsfehler',
    historyCleared: 'Verlauf gelöscht',
    paidOnlyLabel: 'Paid only',
    paidOnlyError: 'Dieses Modell erfordert bezahltes Pollen',
    img2imgSupported: 'Unterstützt Bild-zu-Bild-Generierung',

    // UI misc
    betaNotice: 'Die Videogenerierung befindet sich in der Beta-Phase. Einige Modelle ignorieren möglicherweise bestimmte Parameter.',
    resolutionWarning: 'Für die optimale Nutzung wird eine Auflösung von mindestens 1080p empfohlen.',

    // Context menu & clipboard
    downloadImage: 'Bild herunterladen',
    downloadVideo: 'Video herunterladen',
    copyImage: 'Bild kopieren',
    copySuccess: 'In die Zwischenablage kopiert',
    copyError: 'Kopieren fehlgeschlagen',
    useAsReferenceImage: 'Als Referenzbild verwenden',

    // Timer overlay
    timerModelLabel: 'Modell',
    timerTimeLabel: 'Zeit',
    timerCostLabel: 'Kosten',

    // Upload
    uploadSuccess: 'Bild erfolgreich hochgeladen',
    uploadDeleteSuccess: 'Hochgeladenes Bild gelöscht',
    uploadConsentTitle: 'Externer Upload',
    uploadConsentText: 'Die maximale Upload-Größe beträgt 10 MB. Deine hochgeladenen Bilder werden für 30 Tage auf dem Pollinations Media Server gespeichert. Pornografische oder gewalttätige Inhalte sind untersagt; lade nur rechtlich zulässige Bilder hoch, an denen du die entsprechenden Urheberrechte besitzt.\n\n**Dein Bild wird auf den Pollinations Media Server hochgeladen und dort gespeichert.**',
    uploadConsentConfirm: 'Bestätigen',
    uploadErrorNetwork: 'Upload-Dienst nicht verfügbar. Bitte versuchen Sie es später erneut.',
    uploadErrorServer: 'Upload fehlgeschlagen. Der Dienst ist möglicherweise vorübergehend nicht verfügbar.',
    uploadErrorFileSize: 'Datei zu groß. Bitte wählen Sie ein kleineres Bild.',
    uploadErrorFileType: 'Ungültiger Dateityp. Bitte laden Sie eine Bilddatei hoch.',
    uploadErrorGeneric: 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.',
    uploadErrorAuth: 'Upload erfordert einen gültigen API-Schlüssel.',
    imageEditingTitle: 'Bildbearbeitung',

    // Workshop Prompt
    workshopPanelLabel: 'Prompt Workshop',
    workshopEnableLabel: 'Workshop aktivieren',
    workshopModelLabel: 'Text-Modell',
    workshopSystemPromptLabel: 'System-Prompt-Überschreibung',
    workshopSystemPromptPlaceholder: 'Leer lassen für Standard-Prompt...',
    workshopParallelPerImageLabel: 'Für jedes Bild einzeln verarbeiten',
    workshopThinkingLabel: 'Thinking',
    workshopDescription: 'Verfeinert deinen Prompt mit einem Text-KI-Modell, bevor das Bild generiert wird, um die Ergebnisse zu verbessern.',
    statusWorkshopProcessingPrompt: 'Prompt wird verfeinert...',
    inputLabel: 'Eingabe',
    outputLabel: 'Ausgabe'
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
        replacement.forEach(r => {
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
      if (!key) return;

      if (key === 'apiKeyHint') {
        element.innerHTML = this.t(key);
      } else {
        element.textContent = this.t(key);
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
