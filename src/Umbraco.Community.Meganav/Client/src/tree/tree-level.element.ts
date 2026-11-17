import {
  MeganavTreeInsertEvent,
  MeganavTreeLevelChangeEvent,
  MeganavTreeToggleEvent,
} from "./events.js";
import {
  containsId,
  getDepth,
  type AnyTreeItem,
  type TreeItem,
} from "./tree.js";
import {
  css,
  customElement,
  html,
  property,
  repeat,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";

/** Where the pointer grabbed the dragged item, relative to its left edge. */
let grabOffsetX = 0;

let shifting = false;

/** Renders itself recursively; every level shares one sorter identifier so items can be dragged between levels. */
@customElement("meganav-tree-level")
export class MeganavTreeLevelElement<
  T extends TreeItem<T> = AnyTreeItem,
> extends UmbLitElement {
  #sorter = new UmbSorterController<T, HTMLElement>(this, {
    identifier: "Meganav.Tree",
    itemSelector: ".item",
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

      this.dispatchEvent(new MeganavTreeLevelChangeEvent(this.parentId, model));
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
  public get items(): Array<T> {
    return this._items;
  }
  public set items(value: Array<T> | undefined) {
    const oldValue = this._items;

    this._items = value ?? [];
    this.#sorter.setModel(this._items);
    this.requestUpdate("items", oldValue);
  }
  private _items: Array<T> = [];

  /** `null` for the root level. */
  @property({ attribute: false }) parent: T | null = null;

  get parentId(): string | null {
    return this.parent?.id ?? null;
  }

  /** Identifies the tree this level belongs to, so items can't be dragged between trees. */
  @property({ attribute: false }) treeId?: string;

  /** Root is 1. */
  @property({ type: Number }) depth = 1;

  @property({ type: Number, attribute: false }) maxDepth?: number;

  @property({ attribute: false }) collapsedIds: ReadonlySet<string> = new Set();

  @property({ attribute: false }) renderItem?: (item: T) => unknown;

  @property({ attribute: false }) canDrop?: (
    item: T,
    parent: T | null,
  ) => boolean;

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

  #canAccept(item: T): boolean {
    const source = UmbSorterController.activeSorter?.getHostElement() as
      | MeganavTreeLevelElement<T>
      | undefined;

    if (source?.treeId !== this.treeId) return false;

    if (containsId(item, this.parentId)) return false;

    if (this.canDrop && !this.canDrop(item, this.parent)) return false;

    return !this.maxDepth || this.depth + getDepth(item) - 1 <= this.maxDepth;
  }

  #onDragStart(e: DragEvent) {
    const element = e
      .composedPath()
      .find((target) => (target as Element).classList?.contains("item")) as
      | HTMLElement
      | undefined;

    if (!element) return;

    grabOffsetX = e.clientX - element.getBoundingClientRect().left;
  }

  // Dragging an item an indent's width to the right nests it under the item above, and to the left moves it out after its parent.
  async #onDragOver(e: DragEvent) {
    const id = UmbSorterController.activeItem?.id as string | undefined;
    const index = this._items.findIndex((item) => item.id === id);
    const activeSorter = UmbSorterController.activeSorter as
      | UmbSorterController<T, HTMLElement>
      | undefined;

    if (!id || index === -1 || !activeSorter || shifting) return;

    const rect = this.#getItemElement(id)?.getBoundingClientRect();

    if (!rect || e.clientY < rect.top || e.clientY > rect.bottom) return;

    const offset = e.clientX - grabOffsetX - rect.left;
    const target =
      offset > 0 ? this.#getIndentTarget(index) : this.#getOutdentTarget(index);

    if (!target || Math.abs(offset) < target.indent) return;

    // `moveItemInModel` doesn't ask `onRequestMove`, so the drop rules are checked here.
    if (!target.level.#canAccept(this._items[index])) return;

    shifting = true;

    await target.level.#sorter.moveItemInModel(target.index, activeSorter);

    shifting = false;
  }

  #getIndentTarget(index: number) {
    const previous = this._items[index - 1];

    if (!previous) return undefined;

    const parent = this.#getItemElement(previous.id);
    const level = parent?.querySelector<MeganavTreeLevelElement<T>>(
      ":scope > .children > meganav-tree-level",
    );

    // No level when the max depth is reached, and no boxes when the item is collapsed.
    if (!parent || !level?.getClientRects().length) return undefined;

    return {
      level,
      index: level.items.length,
      indent:
        level.getBoundingClientRect().left -
        parent.getBoundingClientRect().left,
    };
  }

  #getOutdentTarget(index: number) {
    if (index !== this._items.length - 1) return undefined;

    const parent = this.closest<HTMLElement>(".item");
    const root = parent?.getRootNode();

    if (
      !parent ||
      !(root instanceof ShadowRoot) ||
      !(root.host instanceof MeganavTreeLevelElement)
    )
      return undefined;

    const level = root.host as MeganavTreeLevelElement<T>;

    return {
      level,
      index: level.items.findIndex((item) => item.id === this.parentId) + 1,
      indent:
        this.getBoundingClientRect().left - parent.getBoundingClientRect().left,
    };
  }

  #getItemElement(id: string) {
    return (
      this.shadowRoot?.querySelector<HTMLElement>(`.item[data-id="${id}"]`) ??
      undefined
    );
  }

  #canNest(item: T) {
    return (
      !this.maxDepth || this.depth < this.maxDepth || item.children.length > 0
    );
  }

  #renderItem(item: T, index: number) {
    const collapsed = this.collapsedIds.has(item.id);

    return html`
      <div class="item" data-id=${item.id}>
        ${this.readonly
          ? null
          : html`<uui-button-inline-create
              label=${this.localize.term("meganav_addItem")}
              @click=${() =>
                this.dispatchEvent(
                  new MeganavTreeInsertEvent(this.parentId, index),
                )}
            ></uui-button-inline-create>`}

        <div class="row">
          <div class="toggle">
            ${item.children.length
              ? html`<uui-button
                  compact
                  label=${this.localize.term("meganav_toggleCollapse")}
                  @click=${() =>
                    this.dispatchEvent(new MeganavTreeToggleEvent(item.id))}
                >
                  <uui-symbol-expand .open=${!collapsed}></uui-symbol-expand>
                </uui-button>`
              : null}
          </div>

          <div class="content">${this.renderItem?.(item)}</div>
        </div>

        ${this.#canNest(item)
          ? html`<div class="children" ?hidden=${collapsed}>
              <meganav-tree-level
                .items=${item.children}
                .parent=${item}
                .treeId=${this.treeId}
                .depth=${this.depth + 1}
                .maxDepth=${this.maxDepth}
                .collapsedIds=${this.collapsedIds}
                .renderItem=${this.renderItem}
                .canDrop=${this.canDrop}
                ?readonly=${this.readonly}
              ></meganav-tree-level>
            </div>`
          : null}
      </div>
    `;
  }

  override render() {
    return html`
      <div
        class="container ${this.parentId === null ? "root" : "nested"} ${this
          ._items.length
          ? ""
          : "empty"}"
      >
        ${repeat(
          this._items,
          (item) => item.id,
          (item, index) => this.#renderItem(item, index),
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

      .item {
        position: relative;
      }

      /* The sorter marks the element being dragged with this attribute. */
      .item[drag-placeholder] {
        opacity: 0.4;
      }

      .item[drag-placeholder] > .row > .content {
        border-radius: var(--uui-border-radius);
        outline: 1px dashed var(--uui-color-border-emphasis);
      }

      uui-button-inline-create {
        position: absolute;
        top: calc(var(--uui-size-space-2) / -2);
        left: 0;
        right: 0;
        z-index: 1;
      }

      .row {
        display: flex;
        align-items: center;
      }

      .toggle {
        flex: 0 0 var(--uui-size-layout-2);
        display: flex;
        justify-content: center;
      }

      .content {
        flex: 1 1 auto;
        min-width: 0;
      }

      :host(:not([readonly])) .content {
        cursor: grab;
      }

      .children {
        padding-left: var(--uui-size-layout-2);
      }

      .children[hidden] {
        display: none;
      }
    `,
  ];
}

export default MeganavTreeLevelElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-tree-level": MeganavTreeLevelElement;
  }
}
