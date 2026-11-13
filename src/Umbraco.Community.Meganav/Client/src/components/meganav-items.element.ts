import type { MeganavItem, MeganavItemType } from "../types.js";
import type { MeganavEntityInfo } from "../utils/entities.js";
import { MeganavAddItemEvent, MeganavChildrenChangeEvent } from "../events.js";
import { containsId, getDepth } from "../utils/tree.js";
import { findItemType, isAllowedIn } from "../utils/item-types.js";
import type { MeganavItemElement } from "./meganav-item.element.js";
import {
  css,
  customElement,
  html,
  property,
  repeat,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import "./meganav-item.element.js";

/** Where the pointer grabbed the dragged item, relative to its left edge. */
let grabOffsetX = 0;

let shifting = false;

/** Renders itself recursively; every level shares one sorter identifier so items can be dragged between levels. */
@customElement("meganav-items")
export class MeganavItemsElement extends UmbLitElement {
  #sorter = new UmbSorterController<MeganavItem, MeganavItemElement>(this, {
    identifier: "Meganav.Sorter",
    itemSelector: "meganav-item",
    containerSelector: ".container",
    getUniqueOfElement: (element) => element.dataset.id,
    getUniqueOfModel: (item) => item.id,
    onRequestMove: ({ item }) => this.#canAccept(item),
    // Newer sorters pin the height of the list a drag starts in, which leaves a gap once the item moves to another list.
    onStart: () =>
      this.shadowRoot
        ?.querySelector<HTMLElement>(".container")
        ?.style.removeProperty("min-height"),
    onChange: ({ model }) => {
      this._items = model;
      this.requestUpdate();

      this.dispatchEvent(new MeganavChildrenChangeEvent(this.parentId, model));
    },
  });

  constructor() {
    super();

    this.addEventListener("dragstart", (e) => this.#onDragStart(e), {
      capture: true,
    });
    this.addEventListener("dragover", (e) => this.#onDragOver(e), {
      capture: true,
    });
  }

  @property({ type: Array, attribute: false })
  public get items(): Array<MeganavItem> {
    return this._items;
  }
  public set items(value: Array<MeganavItem> | undefined) {
    const oldValue = this._items;

    this._items = value ?? [];
    this.#sorter.setModel(this._items);
    this.requestUpdate("items", oldValue);
  }
  private _items: Array<MeganavItem> = [];

  /** `null` for the root list. */
  @property({ attribute: false }) parent: MeganavItem | null = null;

  get parentId(): string | null {
    return this.parent?.id ?? null;
  }

  /** Identifies the property editor this list belongs to, so items can't be dragged between editors. */
  @property({ attribute: false }) editorId?: string;

  /** Root is 1. */
  @property({ type: Number }) depth = 1;

  @property({ type: Number, attribute: false }) maxDepth?: number;

  @property({ attribute: false }) collapsedIds: ReadonlySet<string> = new Set();

  @property({ attribute: false }) entities: ReadonlyMap<
    string,
    MeganavEntityInfo
  > = new Map();

  @property({ attribute: false }) itemTypes: Array<MeganavItemType> = [];

  @property({ type: Boolean, reflect: true }) readonly = false;

  override updated(changed: Map<PropertyKey, unknown>) {
    super.updated(changed);

    if (changed.has("readonly")) {
      if (this.readonly) {
        this.#sorter.disable();
      } else {
        this.#sorter.enable();
      }
    }
  }

  #canAccept(item: MeganavItem): boolean {
    const source = UmbSorterController.activeSorter?.getHostElement() as
      MeganavItemsElement | undefined;

    if (source?.editorId !== this.editorId) return false;

    if (containsId(item, this.parentId)) return false;

    if (!isAllowedIn(this.itemTypes, item, this.parent)) return false;

    return !this.maxDepth || this.depth + getDepth(item) - 1 <= this.maxDepth;
  }

  #onDragStart(e: DragEvent) {
    const element = e
      .composedPath()
      .find((target) => (target as Element).localName === "meganav-item") as
      HTMLElement | undefined;

    if (!element) return;

    grabOffsetX = e.clientX - element.getBoundingClientRect().left;
  }

  // Dragging an item an indent's width to the right nests it under the item above, and to the left moves it out after its parent.
  async #onDragOver(e: DragEvent) {
    const id = UmbSorterController.activeItem?.id as string | undefined;
    const index = this._items.findIndex((item) => item.id === id);
    const activeSorter = UmbSorterController.activeSorter as
      UmbSorterController<MeganavItem, MeganavItemElement> | undefined;

    if (!id || index === -1 || !activeSorter || shifting) return;

    const rect = this.#getItemElement(id)?.getBoundingClientRect();

    if (!rect || e.clientY < rect.top || e.clientY > rect.bottom) return;

    const offset = e.clientX - grabOffsetX - rect.left;
    const target =
      offset > 0 ? this.#getIndentTarget(index) : this.#getOutdentTarget(index);

    if (!target || Math.abs(offset) < target.indent) return;

    // `moveItemInModel` doesn't ask `onRequestMove`, so the type and depth rules are checked here.
    if (!target.list.#canAccept(this._items[index])) return;

    shifting = true;

    await target.list.#sorter.moveItemInModel(target.index, activeSorter);

    shifting = false;
  }

  #getIndentTarget(index: number) {
    const previous = this._items[index - 1];

    if (!previous) return undefined;

    const parent = this.#getItemElement(previous.id);
    const list = parent?.querySelector<MeganavItemsElement>(
      ":scope > meganav-items",
    );

    // No list when the max depth is reached, and no boxes when the item is collapsed.
    if (!parent || !list?.getClientRects().length) return undefined;

    return {
      list,
      index: list.items.length,
      indent:
        list.getBoundingClientRect().left - parent.getBoundingClientRect().left,
    };
  }

  #getOutdentTarget(index: number) {
    if (index !== this._items.length - 1) return undefined;

    const parent = this.parentElement;
    const root = parent?.getRootNode();

    if (
      !parent ||
      !(root instanceof ShadowRoot) ||
      !(root.host instanceof MeganavItemsElement)
    )
      return undefined;

    const list = root.host;

    return {
      list,
      index: list.items.findIndex((item) => item.id === this.parentId) + 1,
      indent:
        this.getBoundingClientRect().left - parent.getBoundingClientRect().left,
    };
  }

  #getItemElement(id: string) {
    return (
      this.shadowRoot?.querySelector<MeganavItemElement>(
        `meganav-item[data-id="${id}"]`,
      ) ?? undefined
    );
  }

  #canNest(item: MeganavItem) {
    return (
      !this.maxDepth || this.depth < this.maxDepth || item.children.length > 0
    );
  }

  override render() {
    return html`
      <div
        class="container ${this.parentId === null ? "root" : "nested"} ${
          this._items.length ? "" : "empty"
        }"
      >
        ${repeat(
          this._items,
          (item) => item.id,
          (item, index) => html`
            <meganav-item
              data-id=${item.id}
              .item=${item}
              .collapsed=${this.collapsedIds.has(item.id)}
              .entity=${item.udi ? this.entities.get(item.udi) : undefined}
              .itemType=${
                this.itemTypes.length > 1
                  ? findItemType(this.itemTypes, item)
                  : undefined
              }
              ?readonly=${this.readonly}
              @add-before=${() =>
                this.dispatchEvent(
                  new MeganavAddItemEvent(this.parentId, index),
                )}
            >
              ${
                this.#canNest(item)
                  ? html`<meganav-items
                      slot="children"
                      .items=${item.children}
                      .parent=${item}
                      .editorId=${this.editorId}
                      .depth=${this.depth + 1}
                      .maxDepth=${this.maxDepth}
                      .collapsedIds=${this.collapsedIds}
                      .entities=${this.entities}
                      .itemTypes=${this.itemTypes}
                      ?readonly=${this.readonly}
                    ></meganav-items>`
                  : null
              }
            </meganav-item>
          `,
        )}
      </div>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      .container {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .container.nested:not(.empty) {
        padding-top: var(--uui-size-space-2);
      }
    `,
  ];
}

export default MeganavItemsElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-items": MeganavItemsElement;
  }
}
