import type { MeganavItem, MeganavItemType } from "../types.js";
import type { MeganavEntityInfo } from "../utils/entities.js";
import {
  MeganavEditItemEvent,
  MeganavEditLinkEvent,
  MeganavRemoveItemEvent,
  MeganavToggleCollapseEvent,
  MeganavToggleVisibilityEvent,
} from "../events.js";
import {
  css,
  customElement,
  html,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "./meganav-actions.element.js";
import "./meganav-preview.element.js";

@customElement("meganav-item")
export class MeganavItemElement extends UmbLitElement {
  @property({ attribute: false }) item?: MeganavItem;

  @property({ type: Boolean, reflect: true }) readonly = false;

  @property({ type: Boolean }) collapsed = false;

  @property({ attribute: false }) entity?: MeganavEntityInfo;

  @property({ attribute: false }) itemType?: MeganavItemType;

  #edit() {
    if (this.item && !this.readonly) {
      this.dispatchEvent(new MeganavEditItemEvent(this.item.id));
    }
  }

  #editLink() {
    if (this.item && !this.readonly) {
      this.dispatchEvent(new MeganavEditLinkEvent(this.item.id));
    }
  }

  #remove() {
    if (this.item) {
      this.dispatchEvent(new MeganavRemoveItemEvent(this.item.id));
    }
  }

  #toggleVisibility() {
    if (this.item) {
      this.dispatchEvent(new MeganavToggleVisibilityEvent(this.item.id));
    }
  }

  #toggleCollapse() {
    if (this.item) {
      this.dispatchEvent(new MeganavToggleCollapseEvent(this.item.id));
    }
  }

  override render() {
    if (!this.item) return null;

    return html`
      ${
        this.readonly
          ? null
          : html`<uui-button-inline-create
              label=${this.localize.term("meganav_addItem")}
              @click=${() => this.dispatchEvent(new CustomEvent("add-before"))}
            ></uui-button-inline-create>`
      }

      <meganav-preview
        .item=${this.item}
        .collapsed=${this.collapsed}
        .entity=${this.entity}
        .itemType=${this.itemType}
        ?readonly=${this.readonly}
        ?item-hidden=${this.item.visible === false}
        @toggle=${this.#toggleCollapse}
        @open=${this.#editLink}
      >
        ${
          this.readonly
            ? null
            : html`<meganav-actions
                slot="actions"
                ?item-hidden=${this.item.visible === false}
                @toggle-visibility=${this.#toggleVisibility}
                @edit=${this.#edit}
                @remove=${this.#remove}
              ></meganav-actions>`
        }
      </meganav-preview>

      <div class="children" ?hidden=${this.collapsed}>
        <slot name="children"></slot>
      </div>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
        position: relative;
      }

      :host(:not([readonly])) meganav-preview {
        cursor: grab;
      }

      /* The sorter marks the element being dragged with this attribute. */
      :host([drag-placeholder]) {
        opacity: 0.4;
      }

      :host([drag-placeholder]) meganav-preview {
        outline: 1px dashed var(--uui-color-border-emphasis);
      }

      uui-button-inline-create {
        position: absolute;
        top: calc(var(--uui-size-space-2) / -2);
        left: 0;
        right: 0;
        z-index: 1;
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

export default MeganavItemElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-item": MeganavItemElement;
  }
}
