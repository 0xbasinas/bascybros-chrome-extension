export function createContextMenus() {
  chrome.contextMenus.removeAll()

  chrome.contextMenus.create({
    id: "save-page-as-resource",
    title: "Save page to BascyBros",
    contexts: ["page"],
  })

  chrome.contextMenus.create({
    id: "take-screenshot",
    title: "Take screenshot to BascyBros",
    contexts: ["page"],
  })

  chrome.contextMenus.create({
    id: "separator-1",
    type: "separator",
    contexts: ["selection", "link"],
  })

  chrome.contextMenus.create({
    id: "save-selection-as-note",
    title: "Save selection to BascyBros",
    contexts: ["selection"],
  })

  chrome.contextMenus.create({
    id: "save-link-as-resource",
    title: "Save link to BascyBros",
    contexts: ["link"],
  })
}
