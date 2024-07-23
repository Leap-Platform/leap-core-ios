// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// Public methods
// Data receivers from native
function receiveDataFromNativeLayer(message) {
  if (message === null) return;
  switch (message.commandName) {
    case RECEIVING_COMMANDS.START: {
      start(message.data);
      break;
    }

    case RECEIVING_COMMANDS.SCREEN_HIERARCHY: {
      receiveScreenHierarchy(message.screenHierarchy);
      break;
    }

    case RECEIVING_COMMANDS.ASSIST_INTERACTION: {
      updateAssistInteraction(message.body);
      break;
    }

    case RECEIVING_COMMANDS.WEB_IDENTIFIERS: {
      receiveWebIdentifiers(message.identifiers); // message.identifiers is a list of identifierIds
      break;
    }

    case RECEIVING_COMMANDS.LANGUAGE_SELECTED: {
      const previousLanguage = selectedLanguage;
      setCurrentSelectedLanguage(message.language);
      if (
        currentStaticFlow.id !== undefined &&
        currentStaticFlow.stepsStatus.length !== 0
      ) {
        sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_LANGUAGE_CHANGE, {
          previousLanguage,
        });
        currentStaticFlow?.stepsStatus?.splice(-1);
        resetActiveStep();
        saveTheLatestStateChange();
      }
      break;
    }

    case RECEIVING_COMMANDS.ACTIVITY_PAUSE: {
      clearInterval(timer);
      timer = undefined;
      if (currentStaticFlow.onlyIcon) clearActiveProject();
      break;
    }

    case RECEIVING_COMMANDS.ACTIVITY_RESUME: {
      if (timer === undefined) init();
      break;
    }

    case RECEIVING_COMMANDS.ICON_STOP: {
      sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_STOP);
      clearActiveProject();
      break;
    }

    case RECEIVING_COMMANDS.ASSIST_VISIBLE: {
      updateProjectStatus({ id: activeProject.id, isShown: true });

      updateViewStatusForTheProject("nSession");

      // For the checklist
      if (
        ["STATIC_FLOW_CHECKLIST", "STATIC_FLOW_MENU"]?.includes(
          message?.data?.projectType
        )
      ) {
        resetActiveStep();
        resetCurrentStaticFlow();
      }

      if (currentStaticFlow?.status === "START") {
        sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_START);
      }

      if (currentlyRunningFlow.id) {
        if (currentStaticFlow.stepsStatus.length === 0) {
          sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_MENU_START);
        } else if (activeStep.step.assist.id === 1) {
          const parentProject = sortedProjectArray.find(
            (s) => activeProject?.id === s?.id
          );
          sendAnalyticEvent(ANALYTICS_EVENTS.FLOW_START, {
            parentProjectId: parentProject.projectParameters.projectId,
            parentProjectName: parentProject.projectParameters.projectName,
          });
        }
      }

      sendAnalyticEvent(ANALYTICS_EVENTS.ELEMENT_SEEN);
      break;
    }

    case RECEIVING_COMMANDS.EMBED_PROJECT: {
      console.log("EMBED_PROJECT", message.projectId);
      break;
    }

    case RECEIVING_COMMANDS.STOP_PREVIEW: {
      inPreviewMode = false;
      sendMessageToNative({
        command: SENDING_COMMANDS.NO_CONTEXT_FOUND,
      });
      clearEveryThing(true);
      break;
    }

    case RECEIVING_COMMANDS.DISABLE_PANEL_EVENT: {
      handlePanelEvent(message.data);
      break;
    }

    case RECEIVING_COMMANDS.PREVIEW_CONFIG: {
      inPreviewMode = true;
      clearEveryThing(true);

      enterPreviewMode(JSON.parse(message.previewConfig));
      console.log("CONFIG JSON IN STRING", message.previewConfig);
      break;
    }

    case RECEIVING_COMMANDS.USER_PROPERTIES: {
      console.log("USER_PROPERTIES", message.properties);
      var propertiesJSON = JSON.parse(message.properties);
      console.log("propertiesJSON", propertiesJSON);
      let keys = Object.keys(propertiesJSON);
      keys.forEach((key) => {
        console.log(key, propertiesJSON[key]);
        let value = propertiesJSON[key];
        if (typeof value === "number") {
          console.log(key + " is a number");
        } else if (typeof value === "string") {
          if (isValidDate(value)) {
            console.log(key + " is a date");
          } else {
            console.log(key + " is a string");
          }
        }
      });
      break;
    }

    case RECEIVING_COMMANDS.APP_LOCALE: {
      setCurrentSelectedLanguage(message.appLocale);
      break;
    }

    default: {
      console.log("No command found", JSON.stringify(message));
      break;
    }
  }
}
