// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

const getBoundingArea = (bound) =>
  bound !== undefined &&
  (bound?.right - bound?.left) * (bound?.bottom - bound?.top);

function isArrayMatched(arr1, arr2) {
  // Check if the arrays have the same length
  if (arr1.length !== arr2.length) {
    return false;
  }

  // Sort both arrays
  const sortedArr1 = arr1.slice().sort();
  const sortedArr2 = arr2.slice().sort();

  // Compare each element in the sorted arrays
  for (let i = 0; i < sortedArr1.length; i++) {
    if (sortedArr1[i] !== sortedArr2[i]) {
      return false;
    }
  }

  // If all elements match, return true
  return true;
}

function isInsideBounds(nodeABounds, nodeBBounds) {
  return (
    nodeABounds.top <= nodeBBounds.top &&
    nodeABounds.left <= nodeBBounds.left &&
    nodeABounds.right >= nodeBBounds.right &&
    nodeABounds.bottom >= nodeBBounds.bottom
  );
}

function isAClickableNode(bounds) {
  return (
    this?.left < this?.right &&
    this?.top < this?.bottom &&
    this?.left <= bounds?.left &&
    this?.top <= bounds?.top &&
    this?.right >= bounds?.right &&
    this?.bottom >= bounds?.bottom
  );
}

function checkIfIdentifierMatch(matchedIdentifier, identifierToMatch) {
  // Convert the first array to a Set for efficient lookup
  const set1 = new Set(matchedIdentifier);

  // Check if every element in identifierToMatch is present in set1
  return identifierToMatch?.every((element) => set1.has(element));
}

function generateUUID() {
  // Helper function to generate a random number between 0 and 15
  function randomHexDigit() {
    return Math.floor(Math.random() * 16).toString(16);
  }

  // Replace function for the UUID template
  function replacePlaceholders(char) {
    var random = randomHexDigit();
    // Ensure the UUID version is set correctly (4xxx)
    if (char === "x") {
      return random;
    } else if (char === "y") {
      // Ensure the correct variant of the UUID
      return ((parseInt(random, 16) & 0x3) | 0x8).toString(16);
    }
    return char;
  }

  // Template for a UUID
  var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

  // Replace each character in the template with random hex digits or fixed values
  return template.replace(/[xy]/g, replacePlaceholders);
}

function isValidDate(dateString) {
  let date = new Date(dateString);
  return !isNaN(date.getTime());
}

const getWidth = (element) => parseInt(element.right) - parseInt(element.left);
const getHeight = (element) => parseInt(element.bottom) - parseInt(element.top);
const checkForEmptyBounds = (bounds) =>
  getWidth(bounds) <= 0 || getHeight(bounds) <= 0;

function sortAndOrganizeProjects(projects) {
  const specifiedOrder = [
    "STATIC_FLOW",
    "STATIC_FLOW_MENU",
    "STATIC_FLOW_CHECKLIST",
  ];
  const projectTypeOrder = new Map(
    specifiedOrder.map((type, index) => [type, index])
  );

  const priorityOrder = [];
  const priorityLessOrder = [];
  const flowWalkthroughs = [];

  projects.forEach((project) => {
    if (project.projectParameters.deploymentType === "LINK") {
      flowWalkthroughs.push(project);
      return;
    }
    if (project.projectParameters.priority === null) {
      priorityLessOrder.push(project);
    } else {
      priorityOrder.push(project);
    }
  });

  priorityOrder.sort(
    (a, b) => a.projectParameters.priority - b.projectParameters.priority
  );

  priorityLessOrder.sort((a, b) => {
    const typeA = projectTypeOrder.has(a.projectParameters.projectType)
      ? projectTypeOrder.get(a.projectParameters.projectType)
      : -1;
    const typeB = projectTypeOrder.has(b.projectParameters.projectType)
      ? projectTypeOrder.get(b.projectParameters.projectType)
      : -1;
    return typeA - typeB;
  });

  const sortedProjects = [...priorityOrder, ...priorityLessOrder];
  const organizedProjects = [];
  const flowsWalkthroughProjects = {};
  const projectStatus = {};
  const initialCompletedProjectsInFlow = {};

  sortedProjects.forEach((project) => {
    const objKey =
      project.discoveryList?.[0].uniqueID || project.assists?.[0].uniqueID;
    const termination =
      project.discoveryList?.[0].uniqueID !== undefined
        ? project.discoveryList?.[0].flowTerminationFrequency
        : project.assists?.[0].terminationFrequency;

    organizedProjects.push({
      id: objKey,
      isAFlow: objKey.includes("discovery"),
      isAFlowMenu: ["STATIC_FLOW_MENU", "STATIC_FLOW_CHECKLIST"].includes(
        project.projectParameters.projectType
      ),
      isWebView: project.webIdentifiers !== undefined,
      assist: objKey.includes("discovery")
        ? project?.discoveryList?.[0]
        : project?.assists?.[0],
      flows: project.flows,
      isAnchoredElement: objKey.includes("discovery")
        ? false
        : !!project?.assists?.[0].instruction.assistInfo.identifier,
      targetId: objKey.includes("discovery")
        ? ""
        : project?.assists?.[0].instruction.assistInfo.identifier,
      initialTermination: { ...termination },
      terminationStatus: termination,
      nativeIdentifiers: project.nativeIdentifiers,
      webIdentifiers: project.webIdentifiers,
      auiContent: project.auiContent,
      localeSounds: project.localeSounds,
      projectParameters: project.projectParameters,
      webViewList: project.webViewList,
      languages: project.languages,
      connectedProjects: project?.connectedProjects || [],
      triggerCase: project?.discoveryList?.[0]?.triggerFrequency?.type,
      isIconEnabled: !!project.discoveryList?.[0]?.enableIcon,
      iconSetting:
        project?.iconSetting?.[Object.keys(project?.iconSetting)?.[0] || "0"],
    });

    // For flow completion
    if (project.connectedProjects !== undefined) {
      const projects = [];

      project.connectedProjects.forEach((s) => {
        projects.push({
          id: s.projectId,
          completed: false,
        });
      });

      initialCompletedProjectsInFlow[objKey] = {
        id: objKey,
        projects,
      };
    }

    projectStatus[objKey] = {
      id: objKey,
      projectType: project.projectParameters.projectType,
      shownOnce: false,
      isShown: false,
      isCompleted: false,
      isFlowTriggered: false,
      triggerCase: project?.discoveryList?.[0]?.triggerFrequency?.type,
      initialTermination: { ...termination },
      terminationStatus: termination,
    };
  });

  flowWalkthroughs.forEach((project) => {
    const objKey = project.discoveryList?.[0].uniqueID;
    const termination = project.discoveryList?.[0].flowTerminationFrequency;

    flowsWalkthroughProjects[project.projectParameters.deploymentId] = {
      id: objKey,
      isAFlow: true,
      isAFlowMenu: false,
      isWebView: project.webIdentifiers !== undefined,
      assist: project?.discoveryList?.[0],
      flows: project.flows,
      isAnchoredElement: false,
      targetId: "",
      initialTermination: { ...termination },
      terminationStatus: termination,
      nativeIdentifiers: project.nativeIdentifiers,
      webIdentifiers: project.webIdentifiers,
      auiContent: project.auiContent,
      localeSounds: project.localeSounds,
      projectParameters: project.projectParameters,
      webViewList: project.webViewList,
      languages: project.languages,
      connectedProjects: project?.connectedProjects || [],
      triggerCase: project?.discoveryList?.[0]?.triggerFrequency?.type,
      isIconEnabled: !!project.discoveryList?.[0]?.enableIcon,
      iconSetting:
        project?.iconSetting?.[Object.keys(project?.iconSetting)?.[0] || "0"],
    };
  });

  return {
    sortedProjects: organizedProjects,
    projectStatus,
    flowsWalkthroughProjects,
    initialCompletedProjectsInFlow,
  };
}

function checkToShowProject(id) {
  const project = allProjectStatus?.[id];

  // Project terminated so return false
  if (project === undefined) return false;

  const terminationStatus = project?.terminationStatus;

  // If the termination is undefined then termination logic is not set so return true
  if (terminationStatus === undefined) return true;

  // sessions
  if (terminationStatus?.nSession !== -1) {
    return !!(
      terminationStatus.nSession !== 0 || allProjectStatus[project.id].shownOnce
    );
  }

  // Dismiss by user
  if (terminationStatus?.nDismissedByUser === 1) {
    return true;
  }

  // Flow completion times
  if (terminationStatus?.perApp !== -1) {
    return terminationStatus.perApp !== 0;
  }

  // Until all flows are completed
  if (terminationStatus?.untilAllFlowsAreCompleted) {
    return true;
  }

  // When none of the condition is matching
  if (
    terminationStatus?.nSession === -1 &&
    terminationStatus?.nDismissedByUser === -1 &&
    terminationStatus?.perApp === -1 &&
    !terminationStatus?.untilAllFlowsAreCompleted
  ) {
    return true;
  } else {
    return false;
  }
}

function removeProjectFromStatusArray(id) {
  const activeProjectId = id
    ? id
    : currentlyRunningFlow.id === ""
    ? activeProject.id
    : currentlyRunningFlow.id;

  const index = sortedProjectArray.findIndex((s) => s.id === activeProjectId);

  if (index !== -1) sortedProjectArray.splice(index, 1);
  saveTheLatestStateChange();
}

function updateViewStatusForTheProject(key) {
  if (activeProject.id !== undefined) {
    const project =
      currentlyRunningFlow.id === ""
        ? allProjectStatus[activeProject.id]
        : allProjectStatus[currentlyRunningFlow.id];

    const initialTermination = project?.initialTermination;
    const terminationStatus = project?.terminationStatus;

    // If the termination is undefined then termination logic is not set so don't do anything
    if (terminationStatus === undefined) return;

    // sessions
    if (terminationStatus.nSession !== -1 && key === "nSession") {
      if (project.shownOnce === false) --terminationStatus.nSession;

      // update shownOnce
      allProjectStatus[project.id] = {
        ...allProjectStatus[project.id],
        shownOnce: true,
      };

      sendAnalyticEvent(ANALYTICS_EVENTS.PROJECT_TERMINATION, {
        terminationRule: `nSession: ${initialTermination.nSession}`,
      });

      saveTheLatestStateChange();
      return;
    }

    // Dismiss by user
    if (
      terminationStatus.nDismissedByUser === 1 &&
      key === "nDismissedByUser"
    ) {
      sendAnalyticEvent(ANALYTICS_EVENTS.PROJECT_TERMINATION, {
        terminationRule: `nDismissedByUser: ${initialTermination.nDismissedByUser}`,
      });
      return removeProjectFromStatusArray();
    }

    // Flow completion times
    if (terminationStatus.perApp !== -1 && key === "perApp") {
      --terminationStatus.perApp;
      if (terminationStatus.perApp === 0) {
        sendAnalyticEvent(ANALYTICS_EVENTS.PROJECT_TERMINATION, {
          terminationRule: `perApp: ${initialTermination.perApp}`,
        });
        removeProjectFromStatusArray();
      } else saveTheLatestStateChange();
      return;
    }

    // Until all flows are completed
    if (
      terminationStatus.untilAllFlowsAreCompleted &&
      key === "untilAllFlowsAreCompleted"
    ) {
      sendAnalyticEvent(ANALYTICS_EVENTS.PROJECT_TERMINATION, {
        terminationRule: `untilAllFlowsAreCompleted: ${initialTermination.untilAllFlowsAreCompleted}`,
      });
      return removeProjectFromStatusArray();
    }
  }
}

function areAllProjectsCompleted(data) {
  // Iterate over each item in the project array
  for (const project of data.projects) {
    // If any project is not completed, return false
    if (!project.completed) {
      return false;
    }
  }
  // If all projects are completed, return true
  return true;
}

function getTriggerConditionForStaticFlow(
  condition,
  isShown,
  triggeredAlready
) {
  switch (condition) {
    case "EVERY_SESSION":
    case "PLAY_ONCE":
    case "EVERY_SESSION_UNTIL_DISMISSED":
    case "EVERY_SESSION_UNTIL_FLOW_COMPLETE": {
      return triggeredAlready ? "ICON" : isShown ? "ICON" : "SHOW";
    }

    case "MANUAL_TRIGGER": {
      return "ICON";
    }
  }
}

function setSelectedLanguage(languages, languageCode) {
  if (languageCode === "") {
    return languages.length === 1 ? languages[0].localeId : "";
  } else {
    const found = languages.find((l) => l.localeId === languageCode);

    if (found === undefined) {
      return languages.length === 1 ? languages[0].localeId : "";
    }
    return found.localeId;
  }
}

function logCat(data) {
  const pattern = /"http[s]?:\/\/[^"]*"/g;

  // Replace matches with an empty string
  return JSON.stringify(data).replace(pattern, '""');
}

function logWith(level, message) {
  // Create an Error object to capture the stack trace
  const stackTrace = new Error().stack.split("\n").slice(2).join("\n");
  // Extract function name, line number, and file name from the stack trace
  const functionName = stackTrace.match(/at\s+(.*)\s+\(/)[1];
  const lineNumber = stackTrace.match(/\((.*):(\d+):\d+\)/)[2];
  const fileName = stackTrace.match(/\((.*):(\d+):\d+\)/)[1];
  // Determine the console method based on the log level
  let logMethod;
  switch (level) {
    case "warn":
      return;
      logMethod = console.warn;
      break;
    default:
      logMethod = console.log;
      break;
  }
  // Log the message along with function name, line number, and file name
  logMethod(`[${fileName}:${lineNumber} - ${functionName}]: ${message}`);
}
