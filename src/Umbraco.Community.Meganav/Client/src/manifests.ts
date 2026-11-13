const propertyEditorUi = {
  type: "propertyEditorUi",
  alias: "Meganav.PropertyEditorUi.Meganav",
  name: "Meganav Property Editor UI",
  element: () =>
    import("./property-editor/meganav-property-editor-ui.element.js"),
  meta: {
    label: "Meganav",
    icon: "icon-sitemap",
    group: "pickers",
    propertyEditorSchemaAlias: "Umbraco.Plain.Json",
    settings: {
      properties: [
        {
          alias: "itemTypes",
          label: "Item types",
          description:
            "Types of nav item, each with their own icon, settings and where they're allowed.",
          propertyEditorUiAlias: "Meganav.PropertyEditorUi.ItemTypes",
        },
        {
          alias: "maxItems",
          label: "Max items",
          description:
            "Maximum number of top level items. Leave empty for unlimited.",
          propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
          config: [
            {
              alias: "min",
              value: 0,
            },
          ],
        },
        {
          alias: "maxDepth",
          label: "Max depth",
          description: "Maximum number of levels. Leave empty for unlimited.",
          propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer",
          config: [
            {
              alias: "min",
              value: 0,
            },
          ],
        },
        {
          alias: "hideAnchor",
          label: "Hide anchor/query string",
          description: "Hide the anchor/query string input in the link picker.",
          propertyEditorUiAlias: "Umb.PropertyEditorUi.Toggle",
        },
        {
          alias: "hideTarget",
          label: "Hide target",
          description:
            'Hide the "open in new window" option in the link picker (Umbraco 15+).',
          propertyEditorUiAlias: "Umb.PropertyEditorUi.Toggle",
        },
      ],
    },
  },
};

const propertyActions = [
  {
    type: "propertyAction",
    kind: "default",
    alias: "Meganav.PropertyAction.ExpandAll",
    name: "Meganav Expand All Property Action",
    api: () => import("./property-actions/expand-all.property-action.js"),
    forPropertyEditorUis: [propertyEditorUi.alias],
    meta: {
      icon: "icon-arrow-down",
      label: "Expand all",
    },
  },
  {
    type: "propertyAction",
    kind: "default",
    alias: "Meganav.PropertyAction.CollapseAll",
    name: "Meganav Collapse All Property Action",
    api: () => import("./property-actions/collapse-all.property-action.js"),
    forPropertyEditorUis: [propertyEditorUi.alias],
    meta: {
      icon: "icon-arrow-up",
      label: "Collapse all",
    },
  },
  {
    type: "propertyAction",
    kind: "default",
    alias: "Meganav.PropertyAction.PopulateFromTree",
    name: "Meganav Populate From Tree Property Action",
    api: () =>
      import("./property-actions/populate-from-tree.property-action.js"),
    forPropertyEditorUis: [propertyEditorUi.alias],
    meta: {
      icon: "icon-filter-arrows",
      label: "Populate from tree",
    },
    conditions: [
      {
        alias: "Umb.Condition.Property.Writable",
      },
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Umb.Workspace.Document",
      },
    ],
  },
];

// Only used by the `itemTypes` setting, so it has no schema and can't be picked for a data type.
const itemTypesPropertyEditorUi = {
  type: "propertyEditorUi",
  alias: "Meganav.PropertyEditorUi.ItemTypes",
  name: "Meganav Item Types Property Editor UI",
  element: () =>
    import("./property-editor/meganav-item-types-property-editor-ui.element.js"),
  meta: {
    label: "Meganav item types",
    icon: "icon-sitemap",
    group: "common",
  },
};

const modals = [
  {
    type: "modal",
    alias: "Meganav.Modal.ItemType",
    name: "Meganav Item Type Modal",
    element: () => import("./modals/item-type/item-type-modal.element.js"),
  },
  {
    type: "modal",
    alias: "Meganav.Modal.Item",
    name: "Meganav Item Modal",
    element: () => import("./modals/item/item-modal.element.js"),
  },
];

const localizations = [
  {
    type: "localization",
    alias: "Meganav.Localization.En",
    name: "Meganav English",
    meta: { culture: "en" },
    js: () => import("./lang/en.js"),
  },
];

export const manifests = [
  propertyEditorUi,
  itemTypesPropertyEditorUi,
  ...modals,
  ...propertyActions,
  ...localizations,
];
