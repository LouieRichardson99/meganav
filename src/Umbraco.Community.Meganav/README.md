# Umbraco.Community.Meganav

Meganav rebuilt for the modern (Lit / web component) backoffice, targeting **Umbraco 14 – 19**.

## Structure

```
Client/src
├── manifests.ts                     # bundle entry – property editor UIs, modals, property actions + localization
├── types.ts                         # MeganavItem / MeganavValue / MeganavItemType
├── events.ts                        # events bubbled up to the property editor
├── lang/en.ts
├── property-editor/
│   ├── meganav-property-editor-ui   # owns the value, collapsed state and page lookups, opens the modals (was editor.controller.js)
│   └── meganav-item-types-property-editor-ui  # the `itemTypes` data type setting (was configuration.html)
├── modals/
│   ├── item-type/                   # edit one item type (was itemTypeDialog)
│   └── item/                        # an item's settings, edit link, change type (was settingsDialog)
├── property-actions/                # expand all / collapse all / populate from tree (was setPropertyActions)
├── components/
│   ├── meganav-items                # sortable list, rendered recursively (was ui-tree-nodes)
│   ├── meganav-item                 # one node: insert line, preview, children slot (was node.html)
│   ├── meganav-preview              # uui-ref-node + collapse toggle (was meganavPreview)
│   └── meganav-actions              # hide/show / edit / remove (was meganavActions)
└── utils/
    ├── tree.ts                      # immutable tree helpers
    ├── link.ts                      # item <-> UmbLinkPickerLink mapping, UDIs, opening the link picker
    ├── entities.ts                  # live name / icon / URL / state of linked documents and media
    └── item-types.ts                # which item types are allowed where
```

- **Link picking** uses Umbraco's own `UMB_LINK_PICKER_MODAL` – no custom dialog.
- **Insert between items** uses the native `uui-button-inline-create` (replaces `meganavAdd`).
- **Drag and drop** uses `UmbSorterController`. Every level shares one sorter identifier so items move
  freely between levels. Dragging an item right by an indent nests it under the item above; dragging the
  last child left moves it out after its parent. Drops into an item's own descendants, into another
  Meganav property, or beyond *Max depth* are refused. There's no add child button: nest an item by dragging it.
- **Hide/show** (eye) sets `visible` on the item and all its descendants; hidden items are shown faded.
- **Live page data**: names, icons, URLs and state of linked documents/media are looked up each time the
  editor loads, as legacy did. `name` is only stored when it differs from the linked page's name, so renamed
  pages show their new name. Unpublished, trashed and missing pages are tagged and faded.
- **Item types** (data type setting): name, alias, icon, settings element type, allowed at root and allowed
  child types. Adding asks for a type when more than one is allowed there; drops are refused where an item's
  type isn't allowed; untyped items can go anywhere, and with a single item type every item is of that type.
  Adding opens Umbraco's link picker, then the item modal's Settings tab when the type has settings. Clicking an
  item opens its link in the link picker; the cog opens the item modal, or the link picker when there's nothing
  else to edit. The modal has a Link tab (the link and *Change type*) and, when the type has settings, a
  Settings tab (the settings element type's properties). With more than one item type, the list shows each
  item's type icon. Custom views from the legacy package aren't supported.
- **Property actions** (the ⋯ menu): *Expand all*, *Collapse all*, and *Populate from tree*, which appends a
  link to each child of the current document (documents only, writable properties only, capped at *Max items*).

## Value

```json
[
  {
    "id": "{guid}",
    "name": "{optional-name}",
    "target": "{optional-target}",
    "queryString": "{optional-querystring}",
    "udi": "{optional-udi}",
    "url": "{optional-url}",
    "visible": false,
    "itemTypeId": "{optional-item-type-id}",
    "settings": {
      "{settings-property-alias}": "{property editor value}"
    },
    "children": [...]
  }
]
```

`visible` is only written once an item has been hidden or shown; a missing value means visible. `name` is an
override of the linked page's name. `settings` holds the raw property editor values of the item type's
settings element type, keyed by property alias.

## Using it in views

The property's value is an `IEnumerable<MeganavItem>`:

```cshtml
@foreach (var item in Model.MainNavigation)
{
    <a href="@item.Url" target="@item.Target">@item.Name</a>

    @* item.Level (1 at the top), item.ItemType?.Alias, item.Content (the linked page), item.Settings (the settings element type's model) and item.Children *@
}
```

Hidden items, links to unpublished, trashed or deleted pages, and items whose type isn't allowed where they are
any more, are left out. The Delivery API returns the same tree, with `name`, `link`, `itemType` (the alias),
`settings` and `children`.

## Data type settings

| Alias | Description |
| --- | --- |
| `itemTypes` | Item types: `[{ id, name, alias, icon, settingsType, allowAtRoot, allowedTypes }]` (`allowedTypes` empty = all) |
| `maxItems` | Max number of top level items |
| `maxDepth` | Max number of levels |
| `hideAnchor` | Hide the anchor/query string field in the link picker |
| `hideTarget` | Hide the "open in new window" toggle (Umbraco 15+) |

## Building

```bash
cd Client
npm install
npm run build   # outputs to wwwroot/App_Plugins/Meganav
```

`dotnet build` on the project runs the client build too. The client is compiled against the
v14 `@umbraco-cms/backoffice` types as the lowest common denominator; only APIs that exist from
v14 onwards are used.
