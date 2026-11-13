import type { MeganavItem } from "../types.js";

export function findItem(
  items: Array<MeganavItem>,
  id: string,
): MeganavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;

    const found = findItem(item.children ?? [], id);

    if (found) return found;
  }

  return undefined;
}

/** `null` when the item is at the root or isn't found. */
export function findParent(
  items: Array<MeganavItem>,
  id: string,
  parent: MeganavItem | null = null,
): MeganavItem | null {
  for (const item of items) {
    if (item.id === id) return parent;

    const found = findParent(item.children ?? [], id, item);

    if (found) return found;
  }

  return null;
}

export function updateItem(
  items: Array<MeganavItem>,
  id: string,
  patch: Partial<MeganavItem>,
): Array<MeganavItem> {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
        }
      : {
          ...item,
          children: updateItem(item.children ?? [], id, patch),
        },
  );
}

/** Sets the visibility of an item and all of its descendants. */
export function setVisible(item: MeganavItem, visible: boolean): MeganavItem {
  return {
    ...item,
    visible,
    children: (item.children ?? []).map((child) => setVisible(child, visible)),
  };
}

export function removeItem(
  items: Array<MeganavItem>,
  id: string,
): Array<MeganavItem> {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeItem(item.children ?? [], id),
    }));
}

export function setChildren(
  items: Array<MeganavItem>,
  parentId: string | null,
  children: Array<MeganavItem>,
): Array<MeganavItem> {
  if (parentId === null) return [...children];

  return items.map((item) =>
    item.id === parentId
      ? {
          ...item,
          children: [...children],
        }
      : {
          ...item,
          children: setChildren(item.children ?? [], parentId, children),
        },
  );
}

export function insertItem(
  items: Array<MeganavItem>,
  parentId: string | null,
  index: number,
  newItem: MeganavItem,
): Array<MeganavItem> {
  const siblings =
    parentId === null ? items : (findItem(items, parentId)?.children ?? []);
  const next = [...siblings];

  next.splice(index < 0 ? next.length : index, 0, newItem);

  return setChildren(items, parentId, next);
}

export function getUdis(items: Array<MeganavItem>): Array<string> {
  return items.flatMap((item) => [
    ...(item.udi ? [item.udi] : []),
    ...getUdis(item.children ?? []),
  ]);
}

/** Ids of every item that has children. */
export function getParentIds(items: Array<MeganavItem>): Array<string> {
  return items.flatMap((item) =>
    item.children?.length ? [item.id, ...getParentIds(item.children)] : [],
  );
}

/** Number of levels occupied by an item and its descendants (a leaf is 1). */
export function getDepth(item: MeganavItem): number {
  const children = item.children ?? [];

  return 1 + (children.length ? Math.max(...children.map(getDepth)) : 0);
}

export function containsId(item: MeganavItem, id: string | null): boolean {
  if (id === null) return false;

  return (
    item.id === id ||
    (item.children ?? []).some((child) => containsId(child, id))
  );
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
