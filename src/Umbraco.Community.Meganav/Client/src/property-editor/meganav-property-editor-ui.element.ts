import type { MeganavItem, MeganavItemType, MeganavValue } from "../types.js";
import {
  MeganavAddItemEvent,
  MeganavChildrenChangeEvent,
  MeganavEditItemEvent,
  MeganavEditLinkEvent,
  MeganavRemoveItemEvent,
  MeganavToggleCollapseEvent,
  MeganavToggleVisibilityEvent,
} from "../events.js";
import { pickLink, toUdi } from "../utils/link.js";
import {
  findItemType,
  getAllowedTypes,
  normalizeItemTypes,
} from "../utils/item-types.js";
import { MEGANAV_ITEM_MODAL } from "../modals/item/item-modal.token.js";
import {
  MeganavEntityResolver,
  type MeganavEntityInfo,
} from "../utils/entities.js";
import {
  findItem,
  findParent,
  getParentIds,
  getUdis,
  insertItem,
  normalize,
  removeItem,
  setChildren,
  setVisible,
  updateItem,
} from "../utils/tree.js";
import {
  css,
  customElement,
  html,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbId } from "@umbraco-cms/backoffice/id";
import {
  UMB_ITEM_PICKER_MODAL,
  UMB_MODAL_MANAGER_CONTEXT,
  umbConfirmModal,
} from "@umbraco-cms/backoffice/modal";
import {
  UMB_DOCUMENT_WORKSPACE_CONTEXT,
  UmbDocumentTreeRepository,
} from "@umbraco-cms/backoffice/document";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";
import { UMB_PROPERTY_DATASET_CONTEXT } from "@umbraco-cms/backoffice/property";
import type { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import "../components/meganav-items.element.js";

// Implements `UmbPropertyEditorUiElement`, which moved package between v14 and v16, so it's not imported.
@customElement("meganav-property-editor-ui")
export class MeganavPropertyEditorUiElement extends UmbLitElement {
  readonly #editorId = UmbId.new();

  readonly #entityResolver = new MeganavEntityResolver(this);

  readonly #requestedUdis = new Set<string>();

  @property({ attribute: false }) public get value(): MeganavValue {
    return this._items;
  }

  public set value(value: MeganavValue | undefined) {
    // Ignore our own value being handed back to us, so the tree isn't rebuilt mid-drag.
    if (JSON.stringify(value ?? []) === JSON.stringify(this._items)) return;

    this._items = normalize(value, () => UmbId.new());
  }

  @property({ attribute: false }) public set config(
    config: UmbPropertyEditorConfigCollection | undefined,
  ) {
    this._maxItems = Number(config?.getValueByAlias("maxItems")) || undefined;
    this._maxDepth = Number(config?.getValueByAlias("maxDepth")) || undefined;
    this._hideTarget = !!config?.getValueByAlias("hideTarget");
    this._hideAnchor = !!config?.getValueByAlias("hideAnchor");
    this._itemTypes = normalizeItemTypes(config?.getValueByAlias("itemTypes"));
  }

  /** Supported from v15; ignored by earlier versions. */
  @property({ type: Boolean, reflect: true }) readonly = false;

  @state() private _items: Array<MeganavItem> = [];

  @state() private _collapsedIds: ReadonlySet<string> = new Set();

  @state() private _entities: ReadonlyMap<string, MeganavEntityInfo> =
    new Map();

  @state() private _itemTypes: Array<MeganavItemType> = [];

  @state() private _maxItems?: number;

  @state() private _maxDepth?: number;

  private _hideTarget = false;

  private _hideAnchor = false;

  constructor() {
    super();

    this.addEventListener(MeganavAddItemEvent.TYPE, (e) => {
      const { parentId, index } = e as MeganavAddItemEvent;

      this.#addItem(parentId, index);
    });

    this.addEventListener(MeganavEditItemEvent.TYPE, (e) =>
      this.#editItem((e as MeganavEditItemEvent).id),
    );

    this.addEventListener(MeganavEditLinkEvent.TYPE, (e) =>
      this.#editLink((e as MeganavEditLinkEvent).id),
    );

    this.addEventListener(MeganavRemoveItemEvent.TYPE, (e) =>
      this.#removeItem((e as MeganavRemoveItemEvent).id),
    );

    this.addEventListener(MeganavToggleCollapseEvent.TYPE, (e) =>
      this.#toggleCollapse((e as MeganavToggleCollapseEvent).id),
    );

    this.addEventListener(MeganavToggleVisibilityEvent.TYPE, (e) =>
      this.#toggleVisibility((e as MeganavToggleVisibilityEvent).id),
    );

    this.addEventListener(MeganavChildrenChangeEvent.TYPE, (e) => {
      const { parentId, children } = e as MeganavChildrenChangeEvent;
      // A sorter's model can hold stale copies of its items when an item moves between lists
      // (it hasn't re-rendered since the other list changed), so only take the order from it
      // and use the current version of each item from the tree.
      const current = children.map(
        (child) => findItem(this._items, child.id) ?? child,
      );

      this.#setValue(setChildren(this._items, parentId, current));
    });
  }

  override willUpdate(changed: Map<PropertyKey, unknown>) {
    super.willUpdate(changed);

    if (changed.has("_items")) {
      const udis = getUdis(this._items).filter(
        (udi) => !this.#requestedUdis.has(udi),
      );

      if (udis.length) {
        this.#resolveEntities(udis);
      }
    }
  }

  public expandAll() {
    this._collapsedIds = new Set();
  }

  public collapseAll() {
    this._collapsedIds = new Set(getParentIds(this._items));
  }

  /** Appends an item for each child of the document being edited. */
  public async populateFromTree() {
    const workspace = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    const unique = workspace?.getUnique();

    if (!unique) return;

    const { data } = await new UmbDocumentTreeRepository(
      this,
    ).requestTreeItemsOf({
      parent: {
        unique,
        entityType: "document",
      },
    });

    if (!data?.items.length) return;

    const remaining = this._maxItems
      ? this._maxItems - this._items.length
      : data.items.length;
    const items = data.items
      .slice(0, Math.max(remaining, 0))
      .map((child): MeganavItem => ({
        id: UmbId.new(),
        udi: toUdi("document", child.unique),
        settings: {},
        children: [],
      }));

    this.#setValue([...this._items, ...items]);
  }

  async #resolveEntities(
    udis: Array<string>,
  ): Promise<Map<string, MeganavEntityInfo>> {
    udis.forEach((udi) => this.#requestedUdis.add(udi));

    const dataset = await this.getContext(UMB_PROPERTY_DATASET_CONTEXT);
    const resolved = await this.#entityResolver.resolve(
      udis,
      dataset?.getVariantId().culture,
    );

    this._entities = new Map([...this._entities, ...resolved]);

    return resolved;
  }

  #getName(item: MeganavItem) {
    return item.name || (item.udi && this._entities.get(item.udi)?.name) || "";
  }

  #setValue(items: Array<MeganavItem>) {
    this._items = items;
    this.dispatchEvent(new UmbChangeEvent());
  }

  #toggleCollapse(id: string) {
    const next = new Set(this._collapsedIds);

    if (!next.delete(id)) {
      next.add(id);
    }

    this._collapsedIds = next;
  }

  async #addItem(parentId: string | null, index: number) {
    const parent = parentId ? (findItem(this._items, parentId) ?? null) : null;
    const allowedTypes = getAllowedTypes(this._itemTypes, parent);
    const itemType =
      allowedTypes.length > 1
        ? await this.#pickItemType(allowedTypes)
        : allowedTypes[0];

    if (allowedTypes.length > 1 && !itemType) return;

    const item = await this.#openLinkPicker(
      {
        id: UmbId.new(),
        itemTypeId: itemType?.id,
        settings: {},
        children: [],
      },
      true,
    );

    if (!item) return;

    this.#setValue(insertItem(this._items, parentId, index, item));

    if (!itemType?.settingsType) return;

    const withSettings = await this.#openItem(item, parent, true);

    if (withSettings) {
      this.#setValue(updateItem(this._items, item.id, withSettings));
    }
  }

  async #editLink(id: string) {
    const current = findItem(this._items, id);

    if (!current) return;

    const item = await this.#openLinkPicker(current, false);

    if (!item) return;

    this.#setValue(updateItem(this._items, id, item));
  }

  // Settings and "Change type" live in the item modal, so it's only opened when there's something to show there.
  async #editItem(id: string) {
    const current = findItem(this._items, id);

    if (!current) return;

    const parent = findParent(this._items, id);
    const hasSettings = !!findItemType(this._itemTypes, current)?.settingsType;
    const canChangeType = getAllowedTypes(this._itemTypes, parent).length > 1;

    if (!hasSettings && !canChangeType) {
      await this.#editLink(id);
      return;
    }

    const item = await this.#openItem(current, parent);

    if (!item) return;

    this.#setValue(updateItem(this._items, id, item));
  }

  #toggleVisibility(id: string) {
    const item = findItem(this._items, id);

    if (!item) return;

    this.#setValue(
      updateItem(this._items, id, setVisible(item, item.visible === false)),
    );
  }

  async #removeItem(id: string) {
    const item = findItem(this._items, id);

    if (!item) return;

    if (item.children.length) {
      const confirmed = await umbConfirmModal(this, {
        headline: this.localize.term("meganav_removeItemHeadline"),
        content: this.localize.term(
          "meganav_removeItemContent",
          this.#getName(item),
        ),
        color: "danger",
        confirmLabel: this.localize.term("general_remove"),
      })
        .then(() => true)
        .catch(() => false);

      if (!confirmed) return;
    }

    this.#setValue(removeItem(this._items, id));
  }

  async #pickItemType(
    itemTypes: Array<MeganavItemType>,
  ): Promise<MeganavItemType | undefined> {
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);

    if (!modalManager) return undefined;

    const modal = modalManager.open(this, UMB_ITEM_PICKER_MODAL, {
      data: {
        headline: this.localize.term("meganav_chooseType"),
        items: itemTypes.map((itemType) => ({
          label: itemType.name,
          value: itemType.id,
          icon: itemType.icon ?? "icon-link",
        })),
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);

    return itemTypes.find((itemType) => itemType.id === result?.value);
  }

  get #linkPickerConfig() {
    return {
      hideAnchor: this._hideAnchor,
      hideTarget: this._hideTarget,
    };
  }

  async #openLinkPicker(
    item: MeganavItem,
    isNew: boolean,
  ): Promise<MeganavItem | undefined> {
    const updated = await pickLink(this, item, this.#linkPickerConfig, isNew);

    return updated && this.#withoutDefaultName(updated);
  }

  async #openItem(
    item: MeganavItem,
    parent: MeganavItem | null,
    openSettings = false,
  ): Promise<MeganavItem | undefined> {
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);

    if (!modalManager) return undefined;

    const modal = modalManager.open(this, MEGANAV_ITEM_MODAL, {
      data: {
        itemTypes: this._itemTypes,
        allowedTypes: getAllowedTypes(this._itemTypes, parent),
        entity: item.udi ? this._entities.get(item.udi) : undefined,
        resolveEntity: async (udi) =>
          this._entities.get(udi) ??
          (await this.#resolveEntities([udi])).get(udi),
        linkPicker: this.#linkPickerConfig,
        openSettings,
      },
      value: item,
    });

    const updated = await modal.onSubmit().catch(() => undefined);

    return updated && this.#withoutDefaultName(updated);
  }

  /** Later versions fill the link title with the picked name; `name` is only kept for titles that override it. */
  async #withoutDefaultName(item: MeganavItem): Promise<MeganavItem> {
    if (!item.udi || !item.name) return item;

    const resolved = await this.#resolveEntities([item.udi]);

    if (resolved.get(item.udi)?.name !== item.name) return item;

    return {
      ...item,
      name: undefined,
    };
  }

  override render() {
    const canAdd =
      !this.readonly &&
      (!this._maxItems || this._items.length < this._maxItems);

    return html`
      <meganav-items
        .items=${this._items}
        .editorId=${this.#editorId}
        .depth=${1}
        .maxDepth=${this._maxDepth}
        .collapsedIds=${this._collapsedIds}
        .entities=${this._entities}
        .itemTypes=${this._itemTypes}
        ?readonly=${this.readonly}
      ></meganav-items>

      ${
        canAdd
          ? html`<uui-button
              id="add"
              look="placeholder"
              label=${this.localize.term("general_add")}
              @click=${() => this.#addItem(null, -1)}
            ></uui-button>`
          : null
      }
    `;
  }

  static override styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      #add {
        width: 100%;
      }
    `,
  ];
}

export default MeganavPropertyEditorUiElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-property-editor-ui": MeganavPropertyEditorUiElement;
  }
}
