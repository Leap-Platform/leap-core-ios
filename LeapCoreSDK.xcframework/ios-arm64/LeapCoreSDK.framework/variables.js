// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

var filteredHierarchy = {};
var intervalTime = 1000;
var platform = "ANDROID";
var appApiKey = "";
var selectedLanguage = "";
let currentLeapUserId = "";
let currentSessionId = "";
let lastUpdatedConfigAt = undefined;
let arrayConfigFromAPI = [];
let sortedProjectArray = [];
let allProjectStatus = {};
let flowWalkthroughs = {};
let flowShown = false;
let inPreviewMode = false;
let currentlyRunningFlow = {
  id: "",
  active: false,
};
let timer = undefined;
let tackProjectBeingIdentified = [];
let prevMatchedIdentifiers = [];
let currentMatchedWebIdentifiers = {};
let previousBoundState = {};
let iconRenderingProjectId = "";

let activeStep = {
  id: "",
  step: {},
  isAnchoredElement: false,
};

let activeProject = {
  id: "",
  projectType: "",
  iconSetting: {},
  isShowing: false,
  isAnchoredElement: false,
  standAlone: false,
  isAFlow: false,
  isAFlowMenu: false,
};

let currentStaticFlow = {
  id: undefined,
  status: undefined,
  completed: undefined,
  stepsStatus: [],
};

let completedProjectsInFlow = {};

const SENDING_COMMANDS = {
  SAVE_CONFIG: "SAVE_CONFIG",
  WEB_SCRIPT: "WEB_SCRIPT",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
  SAVE_USER_STATE: "SAVE_USER_STATE",
  ANALYTICS_EVENT: "ANALYTICS_EVENT",
  NO_CONTEXT_FOUND: "NO_CONTEXT_FOUND",
  WALKTHROUGH_FOUND: "WALKTHROUGH_FOUND",
  UPDATE_ASSIST_BOUNDS: "UPDATE_ASSIST_BOUNDS",
  UPDATE_STEP_BOUNDS: "UPDATE_STEP_BOUNDS",
  STEP_FOUND: "STEP_FOUND",
  ASSIST_FOUND: "ASSIST_FOUND",
  HIERARCHY: "HIERARCHY",
};

const RECEIVING_COMMANDS = {
  START: "START",
  SCREEN_HIERARCHY: "SCREEN_HIERARCHY",
  ASSIST_INTERACTION: "ASSIST_INTERACTION",
  WEB_IDENTIFIERS: "WEB_IDENTIFIERS",
  LANGUAGE_SELECTED: "LANGUAGE_SELECTED",
  ACTIVITY_PAUSE: "ACTIVITY_PAUSE",
  ACTIVITY_RESUME: "ACTIVITY_RESUME",
  ICON_STOP: "ICON_STOP",
  ASSIST_VISIBLE: "ASSIST_VISIBLE",
  USER_PROPERTIES: "USER_PROPERTIES",
  EMBED_PROJECT: "EMBED_PROJECT",
  APP_LOCALE: "APP_LOCALE",
  PREVIEW_CONFIG: "PREVIEW_CONFIG",
  DISABLE_PANEL_EVENT: "DISABLE_PANEL_EVENT",
  STOP_PREVIEW: "STOP_PREVIEW",
};

const ANALYTICS_EVENTS = {
  FLOW_START: "flow_start",
  FLOW_MENU_START: "flow_menu_start",
  FLOW_STOP: "flow_stop",
  FLOW_OPT_IN: "flow_opt_in",
  FLOW_OPT_OUT: "flow_opt_out",
  ELEMENT_SEEN: "element_seen",
  ELEMENT_ACTION: "element_action",
  FLOW_LANGUAGE_CHANGE: "flow_language_change",
  FLOW_SUCCESS: "flow_success",
  FLOW_DISABLE: "flow_disable",
  PROJECT_TERMINATION: "project_termination",
};

const ACTION_EVENT_TYPES = {
  DEEP_LINK: "deep_link",
  EXTERNAL_LINK: "external_link",
  CLOSE: "close",
};
