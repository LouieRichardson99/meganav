import type { MeganavItem, MeganavItemType } from "../types.js";
import type { MeganavEntityInfo } from "../utils/entities.js";
import {
  MeganavEditItemEvent,
  MeganavEditLinkEvent,
  MeganavRemoveItemEvent,
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

  override render() {
    if (!this.item) return null;

    return html`
      <meganav-preview
        .item=${this.item}
        .entity=${this.entity}
        .itemType=${this.itemType}
        ?readonly=${this.readonly}
        ?item-hidden=${this.item.visible === false}
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

export default MeganavItemElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-item": MeganavItemElement;
  }
}
