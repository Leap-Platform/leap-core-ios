// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// Utility function to standardize key names in idParams
// This function renames certain keys and removes the original ones
function standardizeIdParams(params) {
  const mappings = {
    R_ID: "id",
    AR_ID: "ar_id",
    className: "class",
    CONTENT_DESC: "content_desc",
    ACC_ID: "acc_id",
    TAG: "tag",
    ACC_LABEL: "acc_label",
  };

  const standardized = { ...params };

  for (const [oldKey, newKey] of Object.entries(mappings)) {
    if (standardized[oldKey]) {
      standardized[newKey] = standardized[oldKey];
      delete standardized[oldKey];
    }
  }

  return standardized;
}

// Function to process and return the target details
function getTargetValuesToMatch(target, relationToTarget) {
  if (!relationToTarget) return {};

  // Standardize the target's parameters
  const targetIdParams = standardizeIdParams({ ...target?.idParams });

  // Fix potential misnamed property
  if (targetIdParams.text?.ang) {
    targetIdParams.text = targetIdParams.text.ang;
  }

  // Return a detailed object with the relationship to the target
  return {
    ...targetIdParams,
    relationship: relationToTarget,
  };
}

// Main function to convert identifiers to an array with transformed keys
function getIdentifiersInArray(identifiers) {
  const arrayResult = []; // Initialize an empty result array

  // Loop through each entry in the identifiers object
  for (const [name, value] of Object.entries(identifiers)) {
    const idParams =
      name === "wfxWebViewList"
        ? standardizeIdParams({ ...value })
        : standardizeIdParams({ ...value.idParams });

    // Handle potential misnamed property in idParams
    if (idParams.text?.ang) {
      idParams.text = idParams.text.ang;
    }

    if (value.activityName) {
      idParams.activityName = value.activityName;
    }

    if (value.controller) {
      idParams.controller = value.controller;
    }

    const targetValuesToMatch = getTargetValuesToMatch(
      value.target,
      value.relationToTarget
    );

    // Build the resulting object
    arrayResult.push({
      name, // The key name
      ...idParams, // Standardized idParams
      target: targetValuesToMatch, // Any target data
    });
  }

  return arrayResult; // Return the populated array
}

function findMatchingNode(root, identifier) {
  // Helper function to check if a node matches the given identifier
  const isMatchingNode = (node, identifier) => {
    for (const [key, value] of Object.entries(identifier)) {
      // Exclude 'name' from matching criteria
      if (key === "name") continue;

      // For Android resource id
      if (key === "ar_id") {
        const nodeId = node.id?.split(`android:id/`).pop();
        if (nodeId !== value) return false;
      }

      // Special handling for 'id', compare after transformation
      if (key === "id") {
        const nodeId = node[key]
          ?.split(`${root.ROOT_NODE.client_package_name}:id/`)
          .pop();
        if (nodeId !== value) return false;
      } else {
        // For other keys, direct comparison
        if (node[key] !== value) return false;
      }
    }
    return true;
  };

  // Loop through the keys and find a matching node
  for (const id of Object.keys(root)) {
    const node = root[id];
    if (isMatchingNode(node, identifier)) {
      return node; // Return early once a match is found
    }
  }

  // Return undefined if no match is found
  return undefined;
}

// Follow a relationship path from a given node
function followRelationship(root, startNode, relationship) {
  let currentNode = startNode;

  for (const step of relationship) {
    if (!currentNode) {
      return null; // If the current node is null, break out
    }

    const direction = step.charAt(0); // 'P' or 'C'

    if (direction === "P") {
      currentNode = root[currentNode.parentId] || null; // Go to the parent node
      continue;
    } else if (direction === "C") {
      const index = parseInt(step.slice(1), 10) || 0; // Default child index to 0 if not specified
      if (currentNode.children.length > 0) {
        currentNode = currentNode.children.find((s) => s.node_index === index); // Go to the specified child node index
        continue;
      } else {
        return null; // Return null if child index is out of bounds
      }
    }
  }

  return currentNode;
}

// TODO: Optimization needed
function findMatches(filteredHierarchy, identifiers) {
  // Initialize the output array
  const matchedIdentifiers = [];
  const unMatchedIdentifiers = [];
  const matchedNode = [];
  const identifiersArray = getIdentifiersInArray(identifiers);

  console.log(JSON.stringify(identifiersArray));

  // Iterate over each object in the second array
  identifiersArray.forEach((identifier) => {
    const name = identifier.name; // Store the name for the output
    let found = false; // Flag to indicate if a match is found

    /*
      Step: 1
      Check if the element is referenced or not
      if the target array is empty the the node is identified uniquely
      */

    if (Object.keys(identifier?.target).length === 0) {
      delete identifier.target;

      const hierarchy = getFlattenedHierarchy({
        currentNode: filteredHierarchy,
        parentId: undefined,
        root: true,
      });

      if (
        identifier?.activityName &&
        !hierarchy[0]?.activity_name?.includes(identifier?.activityName)
      ) {
        unMatchedIdentifiers.push(name);
      } else if (
        identifier?.controller &&
        !hierarchy[0]?.controller?.includes(identifier?.controller)
      ) {
        unMatchedIdentifiers.push(name);
      } else {
        delete identifier.activityName;
        delete identifier.controller;

        // Iterate over each object in the first array
        for (const node of hierarchy) {
          let isMatch = true; // Assume a match until proven otherwise
          // Check if all key-value pairs in identifier (except 'name') match with node
          for (const key in identifier) {
            if (
              key !== "name" &&
              key !== "id" &&
              node[key] !== identifier[key]
            ) {
              isMatch = false; // If any key doesn't match, it's not a match
              break;
            } else if (
              key === "id" &&
              node[key]
                ?.split(`${hierarchy[0].client_package_name}:id/`)
                .pop() !== identifier[key]
            ) {
              isMatch = false; // If any key doesn't match, it's not a match
              break;
            }
          }

          // If a match is found, set found to true and break the loop
          if (isMatch) {
            found = true;
            matchedNode.push({
              id: name,
              bounds: node.bounds,
              scale: node.scale,
            });
            break;
          }
        }

        // Add the result to the output array
        found ? matchedIdentifiers.push(name) : unMatchedIdentifiers.push(name);
        return;
      }
    } else {
      /*
      Step: 2
      Check if the element is referenced or not
      if the target array is not empty then find out the unique node and track the non referenced node by the relation ship array and compare with the params
      */

      const mappedHierarchy = {};
      const target = identifier.target;
      delete identifier.target;

      getFlattenedHierarchy({
        currentNode: filteredHierarchy,
        parentId: undefined,
        root: true,
        map: true,
        hierarchy: mappedHierarchy,
      });

      if (
        identifier?.activityName &&
        !mappedHierarchy.ROOT_NODE?.activity_name?.includes(
          identifier?.activityName
        )
      ) {
        unMatchedIdentifiers.push(name);
      } else if (
        identifier?.controller &&
        !mappedHierarchy.ROOT_NODE?.controller?.includes(identifier?.controller)
      ) {
        unMatchedIdentifiers.push(name);
      } else {
        delete identifier.activityName;
        delete identifier.controller;

        const referenceNode = findMatchingNode(mappedHierarchy, identifier);

        if (!referenceNode) return unMatchedIdentifiers.push(name);

        const actualNode = followRelationship(
          mappedHierarchy,
          referenceNode,
          target.relationship
        );

        if (!actualNode) return unMatchedIdentifiers.push(name);

        delete target.relationship;

        let isMatch = true;

        // Check if matching to the node is required
        if (Object.keys(target).length > 1) {
          for (const key in target) {
            if (key !== "id" && actualNode?.[key] !== target?.[key]) {
              isMatch = false; // If any key doesn't match, it's not a match
              break;
            } else if (
              key === "ar_id" &&
              actualNode["id"]?.split(`android:id/`).pop() !== target["id"]
            ) {
              isMatch = false; // If any key doesn't match, it's not a match
              break;
            } else if (
              key === "id" &&
              actualNode[key]
                ?.split(`${hierarchy[0].client_package_name}:id/`)
                .pop() !== target[key]
            ) {
              isMatch = false; // If any key doesn't match, it's not a match
              break;
            }
          }
        }

        isMatch
          ? matchedNode.push({
              id: name,
              bounds: actualNode?.bounds,
              scale: actualNode?.scale,
            })
          : "";

        isMatch
          ? matchedIdentifiers.push(name)
          : unMatchedIdentifiers.push(name);
      }
    }
  });

  return {
    matchedIdentifiers,
    unMatchedIdentifiers,
    matchedNode,
  }; // Return the final output array
}

// Flatten the hierarchy
function getFlattenedHierarchy({
  currentNode,
  parentId,
  root = true,
  map = false,
  hierarchy = {},
}) {
  // If parent Id is not present then add this
  if (parentId === undefined) parentId = "NULL_PARENT_UUID";

  const list = [];

  // Final check both root and node not present the exit
  if (currentNode === undefined) return list;

  // Assign the parent node to the current node
  currentNode.parentId = parentId || "";

  // Check if the node is a web node
  if (currentNode.normalised_bounds !== undefined && currentNode.bounds) {
    currentNode.bounds = currentNode.normalised_bounds;
  }

  map
    ? (hierarchy[currentNode.uuid || "ROOT_NODE"] = currentNode)
    : list.push(currentNode);

  // If it's a root node
  if (
    root &&
    currentNode.layout?.children?.length &&
    currentNode.layout?.children?.length > 0
  ) {
    const layout = currentNode.layout;
    const childrenLength = layout?.children?.length || 0;

    for (let i = 0; i < childrenLength; i++) {
      const res = getFlattenedHierarchy({
        currentNode: layout?.children?.[i],
        parentId: layout.uuid,
        root: false,
        map,
        hierarchy,
      });

      list.push(...res);
    }
  }

  // Apart from root node
  else if (currentNode.children?.length && currentNode.children?.length > 0) {
    currentNode?.children?.forEach((n) => {
      const res = getFlattenedHierarchy({
        currentNode: {
          ...n,
          boundingArea: getBoundingArea(n?.bounds) || 0,
        },
        parentId: currentNode.uuid,
        root: false,
        map,
        hierarchy,
      });

      list.push(...res);
    });
  }

  return list;
}
