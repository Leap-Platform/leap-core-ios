// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

let stateUndefinedRetires = 2;
let retiresFor404 = 2;
let retiresFor500 = 2;

function start({
  baseUrl = "https://leap-dev-api.quickolabs.com/",
  apiKey,
  devicePlatform = platform,
  appVersion = "ALL",
  userState = undefined,
  leapUserId,
  sdkVersionCode = 22,
  sessionId,
}) {
  // 1. Check if the state is cached
  // 2. If cached change isShown and isCompleted flag for all the projects
  let savedState =
    userState === undefined
      ? undefined
      : JSON.parse(
          userState
            .replaceAll(`"isShown":true`, `"isShown":false`)
            .replaceAll(`"shownOnce":true`, `"shownOnce":false`)
            .replaceAll(`"isCompleted":true`, `"isCompleted":false`)
        );

  // Fetch the latest config
  console.warn("CONFIG_FETCH_STARTED");
  async function fetchConfig() {
    fetch(`${baseUrl}odin/api/v1/config/fetch`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Allow-Control-Access-Origin": "",
        "x-jiny-client-id": apiKey,
        "x-app-version-name": appVersion,
        "x-jiny-last-updated-at": savedState?.[leapUserId]?.lastUpdatedConfigAt
          ? JSON.stringify(savedState?.[leapUserId]?.lastUpdatedConfigAt)
          : "", // used this to check if the last config is same as the next config
      },
      body: JSON.stringify({ wfx_sdkVersionCode: sdkVersionCode }),
    })
      .then(async (response) => {
        // Store the last update at timestamp for the downloaded config
        lastUpdatedConfigAt = JSON.parse(
          response.headers.get("x-jiny-last-updated-at")
        );

        return {
          status: response.status,
          config: response.status === 200 ? await response.json() : {},
        };
      })
      .then((res) => {
        console.warn("CONFIG_FETCH_ENDED");
        // Initialize all the variables
        platform = devicePlatform;
        currentLeapUserId = leapUserId;
        currentSessionId = sessionId;
        appApiKey = apiKey;
        configBaseUrl = baseUrl;
        appVersionCode = appVersion;

        switch (res.status) {
          case 200: {
            switch (res.config.configStatus) {
              case 200: {
                console.warn("SERVING_CONFIG_FROM_API");
                organizeProjectArray(res.config.data);
                break;
              }

              case 304: {
                // In case if the saved state is not present
                if (savedState === undefined) {
                  --stateUndefinedRetires;
                  lastUpdatedConfigAt = undefined;
                  console.error("STATE_MISSING_REFETCHING_CONFIG_AGAIN");
                  if (stateUndefinedRetires !== 0) fetchConfig();
                }

                console.warn("SERVING_CONFIG_FROM_CACHE");
                sortedProjectArray = savedState[leapUserId]?.projectArray;
                allProjectStatus = savedState[leapUserId]?.projectsStatus;
                flowWalkthroughs =
                  savedState[leapUserId]?.connectedWalkthroughs;
                selectedLanguage = savedState[leapUserId]?.language;
                completedProjectsInFlow =
                  savedState[leapUserId]?.projectsCompletionStats;
                platform = savedState[leapUserId]?.currentPlatform;
                appApiKey = savedState[leapUserId]?.apiKey;
                configBaseUrl = savedState[leapUserId]?.baseUrl;
                appVersionCode = savedState[leapUserId]?.appVersion;
                init();
                break;
              }
            }
            break;
          }

          case 401: {
            if (retiresFor404 !== 0) {
              --retiresFor404;
              fetchConfig();
            } else {
              console.error("UNAUTHORIZED_401");
            }
            break;
          }

          case 404: {
            if (retiresFor404 !== 0) {
              --retiresFor404;
              fetchConfig();
            } else {
              console.error("UNABLE_TO_FETCH_CONFIG_THROWING_404");
            }
            break;
          }

          case 500: {
            if (retiresFor500 !== 0) {
              --retiresFor500;
              fetchConfig();
            } else {
              console.error("UNABLE_TO_FETCH_CONFIG_THROWING_500");
            }
            break;
          }
        }
      })
      .catch((e) => {
        console.error(
          "UNABLE_TO_FETCH_CONFIG_THROWING_500",
          JSON.stringify(e.message, e.cause)
        );
      });
  }

  fetchConfig();
}

function enterPreviewMode(data) {
  console.warn("PREVIEW_STARTED");
  organizeProjectArray(data.configs);
}

function organizeProjectArray(config) {
  let organizedArray = sortAndOrganizeProjects(config);
  allProjectStatus = organizedArray.projectStatus;
  sortedProjectArray = organizedArray.sortedProjects;
  flowWalkthroughs = organizedArray.flowsWalkthroughProjects;
  completedProjectsInFlow = organizedArray.initialCompletedProjectsInFlow;

  console.warn("START_BULK_DOWNLOAD");
  saveConfigAndDownloadBulkAssets(config);
  saveTheLatestStateChange();
  init();
}
