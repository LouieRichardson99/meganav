import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";

export default {
  meganav: {
    addItem: "Add item",
    allowAllTypes: "Allow all types",
    allowedTypes: "Allowed child types",
    changeType: "Change type",
    chooseType: "Choose type",
    editLink: "Edit link",
    itemType: "Item type",
    link: "Link",
    newWindow: "New window",
    notFound: "Not found",
    permissions: "Permissions",
    removeItemHeadline: "Remove item",
    removeItemContent: (name: string) =>
      `Are you sure you want to remove ${name ? `"${name}"` : "this item"} and all of its children?`,
    settingsType: "Settings type",
    settingsTypeDescription:
      "An element type whose properties are edited as each item's settings.",
    toggleCollapse: "Toggle collapse",
    untitled: "Untitled",
  },
} satisfies UmbLocalizationDictionary;
