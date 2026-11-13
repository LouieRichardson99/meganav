import type { MeganavItem } from "../types.js";
import {
  UMB_LINK_PICKER_MODAL,
  type UmbLinkPickerLink,
  type UmbLinkPickerLinkType,
  type UmbLinkPickerModalData,
} from "@umbraco-cms/backoffice/multi-url-picker";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

export interface MeganavLinkPickerConfig {
  hideAnchor: boolean;
  hideTarget: boolean;
}

type MeganavEntityType = Exclude<UmbLinkPickerLinkType, "external">;

export function toUdi(entityType: MeganavEntityType, unique: string): string {
  return `umb://${entityType}/${unique.replace(/-/g, "").toLowerCase()}`;
}

export function parseUdi(
  udi?: string | null,
): { entityType: MeganavEntityType; unique: string } | undefined {
  const match = udi?.match(/^umb:\/\/(document|media)\/([0-9a-f]{32})$/i);

  if (!match) return undefined;

  const hex = match[2].toLowerCase();
  const unique = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

  return {
    entityType: match[1].toLowerCase() as MeganavEntityType,
    unique,
  };
}

export function itemToLink(item?: Partial<MeganavItem>): UmbLinkPickerLink {
  const entity = parseUdi(item?.udi);

  return {
    name: item?.name ?? null,
    target: item?.target ?? null,
    queryString: item?.queryString ?? null,
    type: entity?.entityType ?? (item?.url ? "external" : null),
    unique: entity?.unique ?? null,
    url: item?.url ?? null,
  };
}

export function linkToItem(
  link: UmbLinkPickerLink,
  item: MeganavItem,
): MeganavItem {
  const isEntity =
    (link.type === "document" || link.type === "media") && !!link.unique;
  // Content and media URLs are resolved from the UDI, so only external links keep theirs.
  const url = isEntity ? undefined : link.url || undefined;

  return {
    ...item,
    name: link.name || undefined,
    target: link.target || undefined,
    queryString: link.queryString || undefined,
    udi: isEntity
      ? toUdi(link.type as MeganavEntityType, link.unique!)
      : undefined,
    url,
  };
}

export function getItemIcon(item: MeganavItem): string {
  switch (parseUdi(item.udi)?.entityType) {
    case "document":
      return "icon-document";
    case "media":
      return "icon-picture";
    default:
      return "icon-link";
  }
}

/** Opens Umbraco's link picker for an item; resolves `undefined` when cancelled. */
export async function pickLink(
  host: UmbLitElement,
  item: MeganavItem,
  config: MeganavLinkPickerConfig,
  isNew: boolean,
): Promise<MeganavItem | undefined> {
  const modalManager = await host.getContext(UMB_MODAL_MANAGER_CONTEXT);

  if (!modalManager) return undefined;

  // `isNew` and `hideTarget` are only understood by later versions, so we widen the v14 type.
  const data = {
    config,
    index: null,
    isNew,
  } as UmbLinkPickerModalData;

  const modal = modalManager.open(host, UMB_LINK_PICKER_MODAL, {
    data,
    value: {
      link: itemToLink(item),
    },
  });

  const result = await modal.onSubmit().catch(() => undefined);

  if (!result?.link) return undefined;

  return linkToItem(result.link, item);
}
