import type { MeganavItem, MeganavItemType } from "../../types.js";
import type { MeganavEntityInfo } from "../../utils/entities.js";
import { findItemType } from "../../utils/item-types.js";
import { getItemIcon, pickLink } from "../../utils/link.js";
import type { MeganavItemModalData } from "./item-modal.token.js";
import {
  css,
  customElement,
  html,
  ifDefined,
  repeat,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import {
  UMB_ITEM_PICKER_MODAL,
  UMB_MODAL_MANAGER_CONTEXT,
  UmbModalBaseElement,
} from "@umbraco-cms/backoffice/modal";
import { UmbDocumentTypeDetailRepository } from "@umbraco-cms/backoffice/document-type";
import { UmbDataTypeDetailRepository } from "@umbraco-cms/backoffice/data-type";
import type { UmbPropertyValueData } from "@umbraco-cms/backoffice/property";

interface SettingsProperty {
  alias: string;
  label: string;
  description: string;
  editorUiAlias: string;
  config: Array<{
    alias: string;
    value: unknown;
  }>;
  /** `null` when the property isn't in a group. */
  groupId: string | null;
}

interface SettingsGroup {
  id: string | null;
  name: string;
}

type PropertyValues = Array<UmbPropertyValueData>;

/** Edits an item's link and type, and its settings on a second tab. */
@customElement("meganav-item-modal")
export class MeganavItemModalElement extends UmbModalBaseElement<
  MeganavItemModalData,
  MeganavItem
> {
  @state() private _groups: Array<SettingsGroup> = [];

  @state() private _properties: Array<SettingsProperty> = [];

  @state() private _values: PropertyValues = [];

  @state() private _loading = false;

  @state() private _entity?: MeganavEntityInfo;

  @state() private _tab: "link" | "settings" = "link";

  override connectedCallback() {
    super.connectedCallback();

    this._entity = this.data?.entity;
    this._tab = this.data?.openSettings ? "settings" : "link";
    this._values = Object.entries(this.value.settings ?? {}).map(
      ([alias, value]) => ({
        alias,
        value,
      }),
    );

    this.#load();
  }

  #getItemType() {
    return findItemType(this.data?.itemTypes ?? [], this.value);
  }

  async #load() {
    const settingsType = this.#getItemType()?.settingsType;

    this._groups = [];
    this._properties = [];

    if (!settingsType) return;

    this._loading = true;

    const { data } = await new UmbDocumentTypeDetailRepository(
      this,
    ).requestByUnique(settingsType);

    if (!data) {
      this._loading = false;
      return;
    }

    const dataTypeRepository = new UmbDataTypeDetailRepository(this);
    const dataTypeIds = [
      ...new Set(data.properties.map((property) => property.dataType.unique)),
    ];
    const dataTypes = new Map(
      await Promise.all(
        dataTypeIds.map(
          async (unique) =>
            [
              unique,
              (await dataTypeRepository.requestByUnique(unique)).data,
            ] as const,
        ),
      ),
    );
    const groups = data.containers
      .filter((container) => container.type === "Group")
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const groupIds = new Set(groups.map((group) => group.id));

    this._groups = [
      {
        id: null,
        name: "",
      },
      ...groups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    ];

    this._properties = [...data.properties]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((property) => {
        const dataType = dataTypes.get(property.dataType.unique);

        return {
          alias: property.alias,
          label: property.name,
          description: property.description ?? "",
          editorUiAlias: dataType?.editorUiAlias ?? "",
          config: dataType?.values ?? [],
          groupId:
            property.container && groupIds.has(property.container.id)
              ? property.container.id
              : null,
        };
      });

    this._loading = false;
  }

  async #editLink() {
    const item = await pickLink(
      this,
      this.value,
      this.data?.linkPicker ?? {
        hideAnchor: false,
        hideTarget: false,
      },
      false,
    );

    if (!item) return;

    this._entity = item.udi
      ? await this.data?.resolveEntity(item.udi)
      : undefined;

    // Later versions fill the title with the picked name, which would read as an override.
    this.updateValue({
      ...item,
      name: item.name === this._entity?.name ? undefined : item.name,
    });
  }

  async #changeType() {
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);

    if (!modalManager) return;

    const current = this.#getItemType();
    const modal = modalManager.open(this, UMB_ITEM_PICKER_MODAL, {
      data: {
        headline: this.localize.term("meganav_changeType"),
        items: (this.data?.allowedTypes ?? [])
          .filter((itemType) => itemType.id !== current?.id)
          .map((itemType) => ({
            label: itemType.name,
            value: itemType.id,
            icon: itemType.icon ?? "icon-link",
          })),
      },
    });
    const result = await modal.onSubmit().catch(() => undefined);

    if (!result) return;

    this.updateValue({ itemTypeId: result.value });
    this.#load();
  }

  #submit() {
    const aliases = new Set(this._properties.map((property) => property.alias));

    this.updateValue({
      settings: Object.fromEntries(
        this._values
          .filter(({ alias }) => aliases.has(alias))
          .map(({ alias, value }) => [alias, value]),
      ),
    });

    this._submitModal();
  }

  #renderType() {
    const itemType = this.#getItemType();

    if ((this.data?.allowedTypes.length ?? 0) < 2) return null;

    return html`
      <umb-property-layout
        label=${this.localize.term("meganav_itemType")}
        orientation="vertical"
      >
        ${itemType
          ? this.#renderTypeNode(itemType)
          : html`<uui-button
              slot="editor"
              look="placeholder"
              label=${this.localize.term("meganav_chooseType")}
              @click=${this.#changeType}
            ></uui-button>`}
      </umb-property-layout>
    `;
  }

  #renderTypeNode(itemType: MeganavItemType) {
    return html`
      <uui-ref-node
        slot="editor"
        standalone
        name=${itemType.name}
        @open=${this.#changeType}
      >
        <umb-icon slot="icon" name=${itemType.icon ?? "icon-link"}></umb-icon>

        <uui-action-bar slot="actions">
          <uui-button
            label=${this.localize.term("meganav_changeType")}
            @click=${this.#changeType}
          >
            <uui-icon name="icon-shuffle"></uui-icon>
          </uui-button>
        </uui-action-bar>
      </uui-ref-node>
    `;
  }

  #renderLink() {
    const detail = `${this.value.url ?? this._entity?.url ?? ""}${
      this.value.queryString ?? ""
    }`;

    return html`
      <umb-property-layout
        label=${this.localize.term("meganav_link")}
        orientation="vertical"
      >
        <uui-ref-node
          slot="editor"
          standalone
          name=${this.value.name ||
          this._entity?.name ||
          this.localize.term("meganav_untitled")}
          detail=${detail}
          @open=${this.#editLink}
        >
          <umb-icon
            slot="icon"
            name=${this._entity?.icon ?? getItemIcon(this.value)}
          ></umb-icon>

          <uui-action-bar slot="actions">
            <uui-button
              label=${this.localize.term("meganav_editLink")}
              @click=${this.#editLink}
            >
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
          </uui-action-bar>
        </uui-ref-node>
      </umb-property-layout>
    `;
  }

  #renderTabs() {
    if (!this._properties.length) return null;

    return html`
      <uui-tab-group slot="navigation">
        <uui-tab
          label=${this.localize.term("meganav_link")}
          ?active=${this._tab === "link"}
          @click=${() => (this._tab = "link")}
        ></uui-tab>

        <uui-tab
          label=${this.localize.term("general_settings")}
          ?active=${this._tab === "settings"}
          @click=${() => (this._tab = "settings")}
        ></uui-tab>
      </uui-tab-group>
    `;
  }

  #renderSettings() {
    return html`
      <umb-property-dataset
        .value=${this._values}
        @change=${(e: Event) =>
          (this._values = (
            e.target as HTMLElement & { value: PropertyValues }
          ).value)}
      >
        ${repeat(
          this._groups,
          (group) => group.id,
          (group) => this.#renderGroup(group),
        )}
      </umb-property-dataset>
    `;
  }

  #renderGroup(group: SettingsGroup) {
    const properties = this._properties.filter(
      (property) => property.groupId === group.id,
    );

    if (!properties.length) return null;

    return html`
      <uui-box headline=${ifDefined(group.name || undefined)}>
        ${repeat(
          properties,
          (property) => property.alias,
          (property) => html`
            <umb-property
              alias=${property.alias}
              label=${property.label}
              description=${property.description}
              property-editor-ui-alias=${property.editorUiAlias}
              .config=${property.config}
            ></umb-property>
          `,
        )}
      </uui-box>
    `;
  }

  override render() {
    return html`
      <umb-body-layout
        headline=${this.value.name ||
        this._entity?.name ||
        this.localize.term("meganav_untitled")}
      >
        ${this._loading ? html`<uui-loader-bar></uui-loader-bar>` : null}
        ${this.#renderTabs()}
        ${this._tab === "settings" && this._properties.length
          ? this.#renderSettings()
          : html`<uui-box>
              ${this.#renderLink()} ${this.#renderType()}
            </uui-box>`}

        <div slot="actions">
          <uui-button
            label=${this.localize.term("general_close")}
            @click=${() => this._rejectModal()}
          ></uui-button>

          <uui-button
            look="primary"
            color="positive"
            label=${this.localize.term("general_submit")}
            @click=${this.#submit}
          ></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = [
    css`
      umb-property-dataset uui-box + uui-box {
        margin-top: var(--uui-size-space-5);
      }

      umb-property-dataset {
        display: block;
      }

      uui-button[look="placeholder"] {
        width: 100%;
      }
    `,
  ];
}

export default MeganavItemModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "meganav-item-modal": MeganavItemModalElement;
  }
}
