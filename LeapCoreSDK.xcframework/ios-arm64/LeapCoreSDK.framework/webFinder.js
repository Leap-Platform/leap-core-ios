// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// {
//   project_id_value: {
//     matchedNode: [{
//       id: "",
//       bounds: []
//     }],
//     matchedIdentifiers: ["identifier_id_1", "identifier_id_2"],
//     unMatchedIdentifiers: ["identifier_id_3", "identifier_id_4"]
//   }
// }

// Context detection logic for the web view
function createFinderJavascript(
  webIdentifiers,
  projectId,
  webViewBounds,
  webViewScale
) {
  let webIdentificationJavascriptFunction =
    "function runWhatfixMobileWebFinder(){";
  let webIdentificationJavascript = `let matchedNode = []; 
     let projectWrapper = { "matchedNode": matchedNode }; 
     let result = { ${projectId} : projectWrapper }; 
     let matchedIdentifiers = [];
     let unMatchedIdentifiers = [];`;

  for (const key in webIdentifiers) {
    let webIdentifier = webIdentifiers[key];
    webIdentificationJavascript = webIdentificationJavascript.concat(
      createIfElseStatement(key, webIdentifier, webViewBounds, webViewScale)
    );
  }

  webIdentificationJavascript = webIdentificationJavascript
    .concat("projectWrapper.matchedIdentifiers=matchedIdentifiers;")
    .concat("projectWrapper.unMatchedIdentifiers=unMatchedIdentifiers;")
    .concat("return result;");
  webIdentificationJavascriptFunction = webIdentificationJavascriptFunction
    .concat(webIdentificationJavascript)
    .concat("} runWhatfixMobileWebFinder();");
  return webIdentificationJavascriptFunction;
}

/*
      1. Create basic querySelectorAll statement
      2. Add null checks
      3. Add index and innerText check
  */
function createIfElseStatement(id, webIdentifier, webViewBounds, webViewScale) {
  let statementBlock = "if(";
  let querySelectorAllStatement =
    createQuerySelectorAllStatement(webIdentifier);

  if (
    webIdentifier["innerText"] === undefined ||
    webIdentifier["innerText"]["ang"] === undefined
  ) {
    statementBlock = statementBlock
      .concat(querySelectorAllStatement)
      .concat(")");
  } else {
    statementBlock = statementBlock
      .concat(querySelectorAllStatement)
      .concat(" && ")
      .concat(
        querySelectorAllStatement +
          ".innerText === '" +
          webIdentifier["innerText"]["ang"]
      )
      .concat("')");
  }

  var positionQuery = `${querySelectorAllStatement}.getBoundingClientRect()`;

  //write if and else logic
  statementBlock = statementBlock
    .concat("{")
    .concat(`matchedIdentifiers.push("${id}");`)
    .concat(
      `
      var position = ${positionQuery};
      var bounds = {
          left: position.left * ${webViewScale} + ${webViewBounds.left},
          top: position.top * ${webViewScale} + ${webViewBounds.top},
          right: position.right * ${webViewScale} + ${webViewBounds.left},
          bottom: position.bottom * ${webViewScale} + ${webViewBounds.top}
        };
      `
    )
    .concat(
      `matchedNode.push({ 
        "id" : "${id}", 
        "bounds" : bounds
      });`
    )
    .concat("}");
  statementBlock = statementBlock.concat(
    `else{unMatchedIdentifiers.push("${id}");}`
  );
  return statementBlock;
}

function createQuerySelectorAllStatement(webIdentifier) {
  let tagName = webIdentifier.tagName;
  let attributes = webIdentifier["attributes"]["ang"];
  let querySelectorAllStatement = "document.querySelectorAll('".concat(tagName);
  for (const attributeKey in attributes) {
    let attributeValue = attributes[attributeKey];
    let attributeString = "["
      .concat(attributeKey)
      .concat('="')
      .concat(attributeValue)
      .concat('"]');
    querySelectorAllStatement =
      querySelectorAllStatement.concat(attributeString);
  }
  var index = webIdentifier["index"];
  if (index && index < 0) {
    index = 0;
  }
  querySelectorAllStatement = querySelectorAllStatement.concat(`')[${index}]`);
  return querySelectorAllStatement;
}
