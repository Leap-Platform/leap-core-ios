// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

function receiveScreenHierarchy(screenHierarchy) {
  // console.warn("RECEIVE_SCREEN_HIERARCHY");
  filteredHierarchy = filterHierarchy(screenHierarchy);

  // If any project is active search for steps
  if (
    activeProject.id !== "" &&
    currentStaticFlow.id !== undefined && // If flow is active
    currentStaticFlow.status === "RENDERING-STEPS" // If flow start screen is rendered
  ) {
    // callWebScriptForProject(activeProject);
    let lastStep = currentStaticFlow?.stepsStatus?.slice(-1)?.[0];
    callWebScriptForProject(activeProject);
    let foundProject;

    if (currentlyRunningFlow.id !== "") {
      foundProject = runDetectionLogicForProjects(true);
    }

    const stepFound = runDetectionLogicForSteps({ lastStep });

    // If any step is found
    if (stepFound !== undefined) {
      // Check and update the bounds if the step is same as previous else do nothing
      if (
        checkAndUpdateBounds({
          activeAssist: stepFound,
          activeProjectId: activeStep?.id,
          isAStep: true,
        })
      )
        return;

      renderStep(stepFound);
    } else if (currentlyRunningFlow.id === "" && foundProject !== undefined) {
      if (activeStep.id !== "") resetActiveStep();
      sendMessageToNative({
        command: SENDING_COMMANDS.NO_CONTEXT_FOUND,
      });
    }

    if (foundProject !== undefined) {
      if (foundProject.id !== currentlyRunningFlow.id || !flowShown) {
        renderProject(foundProject, true);
        flowShown = true;
      }
    } else if (stepFound === undefined) {
      resetActiveStep();
      sendMessageToNative({
        command: SENDING_COMMANDS.NO_CONTEXT_FOUND,
      });
      flowShown = false;
    }
  }
  // If no project is active search for all projects
  else {
    // get the webview identifiers
    callWebScriptForAllProject();
    const projectFound = runDetectionLogicForProjects();

    // If any project is found
    if (projectFound !== undefined) {
      // Check and update the bounds if the project is same as previous else do nothing
      if (
        checkAndUpdateBounds({
          activeAssist: projectFound,
          activeProjectId: activeProject?.id,
          isAStep: false,
        })
      )
        return;
      renderProject(projectFound);
    } else {
      if (currentStaticFlow.status === "START") {
        resetActiveStep();
        resetCurrentStaticFlow();
        resetActiveProject();
      }
      sendMessageToNative({
        command: SENDING_COMMANDS.NO_CONTEXT_FOUND,
      });
    }
  }
}

function callWebScriptForProject(project) {
  if (project.isWebView) {
    let matchedWebViewNode;

    if (project?.webViewList) {
      for (let webViewInfo of project?.webViewList) {
        const { matchedNode } = findMatches(filteredHierarchy, {
          wfxWebViewList: webViewInfo,
        });

        if (matchedNode && matchedNode.length > 0) {
          matchedWebViewNode = matchedNode;
          break;
        }
      }
    }

    if (!matchedWebViewNode) {
      return;
    }

    sendWebJSscript({
      webIdentifiers: project.webIdentifiers,
      webViewList: project.webViewList,
      projectId: project.id,
      webViewBounds: matchedWebViewNode[0]["bounds"],
      webViewScale: matchedWebViewNode[0]["scale"],
    });
  }
}

function callWebScriptForAllProject() {
  sortedProjectArray.forEach((project) => {
    callWebScriptForProject(project);
  });
}

function checkAndUpdateBounds({ activeAssist, activeProjectId, isAStep }) {
  // If the current and previous project are same
  if (activeAssist?.id === activeProjectId) {
    // Check if the current project is anchored element
    if (activeAssist.isAnchoredElement) {
      // Get the node bounds from the identified array
      const matchedNode = prevMatchedIdentifiers.matchedNode.find(
        (s) => activeAssist.targetId === s.id
      );

      // If the nodes bounds is not same is previous then update
      if (
        JSON.stringify(matchedNode?.bounds) !==
        JSON.stringify(previousBoundState)
      ) {
        let bodyObj = {
          command: isAStep
            ? SENDING_COMMANDS.UPDATE_STEP_BOUNDS
            : SENDING_COMMANDS.UPDATE_ASSIST_BOUNDS,
          data: {
            assist: activeAssist.assist,
            projectParameters: activeProject.projectParameters,
            auiContent: activeProject.auiContent,
            bounds: matchedNode?.bounds,
          },
        };

        // Update the previousBoundState to current found bound
        previousBoundState = matchedNode?.bounds;

        if (isAStep) {
          bodyObj = {
            ...bodyObj,
            data: {
              ...bodyObj.data,
              iconSetting: activeProject.iconSetting,
              showLanguageOption: activeProject.languages.length > 1,
              showIcon: currentlyRunningFlow.id === "" ? true : false,
              selectedLanguage,
            },
          };
        }
        sendMessageToNative(bodyObj);
      }
    }
    // Do nothing
    return true;
  }

  return false;
}

function constructActiveProjectObject(projectFound) {
  activeProject = {
    id: projectFound.id,
    projectType: projectFound.projectParameters.projectType,
    isShowing: true,
    isAnchoredElement: projectFound.isAnchoredElement,
    isWebView: projectFound.webIdentifiers !== undefined,
    flows: projectFound.flows,
    nativeIdentifiers: projectFound.nativeIdentifiers,
    webIdentifiers: projectFound.webIdentifiers,
    auiContent: projectFound.auiContent,
    languages: projectFound.languages,
    projectParameters: projectFound.projectParameters,
    iconSetting: projectFound.iconSetting,
    webViewList: projectFound.webViewList,
    standAlone: ![
      "STATIC_FLOW",
      "STATIC_FLOW_MENU",
      "STATIC_FLOW_CHECKLIST",
    ].includes(projectFound.projectParameters.projectType),
    isAFlow: projectFound.projectParameters.projectType === "STATIC_FLOW",
    isAFlowMenu: ["STATIC_FLOW_MENU", "STATIC_FLOW_CHECKLIST"].includes(
      projectFound.projectParameters.projectType
    ),
  };
}

function renderStep(stepFound) {
  currentStaticFlow.stepsStatus.push({
    id: stepFound.id,
    toShow: true,
    completed: false,
    isAnchoredElement: !!stepFound?.isAnchoredElement,
    identifier: stepFound.targetId,
    nextStep: stepFound.next,
    completionStep: !!stepFound.isSuccess,
    step: stepFound.assist,
  });

  activeStep = {
    step: stepFound,
    id: stepFound.id,
    isAnchoredElement: !!stepFound?.isAnchoredElement,
  };

  const bodyObj = {
    command: SENDING_COMMANDS.STEP_FOUND,
    data: {
      assist: stepFound.assist,
      projectParameters: activeProject.projectParameters,
      auiContent: activeProject.auiContent,
      iconSetting: activeProject.iconSetting,
      showLanguageOption: activeProject.languages.length > 1,
      showIcon: currentlyRunningFlow.id === "" ? true : false,
      selectedLanguage,
    },
  };

  if (stepFound.targetId) {
    const matchedNode = prevMatchedIdentifiers.matchedNode.find(
      (s) => stepFound.targetId === s.id
    );

    previousBoundState = matchedNode?.bounds;
    bodyObj.data.bounds = matchedNode?.bounds;
  }

  sendMessageToNative(bodyObj);
}

function renderProject(projectFound, showOnlyFlowIcon = false) {
  const bodyObj = {
    command: SENDING_COMMANDS.ASSIST_FOUND,
    data: {
      assist: projectFound.assist,
      projectParameters: projectFound.projectParameters,
      auiContent: projectFound.auiContent,
    },
  };

  const showOnlyIcon =
    getTriggerConditionForStaticFlow(
      projectFound.triggerCase,
      allProjectStatus[projectFound.id].isShown,
      allProjectStatus[projectFound.id].isFlowTriggered
    ) === "ICON";

  // If the project is a flow or a walkthrough
  if (projectFound.isAFlow || projectFound.isAFlowMenu) {
    bodyObj.command = SENDING_COMMANDS.WALKTHROUGH_FOUND;

    selectedLanguage = setSelectedLanguage(
      projectFound.languages,
      selectedLanguage
    );

    bodyObj.data = {
      ...bodyObj.data,
      selectedLanguage,
      showLanguagePanel: selectedLanguage === "",
      languages: projectFound.languages,
      iconSetting: projectFound.iconSetting,
      showIcon: showOnlyFlowIcon || showOnlyIcon,
    };
  }

  // If the project is a flow
  if (projectFound.isAFlowMenu) {
    // In case if the running flow menu changes
    if (
      currentlyRunningFlow.id === projectFound.id ||
      currentlyRunningFlow.id === ""
    )
      sendProjectCompletion({ id: projectFound.id, reset: false });
    // In case if the executed flow is reselected
    else sendProjectCompletion({ reset: true });

    activeProject.id = projectFound.id;
    flowShown = true;

    currentlyRunningFlow = {
      id: projectFound.id,
      active: true,
    };
  }

  // If the project is a walkthrough
  if (projectFound.isAFlow && !projectFound.isAFlowMenu && !showOnlyFlowIcon) {
    // Don't break since next is the construction of the active object
    currentStaticFlow = {
      id: projectFound.id,
      projectId: projectFound.projectParameters.deploymentId,
      status: "START",
      onlyIcon: showOnlyIcon,
      completed: false,
      stepsStatus: [],
    };
  }

  // If the project is neither a flow or a walkthrough
  if (!(projectFound.isAFlow || projectFound.isAFlowMenu)) {
    if (projectFound.isAnchoredElement) {
      const getNativeMatchedNode = prevMatchedIdentifiers?.matchedNode?.find(
        (s) => projectFound.targetId === s.id
      );

      const getWebMatchedNode = currentMatchedWebIdentifiers[
        projectFound.id
      ]?.matchedNode?.find((s) => projectFound.targetId === s.id);

      const matchedNode = projectFound.isWebView
        ? getWebMatchedNode
        : getNativeMatchedNode;

      previousBoundState = matchedNode?.bounds;
      bodyObj.data.bounds = matchedNode?.bounds;
    }
  }

  // For all the projects except flow
  if (!projectFound.isAFlowMenu && !showOnlyFlowIcon) {
    constructActiveProjectObject(projectFound);
  }

  sendMessageToNative(bodyObj);
}

function runDetectionLogicForProjects(searchOnlyFlowMenu = false) {
  return sortedProjectArray.find((project, i) => {
    if (
      allProjectStatus?.[project.id]?.terminationStatus?.nSession === 0 &&
      allProjectStatus?.[project.id]?.shownOnce === false
    ) {
      removeProjectFromStatusArray(project.id);
      return false;
    }

    switch (true) {
      case project.isAFlow:
      case project.isAFlowMenu: {
        // For static and flow menu

        const resWeb = currentMatchedWebIdentifiers[project.id];
        const resNative = findMatches(
          filteredHierarchy,
          project.nativeIdentifiers
        );
        // In case if the project is webview
        const res = project?.isWebView ? resWeb : resNative;

        found = checkIfIdentifierMatch(
          res?.matchedIdentifiers,
          project?.isWebView
            ? project.assist.webIdentifiers
            : project.assist.nativeIdentifiers
        );

        if (
          found &&
          (((!allProjectStatus[project.id].isShown ||
            !allProjectStatus[project.id].isCompleted ||
            project.isIconEnabled) &&
            checkToShowProject(project.id)) ||
            searchOnlyFlowMenu)
        )
          return project;
        break;
      }

      case !project.isWebView: {
        const res = findMatches(filteredHierarchy, project.nativeIdentifiers);
        console.log(res);
        prevMatchedIdentifiers = res;
        let found = false;

        if (project.isAnchoredElement)
          found = isArrayMatched(
            [...project.assist.nativeIdentifiers, project.targetId],
            res.matchedIdentifiers
          );
        else
          found = isArrayMatched(
            project.assist.nativeIdentifiers,
            res.matchedIdentifiers
          );
        console.log(found);
        if (
          found &&
          (!allProjectStatus[project.id].isShown ||
            !allProjectStatus[project.id].isCompleted) &&
          checkToShowProject(project.id)
        )
          return project;

        break;
      }

      // Standalone web project project
      case project.isWebView: {
        // const res = findMatches(filteredHierarchy, project.nativeIdentifiers);
        const res = currentMatchedWebIdentifiers?.[project.id];
        prevMatchedIdentifiers = res;
        let found = false;
        if (res === undefined) break;

        if (project.isAnchoredElement)
          found = isArrayMatched(
            [...project.assist.webIdentifiers, project.targetId],
            res.matchedIdentifiers
          );
        else
          found = isArrayMatched(
            project.assist.webIdentifiers,
            res.matchedIdentifiers
          );

        if (
          found &&
          (!allProjectStatus[project.id].isShown ||
            !allProjectStatus[project.id].isCompleted) &&
          checkToShowProject(project.id)
        )
          return project;

        break;
      }
    }
  });
}

function runDetectionLogicForSteps({ lastStep }) {
  let currentStepId =
    lastStep === undefined
      ? activeProject.flows[0].firstStep
      : lastStep.nextStep;

  const resWeb = currentMatchedWebIdentifiers[activeProject.id];
  const resNative = findMatches(
    filteredHierarchy,
    activeProject.nativeIdentifiers
  );

  if (lastStep?.toShow && !lastStep?.completed) {
    currentStepId = lastStep.id;
  }

  let stepFound;

  activeProject.flows[0].pages.find((page) => {
    if (
      checkIfIdentifierMatch(
        resNative.matchedIdentifiers,
        page.nativeIdentifiers
      )
    ) {
      for (let stage of page.stages) {
        if (
          stage.uniqueID === currentStepId &&
          checkIfIdentifierMatch(
            stage.webIdentifiers !== undefined
              ? resWeb.matchedIdentifiers
              : resNative.matchedIdentifiers,
            stage.webIdentifiers !== undefined
              ? stage.webIdentifiers
              : stage.nativeIdentifiers
          )
        ) {
          prevMatchedIdentifiers = stage.webIdentifiers ? resWeb : resNative;

          stepFound = {
            id: stage.uniqueID,
            isWebView: stage.webIdentifiers !== undefined,
            assist: stage,
            isAnchoredElement: !!stage.instruction.assistInfo.identifier,
            targetId: stage.instruction.assistInfo.identifier,
            next: stage.transition.next,
            nativeIdentifiers: stage.nativeIdentifiers,
            webIdentifiers: stage.webIdentifiers,
            isSuccess: stage.isSuccess,
          };
          // Return page to stop the find() loop and signal that we found the page
          return page;
        }
      }
    }
  });

  return stepFound;
}

function updateProjectStatus({ id, isShown, isCompleted, isFlowTriggered }) {
  switch (true) {
    case isShown: {
      allProjectStatus[id] = {
        ...allProjectStatus[id],
        isShown,
      };
      break;
    }

    case isFlowTriggered: {
      allProjectStatus[id] = {
        ...allProjectStatus[id],
        isFlowTriggered,
      };
      break;
    }

    case isCompleted: {
      allProjectStatus[id] = {
        ...allProjectStatus[id],
        isCompleted,
      };
    }
  }

  saveTheLatestStateChange();
}

// TODO: WORK on this to fix for the current flow
function receiveWebIdentifiers(webIdentifiers) {
  const projectId = Object.keys(webIdentifiers)[0];
  currentMatchedWebIdentifiers[projectId] = webIdentifiers[projectId];
}

function updateAssistInteraction(res) {
  const actionCallback = res.body;

  // Sending event in case of optin
  if (actionCallback.optIn) {
    sendAnalyticEvent(
      ANALYTICS_EVENTS.FLOW_OPT_IN,
      actionCallback.flowTitle
        ? {
            selectedFlow: actionCallback.flowTitle,
            selectedProjectId: actionCallback.projectId,
          }
        : {}
    );
  }

  if (actionCallback.deepLink) {
    sendAnalyticEvent(ANALYTICS_EVENTS.ELEMENT_ACTION, {
      actionEventType: ACTION_EVENT_TYPES.DEEP_LINK,
    });
  } else if (actionCallback.externalLink) {
    sendAnalyticEvent(ANALYTICS_EVENTS.ELEMENT_ACTION, {
      actionEventType: ACTION_EVENT_TYPES.EXTERNAL_LINK,
    });
  } else if (
    actionCallback.actionType &&
    (actionCallback.actionType === "overlayClicked" ||
      actionCallback.actionType === "optOutClick")
  ) {
    sendAnalyticEvent(ANALYTICS_EVENTS.ELEMENT_ACTION, {
      actionEventType: ACTION_EVENT_TYPES.CLOSE,
    });
  } else if (actionCallback.type === "close") {
    sendAnalyticEvent(ANALYTICS_EVENTS.ELEMENT_ACTION, {
      actionEventType: ACTION_EVENT_TYPES.CLOSE,
      actionEventValue: actionCallback.buttonLabel,
    });
  }

  if (allProjectStatus?.[activeProject.id]?.triggerCase === "PLAY_ONCE")
    updateProjectStatus({ id: activeProject.id, isFlowTriggered: true });

  // If the close action is performed on opt-in
  if (
    actionCallback.close &&
    !actionCallback.optIn &&
    currentlyRunningFlow.id === "" &&
    currentStaticFlow.status === "START"
  ) {
    sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_OPT_OUT);
    if (
      allProjectStatus[activeProject.id].triggerCase ===
      "EVERY_SESSION_UNTIL_DISMISSED"
    )
      updateProjectStatus({ id: activeProject.id, isFlowTriggered: true });
    updateViewStatusForTheProject("nDismissedByUser");
  }

  if (
    actionCallback.close &&
    !actionCallback.optIn &&
    currentlyRunningFlow.id !== "" &&
    currentStaticFlow.id === undefined
  ) {
    sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_OPT_OUT);
    if (
      allProjectStatus[currentlyRunningFlow.id].triggerCase ===
      "EVERY_SESSION_UNTIL_DISMISSED"
    )
      updateProjectStatus({
        id: currentlyRunningFlow.id,
        isFlowTriggered: true,
      });
    updateViewStatusForTheProject("nDismissedByUser");
  }

  if (
    currentStaticFlow.id !== undefined &&
    currentStaticFlow.stepsStatus.length > 0
  ) {
    // Send flow completion command to the native
    const lastStep =
      currentStaticFlow.stepsStatus[currentStaticFlow.stepsStatus.length - 1];
    const activeProjectId =
      currentlyRunningFlow.id === ""
        ? activeProject.id
        : currentlyRunningFlow.id;
    flowShown = false;

    if (lastStep.completionStep) {
      sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_SUCCESS);
      if (currentlyRunningFlow.id !== "") {
        const currentRunningFlow = completedProjectsInFlow[activeProjectId];

        const foundCompletedProject = currentRunningFlow.projects.findIndex(
          (c) => c.id === currentStaticFlow.projectId
        );

        if (foundCompletedProject !== -1) {
          currentRunningFlow.projects[foundCompletedProject].completed = true;
        }

        // In case if all the projects status are completed
        if (areAllProjectsCompleted(currentRunningFlow)) {
          updateViewStatusForTheProject("untilAllFlowsAreCompleted");
        }
      }

      if (currentlyRunningFlow.id === "")
        updateProjectStatus({ id: activeProject.id, isCompleted: true });
      sendProjectCompletion({ reset: false });

      if (
        allProjectStatus[activeProject.id].triggerCase ===
        "EVERY_SESSION_UNTIL_FLOW_COMPLETE"
      )
        updateProjectStatus({ id: activeProject.id, isFlowTriggered: true });

      updateViewStatusForTheProject("perApp");
      saveTheLatestStateChange();
      resetActiveProject();
      resetCurrentStaticFlow();
      resetFlow();
    }
  }

  if (actionCallback?.projectId) {
    const selectedWalkthrough = flowWalkthroughs[actionCallback?.projectId];

    activeProject = {
      id: selectedWalkthrough.id,
      projectType: selectedWalkthrough.projectParameters.projectType,
      isShowing: true,
      isAnchoredElement: selectedWalkthrough.isAnchoredElement,
      flows: selectedWalkthrough.flows,
      nativeIdentifiers: selectedWalkthrough.nativeIdentifiers,
      webIdentifiers: selectedWalkthrough.webIdentifiers,
      auiContent: selectedWalkthrough.auiContent,
      projectParameters: selectedWalkthrough.projectParameters,
      languages: selectedWalkthrough.languages,
      iconSetting: selectedWalkthrough.iconSetting,
      standAlone: ![
        "STATIC_FLOW",
        "STATIC_FLOW_MENU",
        "STATIC_FLOW_CHECKLIST",
      ].includes(selectedWalkthrough.projectParameters.projectType),
      isAFlow:
        selectedWalkthrough.projectParameters.projectType === "STATIC_FLOW",
      isAFlowMenu: ["STATIC_FLOW_MENU", "STATIC_FLOW_CHECKLIST"].includes(
        selectedWalkthrough.projectParameters.projectType
      ),
    };

    currentStaticFlow = {
      id: selectedWalkthrough.id,
      projectId: selectedWalkthrough.projectParameters.deploymentId,
      completed: false,
      stepsStatus: [],
      status: "RENDERING-STEPS",
    };

    flowShown = false;
    return;
  }

  if (actionCallback?.optIn) {
    previousBoundState = {};
    currentStaticFlow = {
      ...currentStaticFlow,
      status: "RENDERING-STEPS",
      onlyIcon: false,
    };
    resetFlow();
    return;
  }

  if (actionCallback?.endFlow) {
    sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_STOP);
    previousBoundState = {};
    currentStaticFlow = {
      id: undefined,
      status: undefined,
      completed: undefined,
      stepsStatus: [],
    };
    handleCloseEvent({
      clearAll: true,
    });
    return;
  }

  if (actionCallback.close) {
    if (
      currentStaticFlow.id === undefined ||
      (currentStaticFlow.id !== undefined &&
        currentStaticFlow.stepsStatus.length === 0)
    )
      handleCloseEvent({
        clearAll: true,
      });
    else
      handleCloseEvent({
        updateStepsStatus: true,
      });

    return;
  }
}

function handleCloseEvent({ clearAll = false, updateStepsStatus = false }) {
  previousBoundState = {};

  switch (true) {
    case updateStepsStatus: {
      const lastStepIndex = currentStaticFlow?.stepsStatus?.length - 1;

      if (lastStepIndex >= 0) {
        currentStaticFlow.stepsStatus[lastStepIndex].completed = true;
      }

      previousBoundState = {};
      // Rest active step
      resetActiveStep();
      break;
    }

    case clearAll: {
      updateProjectStatus({ id: activeProject.id, isCompleted: true });
      clearActiveProject();
      break;
    }
  }
}

function setCurrentSelectedLanguage(language) {
  selectedLanguage = language;
}

function resetShowForFlows() {
  tackProjectBeingIdentified.forEach((t) => {
    if (t.projectType === "STATIC_FLOW_CHECKLIST") {
      t.toShow = true;
    }
  });
}

function clearEveryThing(clearTimer = false) {
  if (clearTimer) clearInterval(timer);
  clearActiveProject();
}

function clearActiveProject() {
  previousBoundState = {};
  resetFlow();
  resetActiveStep();
  resetActiveProject();
  resetCurrentStaticFlow();
}

function resetFlow() {
  currentlyRunningFlow = {
    id: "",
    active: false,
  };
}

function resetActiveStep() {
  activeStep = {
    id: "",
    step: {},
    isAnchoredElement: false,
  };
}

function resetActiveProject() {
  activeProject = {
    id: "",
    projectType: "",
    isShowing: false,
    isAnchoredElement: false,
    standAlone: false,
    iconSetting: {},
    isAFlow: false,
    isAFlowMenu: false,
  };
}

function resetCurrentStaticFlow() {
  currentStaticFlow = {
    id: undefined,
    status: undefined,
    completed: undefined,
    stepsStatus: [],
  };
}

function handlePanelEvent(data) {
  if (data.action === "isVisible") return;
  else if (data.action === "clickEvent" && data.value) {
    sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_DISABLE);
    removeProjectFromStatusArray(data.uniqueId);
    clearEveryThing();
  }
}
