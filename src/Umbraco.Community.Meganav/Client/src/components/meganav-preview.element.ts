import type { MeganavItem, MeganavItemType } from "../types.js";
import type { MeganavEntityInfo } from "../utils/entities.js";
import { getItemIcon } from "../utils/link.js";
import {
  css,
  customElement,
  html,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("meganav-preview")
export class MeganavPreviewElement extends UmbLitElement {
  @property({ attribute: false }) item?: MeganavItem;

  @property({ attribute: false }) entity?: MeganavEntityInfo;

  /** Only set when there's more than one item type, so the type's icon tells them apart. */
  @property({ attribute: false }) itemType?: MeganavItemType;

  @property({ type: Boolean, reflect: true }) readonly = false;

  @property({ type: Boolean, reflect: true, attribute: "item-hidden" })
  itemHidden = false;

  #getDetail(item: MeganavItem) {
    const detail = `${item.url ?? this.entity?.url ?? ""}${item.queryString ?? ""}`;

    return detail || item.udi || "";
  }

  #renderStateTag() {
    switch (this.entity?.state) {
      case "unpublished":
        return html`<uui-tag slot="tag" look="secondary"
          >${this.localize.term("content_unpublished")}</uui-tag
        >`;
      case "trashed":
        return html`<uui-tag slot="tag" color="danger" look="secondary"
          >${this.localize.term("mediaPicker_trashed")}</uui-tag
        >`;
      case "missing":
        return html`<uui-tag slot="tag" color="danger" look="secondary"
          >${this.localize.term("meganav_notFound")}</uui-tag
        >`;
      default:
        return null;
    }
  }

  override render() {
    if (!this.item) return null;

    const unavailable = !!this.entity && this.entity.state !== "published";

    return html`
      <uui-ref-node
        standalone
        class=${unavailable ? "unavailable" : ""}
        name=${
          this.item.name ||
          this.entity?.name ||
          this.localize.term("meganav_untitled")
        }
        detail=${this.#getDetail(this.item)}
        ?readonly=${this.readonly}
        @open=${() => this.dispatchEvent(new CustomEvent("open"))}
      >
        <umb-icon
          slot="icon"
          name=${
            this.itemType
              ? (this.itemType.icon ?? "icon-link")
              : (this.entity?.icon ?? getItemIcon(this.item))
          }
        ></umb-icon>

        ${this.#renderStateTag()}
        ${
          this.item.target === "_blank"
            ? html`<uui-tag slot="tag" look="secondary"
                >${this.localize.term("meganav_newWindow")}</uui-tag
              >`
            : null
        }

        <slot name="actions" slot="actions"></slot>
      </uui-ref-node>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      :host([item-hidden]) uui-ref-node,
      uui-ref-node.unavailable {
        opacity: 0.5;
      }
    `,
  ];
}

export default MeganavPreviewElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-preview": MeganavPreviewElement;
  }
}
