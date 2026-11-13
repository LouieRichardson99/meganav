import type { MeganavItemType } from "../../types.js";
import { toAlias } from "../../utils/item-types.js";
import type { MeganavItemTypeModalData } from "./item-type-modal.token.js";
import {
  css,
  customElement,
  html,
  repeat,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import {
  UMB_MODAL_MANAGER_CONTEXT,
  UmbModalBaseElement,
  UmbModalToken,
} from "@umbraco-cms/backoffice/modal";

// Opened by alias, as `UMB_ICON_PICKER_MODAL` moved package after v14.
const ICON_PICKER_MODAL = new UmbModalToken<
  never,
  {
    icon?: string;
    color?: string;
  }
>("Umb.Modal.IconPicker", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});

@customElement("meganav-item-type-modal")
export class MeganavItemTypeModalElement extends UmbModalBaseElement<
  MeganavItemTypeModalData,
  MeganavItemType
> {
  @state() private _chooseTypes = false;

  #aliasEdited = false;

  override connectedCallback() {
    super.connectedCallback();

    this._chooseTypes = this.value.allowedTypes.length > 0;
    this.#aliasEdited = !!this.value.alias;
  }

  #setName(name: string) {
    this.updateValue({
      name,
      ...(this.#aliasEdited ? {} : { alias: toAlias(name) }),
    });
  }

  #setAlias(alias: string) {
    this.#aliasEdited = !!alias;
    this.updateValue({ alias });
  }

  async #pickIcon() {
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);

    if (!modalManager) return;

    const [icon, color] = (this.value.icon ?? "").split(" color-");
    const modal = modalManager.open(this, ICON_PICKER_MODAL, {
      value: {
        icon,
        color,
      },
    });
    const result = await modal.onSubmit().catch(() => undefined);

    if (!result?.icon) return;

    this.updateValue({
      icon: result.color ? `${result.icon} color-${result.color}` : result.icon,
    });
  }

  #setChooseTypes(chooseTypes: boolean) {
    this._chooseTypes = chooseTypes;

    if (!chooseTypes) {
      this.updateValue({ allowedTypes: [] });
    }
  }

  #toggleAllowedType(id: string, allowed: boolean) {
    const others = this.value.allowedTypes.filter((type) => type !== id);

    this.updateValue({ allowedTypes: allowed ? [...others, id] : others });
  }

  #getItemTypes(): Array<MeganavItemType> {
    const itemTypes = this.data?.itemTypes ?? [];

    if (itemTypes.some((itemType) => itemType.id === this.value.id)) {
      return itemTypes.map((itemType) =>
        itemType.id === this.value.id ? this.value : itemType,
      );
    }

    return [...itemTypes, this.value];
  }

  override render() {
    return html`
      <umb-body-layout headline=${this.localize.term("meganav_itemType")}>
        <uui-box>
          <umb-property-layout
            label=${this.localize.term("general_name")}
            orientation="vertical"
            mandatory
          >
            <uui-input
              slot="editor"
              label=${this.localize.term("general_name")}
              .value=${this.value.name}
              @input=${(e: InputEvent) =>
                this.#setName((e.target as HTMLInputElement).value)}
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout
            label=${this.localize.term("general_alias")}
            orientation="vertical"
          >
            <uui-input
              slot="editor"
              label=${this.localize.term("general_alias")}
              .value=${this.value.alias}
              @input=${(e: InputEvent) =>
                this.#setAlias((e.target as HTMLInputElement).value)}
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout
            label=${this.localize.term("general_icon")}
            orientation="vertical"
          >
            <uui-button
              slot="editor"
              look="outline"
              label=${this.localize.term("general_icon")}
              @click=${this.#pickIcon}
            >
              <umb-icon name=${this.value.icon ?? "icon-link"}></umb-icon>
            </uui-button>
          </umb-property-layout>

          <umb-property-layout
            label=${this.localize.term("meganav_settingsType")}
            description=${this.localize.term("meganav_settingsTypeDescription")}
            orientation="vertical"
          >
            <umb-input-document-type
              slot="editor"
              max="1"
              .elementTypesOnly=${true}
              .selection=${
                this.value.settingsType ? [this.value.settingsType] : []
              }
              @change=${(e: Event) =>
                this.updateValue({
                  settingsType:
                    (e.target as HTMLElement & { selection: Array<string> })
                      .selection[0] || undefined,
                })}
            ></umb-input-document-type>
          </umb-property-layout>
        </uui-box>

        <uui-box headline=${this.localize.term("meganav_permissions")}>
          <umb-property-layout
            label=${this.localize.term("contentTypeEditor_allowAtRootHeading")}
            orientation="vertical"
          >
            <uui-toggle
              slot="editor"
              label=${this.localize.term(
                "contentTypeEditor_allowAtRootHeading",
              )}
              .checked=${this.value.allowAtRoot}
              @change=${(e: Event) =>
                this.updateValue({
                  allowAtRoot: (e.target as HTMLInputElement).checked,
                })}
            ></uui-toggle>
          </umb-property-layout>

          <umb-property-layout
            label=${this.localize.term("meganav_allowedTypes")}
            orientation="vertical"
          >
            <div slot="editor">
              <uui-toggle
                label=${this.localize.term("meganav_allowAllTypes")}
                .checked=${!this._chooseTypes}
                @change=${(e: Event) =>
                  this.#setChooseTypes(!(e.target as HTMLInputElement).checked)}
              ></uui-toggle>

              ${
                this._chooseTypes
                  ? repeat(
                      this.#getItemTypes(),
                      (itemType) => itemType.id,
                      (itemType) =>
                        html`<uui-checkbox
                          label=${
                            itemType.name ||
                            this.localize.term("meganav_untitled")
                          }
                          .checked=${this.value.allowedTypes.includes(
                            itemType.id,
                          )}
                          @change=${(e: Event) =>
                            this.#toggleAllowedType(
                              itemType.id,
                              (e.target as HTMLInputElement).checked,
                            )}
                        ></uui-checkbox>`,
                    )
                  : null
              }
            </div>
          </umb-property-layout>
        </uui-box>

        <div slot="actions">
          <uui-button
            label=${this.localize.term("general_close")}
            @click=${() => this._rejectModal()}
          ></uui-button>

          <uui-button
            look="primary"
            color="positive"
            label=${this.localize.term("general_submit")}
            ?disabled=${!this.value.name.trim()}
            @click=${() => this._submitModal()}
          ></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = [
    css`
      uui-box + uui-box {
        margin-top: var(--uui-size-space-5);
      }

      uui-input {
        width: 100%;
      }

      uui-checkbox {
        display: block;
      }
    `,
  ];
}

export default MeganavItemTypeModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-item-type-modal": MeganavItemTypeModalElement;
  }
}
