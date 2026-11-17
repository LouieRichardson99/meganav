import type { MeganavItem } from "../types.js";

/** Sets the visibility of an item and all of its descendants. */
export function setVisible(item: MeganavItem, visible: boolean): MeganavItem {
  return {
    ...item,
    visible,
    children: item.children.map((child) => setVisible(child, visible)),
  };
}

export function getUdis(items: Array<MeganavItem>): Array<string> {
  return items.flatMap((item) => [
    ...(item.udi ? [item.udi] : []),
    ...getUdis(item.children),
  ]);
}

export function normalize(
  items: unknown,
  createId: () => string,
): Array<MeganavItem> {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    ...item,
    id: item.id || createId(),
    settings: item.settings ?? {},
    children: normalize(item.children, createId),
  }));
}
