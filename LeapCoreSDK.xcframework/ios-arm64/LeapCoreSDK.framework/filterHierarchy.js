// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

function filterHierarchy(node, plat = platform) {
  // Check if the node at root level
  const isRoot = node?.layout !== undefined;
  const currentPlatform = plat;

  const width = node.screen_width;
  const height = node.screen_height;

  // Filter the nodes
  const ignoreNode = isRoot
    ? false
    : currentPlatform === "ANDROID"
    ? ignoreInvalidViewsAndroid(node, width, height)
    : ignoreInvalidViewsIOS(node);

  if (ignoreNode) return;

  // Iterate from layout or children if the node is root level
  const children = isRoot ? [{ ...node?.layout }] : node?.children;

  let filteredChildren = [];

  // Iterate through children to check invalid nodes
  children?.forEach((child) => {
    const res = filterHierarchy(child, currentPlatform);

    if (res) filteredChildren.push(child);
  });

  // Check if the siblings of the node is overlapping
  if (filteredChildren.length > 1)
    filteredChildren =
      currentPlatform === "ANDROID"
        ? ignoreOverlappingNodesAndroid(filteredChildren)
        : ignoreOverlappingNodesIOS(filteredChildren);

  // Update the new object
  isRoot
    ? (node.layout = filteredChildren[0])
    : (node.children = filteredChildren);

  // TODO : Filter views which have No Hide Descendants property
  // TODO : Avoid Filtering a certain view by it’s className (DoNotFilter)
  // TODO : iOS Filtering for react native dummy views
  // TODO : Filter by flags

  //  Return the filtered node
  return node;
}

function ignoreInvalidViewsIOS(node) {
  // Ignore if the class contains Leap string in it
  if (node?.class?.includes("Leap")) return true;

  // Ignore if the node size is invalid
  if (!!node?.clip_to_bounds && checkForEmptyBounds(node.bounds)) return true;

  // Ignore if the node is not visible
  if (node?.hidden || node?.alpha <= 0) return true;

  return false;
}

function ignoreInvalidViewsAndroid(node, width, height) {
  // Ignore if node is not in the horizontal view
  if (node.bounds?.right <= 5 || node.bounds?.left >= width) return true;

  // Ignore if the visibility is not 0
  if (node.visibility !== 0) return true;

  // Ignore node if contains LeapView or is.leap.android.aui in it's class
  if (
    node?.tag?.includes("LeapView") ||
    node?.class?.startsWith("is.leap.android.aui")
  )
    return true;

  // Ignore if node is not in the vertical view
  //  if (node.bounds?.top > height) return true;

  // Check if the node as clickable area
  if (getWidth(node.bounds) <= 0 || getHeight(node.bounds) <= 0) return true;

  // Ignore if the the node is not clickable and does not contain any children
  if (
    (node.children === undefined || node.children.length === 0) &&
    node.is_view_group &&
    !node.is_clickable &&
    !node.is_focusable &&
    !node.is_long_clickable
  )
    return true;

  return false;
}

// This function takes an array of nodes and returns a filtered array containing nodes
// that don't overlap with each other.
function ignoreOverlappingNodesIOS(nodes) {
  // Sort the nodes by zIndex in descending order
  const sortedNodes = nodes.sort(
    (a, b) => parseFloat(b.z) - parseFloat(a.z) || b.node_index - a.node_index
  );

  const filteredNodes = [sortedNodes[0]];

  // Iterate over the objects
  for (let i = 0; i < sortedNodes.length; i++) {
    const currentObject = sortedNodes[i];
    const currentBounds = currentObject.bounds;

    // Check if the current object is already present in the filteredNodes array
    const isCurrentObjPresent = filteredNodes.findIndex(
      (s) => s.uuid === currentObject.uuid
    );

    // If the current object is not the first object and it's not present in the filteredNodes array, continue to the next iteration
    if (i !== 0 && isCurrentObjPresent === -1) continue;

    // Iterate over the remaining objects and check if they are inside the current bounds
    for (let j = i + 1; j < sortedNodes.length; j++) {
      const nextObject = sortedNodes[j];
      const nextBounds = nextObject.bounds;

      // Check if the next object is already present in the filteredNodes array
      const index = filteredNodes.findIndex((s) => s.uuid === nextObject.uuid);

      // If the current object is not the first object and the next object is not present in the filteredNodes array, continue to the next iteration
      if (i !== 0 && index === -1) continue;

      // If the next object is not inside the current bounds, then add to array else remove from the array
      if (!isInsideBounds(currentBounds, nextBounds)) {
        // If the current object is the first object, add the next object to the filteredNodes array
        if (i === 0) {
          filteredNodes.push(nextObject);
        }

        continue;
      } else if (i !== 0) {
        // If the current object is not the first object and the next object is inside the current bounds, remove the next object from the filteredNodes array
        filteredNodes.splice(index, 1);
      }
    }
  }

  return filteredNodes;
}

function ignoreOverlappingNodesAndroid(children) {
  children?.sort(function (a, b) {
    return parseFloat(b.z) - parseFloat(a.z) || b.node_index - a.node_index;
  });
  const topmostSibling = children?.[children?.length - 1];
  const newChildren = [];
  if (topmostSibling) newChildren.push(topmostSibling);

  for (
    let childIndex = 0;
    childIndex < (children?.length || 0) - 1;
    childIndex++
  ) {
    const sibling = children[childIndex];

    if (
      topmostSibling?.clickableBounds === null &&
      isAClickableNode(topmostSibling?.bounds(sibling.bounds)) &&
      (!topmostSibling?.is_text_view || !topmostSibling?.is_image_view)
    )
      continue;
    if (
      isAClickableNode(topmostSibling?.clickableBounds?.(sibling.bounds)) ||
      isAClickableNode(
        topmostSibling?.clickableBounds?.(sibling.clickableBounds)
      )
    )
      continue;

    newChildren.push(sibling);
  }

  return newChildren;
}
