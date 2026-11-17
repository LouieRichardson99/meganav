export interface TreeItem<T> {
  id: string;
  children: Array<T>;
}

/** Element typing for the tag name map, where the item type isn't known. */
export type AnyTreeItem = {
  id: string;
  children: Array<AnyTreeItem>;
};

export function findItem<T extends TreeItem<T>>(
  items: Array<T>,
  id: string,
): T | undefined {
  for (const item of items) {
    if (item.id === id) return item;

    const found = findItem(item.children, id);

    if (found) return found;
  }

  return undefined;
}

/** `null` when the item is at the root or isn't found. */
export function findParent<T extends TreeItem<T>>(
  items: Array<T>,
  id: string,
  parent: T | null = null,
): T | null {
  for (const item of items) {
    if (item.id === id) return parent;

    const found = findParent(item.children, id, item);

    if (found) return found;
  }

  return null;
}

export function updateItem<T extends TreeItem<T>>(
  items: Array<T>,
  id: string,
  patch: Partial<T>,
): Array<T> {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
        }
      : {
          ...item,
          children: updateItem(item.children, id, patch),
        },
  );
}

export function removeItem<T extends TreeItem<T>>(
  items: Array<T>,
  id: string,
): Array<T> {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeItem(item.children, id),
    }));
}

export function setChildren<T extends TreeItem<T>>(
  items: Array<T>,
  parentId: string | null,
  children: Array<T>,
): Array<T> {
  if (parentId === null) return [...children];

  return items.map((item) =>
    item.id === parentId
      ? {
          ...item,
          children: [...children],
        }
      : {
          ...item,
          children: setChildren(item.children, parentId, children),
        },
  );
}

export function insertItem<T extends TreeItem<T>>(
  items: Array<T>,
  parentId: string | null,
  index: number,
  newItem: T,
): Array<T> {
  const siblings =
    parentId === null ? items : (findItem(items, parentId)?.children ?? []);
  const next = [...siblings];

  next.splice(index < 0 ? next.length : index, 0, newItem);

  return setChildren(items, parentId, next);
}

/** Ids of every item that has children. */
export function getParentIds<T extends TreeItem<T>>(
  items: Array<T>,
): Array<string> {
  return items.flatMap((item) =>
    item.children.length ? [item.id, ...getParentIds(item.children)] : [],
  );
}

/** Number of levels occupied by an item and its descendants (a leaf is 1). */
export function getDepth<T extends TreeItem<T>>(item: T): number {
  return (
    1 + (item.children.length ? Math.max(...item.children.map(getDepth)) : 0)
  );
}

export function containsId<T extends TreeItem<T>>(
  item: T,
  id: string | null,
): boolean {
  if (id === null) return false;

  return item.id === id || item.children.some((child) => containsId(child, id));
}
