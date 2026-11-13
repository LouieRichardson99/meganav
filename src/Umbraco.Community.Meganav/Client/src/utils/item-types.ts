import type { MeganavItem, MeganavItemType } from "../types.js";

export function normalizeItemTypes(value: unknown): Array<MeganavItemType> {
  if (!Array.isArray(value)) return [];

  return value.map((itemType) => ({
    ...itemType,
    alias: itemType.alias ?? "",
    icon: itemType.icon || undefined,
    settingsType: itemType.settingsType || undefined,
    allowAtRoot: itemType.allowAtRoot ?? true,
    allowedTypes: itemType.allowedTypes ?? [],
  }));
}

/** When only one item type is configured, every item is of that type. */
export function findItemType(
  itemTypes: Array<MeganavItemType>,
  item: MeganavItem | null | undefined,
): MeganavItemType | undefined {
  if (!item) return undefined;

  if (itemTypes.length === 1) return itemTypes[0];

  return itemTypes.find((itemType) => itemType.id === item.itemTypeId);
}

/** @param parent `null` for the root. */
export function getAllowedTypes(
  itemTypes: Array<MeganavItemType>,
  parent: MeganavItem | null,
): Array<MeganavItemType> {
  if (!parent) return itemTypes.filter((itemType) => itemType.allowAtRoot);

  const allowed = findItemType(itemTypes, parent)?.allowedTypes ?? [];

  if (!allowed.length) return itemTypes;

  return itemTypes.filter((itemType) => allowed.includes(itemType.id));
}

/** Items without a type can go anywhere. */
export function isAllowedIn(
  itemTypes: Array<MeganavItemType>,
  item: MeganavItem,
  parent: MeganavItem | null,
): boolean {
  const itemType = findItemType(itemTypes, item);

  if (!itemType) return true;

  return getAllowedTypes(itemTypes, parent).some(
    (allowed) => allowed.id === itemType.id,
  );
}

export function toAlias(name: string): string {
  const words = name.match(/[a-zA-Z0-9]+/g) ?? [];

  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}
