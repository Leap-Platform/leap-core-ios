// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// Initiate the loop to get the latest hierarchy
function init() {
  if (timer === undefined || timer === 1) clearInterval(timer);
  if (sortedProjectArray.length !== 0) {
    timer = setInterval(
      () => sendMessageToNative({ command: SENDING_COMMANDS.HIERARCHY }),
      intervalTime
    );
  }
}

// Function used to send config settings and assets links to pre download
function saveConfigAndDownloadBulkAssets(res) {
  const assetList = [];
  const soundList = {};

    sortedProjectArray.concat(Object.values(flowWalkthroughs)).forEach((p) => {
    p.auiContent.content.forEach((c) => {
      if (!c) return;
      c.startsWith("http")
        ? assetList.push(`${c}`)
        : assetList.push(`${p.auiContent.baseUrl}${c}`);
    });

    const sounds = Object.keys(p.localeSounds?.sounds);

    if (sounds.length > 0) {
      sounds.forEach((sound) => {
        if (soundList[sound] === undefined) soundList[sound] = [];

        const updatedSounds = p.localeSounds?.sounds[sound].map((s) => {
          s.url = s.url?.startsWith("http")
            ? `${s?.url}`
            : `${p?.localeSounds?.baseUrl}${s?.url}`;
          return s;
        });

        soundList[sound] = [...soundList[sound], ...updatedSounds];
      });
    }
  });

  // Ask native to save config
  sendMessageToNative({
    command: SENDING_COMMANDS.SAVE_CONFIG,
    data: {
      config: res,
      assetsToDownload: {
        files: assetList,
        sounds: soundList,
      },
    },
  });
}

// Script uses to extract the matching identifiers from the client web view
function sendWebJSscript({
  webIdentifiers,
  webViewList,
  projectId,
  webViewBounds,
  webViewScale,
}) {
  var message = {
    command: SENDING_COMMANDS.WEB_SCRIPT,
    data: {
      script: createFinderJavascript(
        webIdentifiers,
        projectId,
        webViewBounds,
        webViewScale
      ),
      webViewList,
    },
  };
  sendMessageToNative(message);
}

// Once flow is completed send the call back to native side
function sendProjectCompletion({ id, reset }) {
  const flow = completedProjectsInFlow[currentlyRunningFlow.id || id];

  if (flow === undefined) return;

  var message = {
    command: SENDING_COMMANDS.PROJECT_COMPLETED,
    data: {
      language: selectedLanguage,
      projects: reset ? [] : flow.projects,
    },
  };

  sendMessageToNative(message);
}

// Update the state change to native side to cache it
function saveTheLatestStateChange() {
  var message = {
    command: SENDING_COMMANDS.SAVE_USER_STATE,
    data: {
      [currentLeapUserId]: {
        projectArray: sortedProjectArray,
        projectsStatus: allProjectStatus,
        connectedWalkthroughs: flowWalkthroughs,
        language: selectedLanguage,
        currentPlatform: platform,
        lastUpdatedConfigAt,
        projectsCompletionStats: completedProjectsInFlow,
        language: selectedLanguage,
        apiKey: appApiKey,
        baseURL: configBaseUrl,
        appVersion: appVersionCode,
      },
    },
  };
  !inPreviewMode && sendMessageToNative(message);
}

// construct the event and send to SDK
function sendAnalyticEvent(
  eventName = ANALYTICS_EVENTS.ELEMENT_SEEN,
  properties = {}
) {
  let selectedProject;
  if (currentlyRunningFlow.id && currentStaticFlow.stepsStatus.length > 0) {
    selectedProject = Object.values(flowWalkthroughs).find(
      (s) => currentStaticFlow?.id === s?.id
    );
  } else {
    selectedProject = sortedProjectArray.find(
      (s) => activeProject?.id === s?.id
    );
  }

  const message = {
    command: SENDING_COMMANDS.ANALYTICS_EVENT,
    data: {
      event: {
        id: generateUUID(),
        sessionId: currentSessionId,
        timestamp: new Date().toISOString(),
        eventName,
        projectName: selectedProject?.projectParameters.projectName,
        projectId: selectedProject?.projectParameters.projectId,
        deploymentId: selectedProject?.projectParameters.deploymentId,
        deploymentVersion: selectedProject?.projectParameters.deploymentVersion,
        language: selectedLanguage,
        deploymentName: selectedProject?.projectParameters.deploymentName,
        elementName: activeStep?.id
          ? activeStep?.step?.assist?.name
          : selectedProject?.assist?.name,
        ...properties,
      },
      clientCallback: {},
      leapUserId: currentLeapUserId,
    },
  };
  sendMessageToNative(message);
}

// Callback function to target the native platform and pass the message
function sendMessageToNative(message) {
  [
    SENDING_COMMANDS.HIERARCHY,
    // SENDING_COMMANDS.NO_CONTEXT_FOUND,
    // SENDING_COMMANDS.ANALYTICS_EVENT,
    // SENDING_COMMANDS.WALKTHROUGH_FOUND,
    // SENDING_COMMANDS.STEP_FOUND,
    // SENDING_COMMANDS.WEB_SCRIPT,
    // SENDING_COMMANDS.ASSIST_FOUND,
    // SENDING_COMMANDS.UPDATE_ASSIST_BOUNDS,
    // SENDING_COMMANDS.UPDATE_STEP_BOUNDS,
    // SENDING_COMMANDS.PROJECT_COMPLETED,
    // SENDING_COMMANDS.SAVE_USER_STATE,
  ].includes(message.command) && console.warn(JSON.stringify(message));

  postMessageToAndroid(JSON.stringify(message));
  postMessageToIos(JSON.stringify(message));
}

// Callback function for the Android
function postMessageToAndroid(message) {
  window?.JinyAndroid && window?.JinyAndroid?.postMessage(message);
}

// Callback function for the IOS
function postMessageToIos(e) {
  window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.iosListener &&
    window.webkit.messageHandlers.iosListener.postMessage(e);
}
