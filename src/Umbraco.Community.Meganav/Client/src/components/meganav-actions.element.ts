import {
  customElement,
  html,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("meganav-actions")
export class MeganavActionsElement extends UmbLitElement {
  @property({ type: Boolean, attribute: "item-hidden" }) itemHidden = false;

  #fire(type: string) {
    return (event: Event) => {
      event.stopPropagation();

      this.dispatchEvent(new CustomEvent(type));
    };
  }

  override render() {
    return html`
      <uui-action-bar>
        <uui-button
          label=${this.localize.term(
            this.itemHidden ? "general_show" : "general_hide",
          )}
          @click=${this.#fire("toggle-visibility")}
        >
          <uui-icon name="icon-eye"></uui-icon>
        </uui-button>

        <uui-button
          label=${this.localize.term("general_edit")}
          @click=${this.#fire("edit")}
        >
          <uui-icon name="icon-settings"></uui-icon>
        </uui-button>

        <uui-button
          label=${this.localize.term("general_remove")}
          @click=${this.#fire("remove")}
        >
          <uui-icon name="icon-trash"></uui-icon>
        </uui-button>
      </uui-action-bar>
    `;
  }
}

export default MeganavActionsElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-actions": MeganavActionsElement;
  }
}
