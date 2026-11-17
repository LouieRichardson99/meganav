import {
  MeganavTreeChangeEvent,
  MeganavTreeLevelChangeEvent,
  MeganavTreeToggleEvent,
} from "./events.js";
import {
  findItem,
  getParentIds,
  setChildren,
  type AnyTreeItem,
  type TreeItem,
} from "./tree.js";
import {
  css,
  customElement,
  html,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbId } from "@umbraco-cms/backoffice/id";
import "./tree-level.element.js";

/**
 * A sortable, collapsible tree that knows nothing about what its items are.
 * `renderItem` renders each row, `canDrop` adds rules for where an item can be dragged to.
 */
@customElement("meganav-tree")
export class MeganavTreeElement<
  T extends TreeItem<T> = AnyTreeItem,
> extends UmbLitElement {
  readonly #treeId = UmbId.new();

  @property({ attribute: false }) items: Array<T> = [];

  @property({ type: Number, attribute: false }) maxDepth?: number;

  @property({ attribute: false }) renderItem?: (item: T) => unknown;

  @property({ attribute: false }) canDrop?: (
    item: T,
    parent: T | null,
  ) => boolean;

  @property({ type: Boolean, reflect: true }) readonly = false;

  @state() private _collapsedIds: ReadonlySet<string> = new Set();

  constructor() {
    super();

    this.addEventListener(MeganavTreeLevelChangeEvent.TYPE, (e) => {
      const { parentId, children } = e as MeganavTreeLevelChangeEvent<T>;

      e.stopPropagation();

      // A sorter's model can hold stale copies of its items when an item moves between levels
      // (it hasn't re-rendered since the other level changed), so only take the order from it
      // and use the current version of each item from the tree.
      const current = children.map(
        (child) => findItem(this.items, child.id) ?? child,
      );

      this.items = setChildren(this.items, parentId, current);
      this.dispatchEvent(new MeganavTreeChangeEvent(this.items));
    });

    this.addEventListener(MeganavTreeToggleEvent.TYPE, (e) => {
      e.stopPropagation();

      this.toggle((e as MeganavTreeToggleEvent).id);
    });
  }

  public expandAll() {
    this._collapsedIds = new Set();
  }

  public collapseAll() {
    this._collapsedIds = new Set(getParentIds(this.items));
  }

  public toggle(id: string) {
    const next = new Set(this._collapsedIds);

    if (!next.delete(id)) {
      next.add(id);
    }

    this._collapsedIds = next;
  }

  override render() {
    return html`
      <meganav-tree-level
        .items=${this.items}
        .treeId=${this.#treeId}
        .depth=${1}
        .maxDepth=${this.maxDepth}
        .collapsedIds=${this._collapsedIds}
        .renderItem=${this.renderItem}
        .canDrop=${this.canDrop}
        ?readonly=${this.readonly}
      ></meganav-tree-level>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }
    `,
  ];
}

export default MeganavTreeElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-tree": MeganavTreeElement;
  }
}
