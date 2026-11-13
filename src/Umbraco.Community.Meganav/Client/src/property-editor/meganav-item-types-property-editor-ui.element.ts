import type { MeganavItemType } from "../types.js";
import { normalizeItemTypes } from "../utils/item-types.js";
import { MEGANAV_ITEM_TYPE_MODAL } from "../modals/item-type/item-type-modal.token.js";
import {
  css,
  customElement,
  html,
  property,
  repeat,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbId } from "@umbraco-cms/backoffice/id";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";

/** Edits the `itemTypes` data type setting. */
@customElement("meganav-item-types-property-editor-ui")
export class MeganavItemTypesPropertyEditorUiElement extends UmbLitElement {
  #sorter = new UmbSorterController<MeganavItemType, HTMLElement>(this, {
    identifier: "Meganav.ItemTypes.Sorter",
    itemSelector: "uui-ref-node",
    containerSelector: "#list",
    getUniqueOfElement: (element) => element.dataset.id,
    getUniqueOfModel: (itemType) => itemType.id,
    onChange: ({ model }) => this.#setValue(model),
  });

  @property({ attribute: false }) public get value(): Array<MeganavItemType> {
    return this._itemTypes;
  }

  public set value(value: unknown) {
    this._itemTypes = normalizeItemTypes(value);
    this.#sorter.setModel(this._itemTypes);
  }

  @state() private _itemTypes: Array<MeganavItemType> = [];

  #setValue(itemTypes: Array<MeganavItemType>) {
    this._itemTypes = itemTypes;
    this.#sorter.setModel(itemTypes);
    this.dispatchEvent(new UmbChangeEvent());
  }

  async #open(itemType?: MeganavItemType) {
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);

    if (!modalManager) return;

    const modal = modalManager.open(this, MEGANAV_ITEM_TYPE_MODAL, {
      data: {
        itemTypes: this._itemTypes,
      },
      value: itemType ?? {
        id: UmbId.new(),
        name: "",
        alias: "",
        allowAtRoot: true,
        allowedTypes: [],
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);

    if (!result) return;

    this.#setValue(
      itemType
        ? this._itemTypes.map((existing) =>
            existing.id === result.id ? result : existing,
          )
        : [...this._itemTypes, result],
    );
  }

  #remove(id: string) {
    this.#setValue(
      this._itemTypes
        .filter((itemType) => itemType.id !== id)
        .map((itemType) => ({
          ...itemType,
          allowedTypes: itemType.allowedTypes.filter((type) => type !== id),
        })),
    );
  }

  override render() {
    return html`
      <div id="list">
        ${repeat(
          this._itemTypes,
          (itemType) => itemType.id,
          (itemType) => html`
            <uui-ref-node
              data-id=${itemType.id}
              name=${itemType.name}
              detail=${itemType.alias}
              @open=${() => this.#open(itemType)}
            >
              <umb-icon
                slot="icon"
                name=${itemType.icon ?? "icon-link"}
              ></umb-icon>

              <uui-action-bar slot="actions">
                <uui-button
                  label=${this.localize.term("general_remove")}
                  @click=${() => this.#remove(itemType.id)}
                >
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </uui-action-bar>
            </uui-ref-node>
          `,
        )}
      </div>

      <uui-button
        id="add"
        look="placeholder"
        label=${this.localize.term("general_add")}
        @click=${() => this.#open()}
      ></uui-button>
    `;
  }

  static override styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      #list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      uui-ref-node {
        cursor: grab;
      }

      #add {
        width: 100%;
      }
    `,
  ];
}

export default MeganavItemTypesPropertyEditorUiElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-item-types-property-editor-ui": MeganavItemTypesPropertyEditorUiElement;
  }
}
