const options: EventInit = {
  bubbles: true,
  composed: true,
};

/** Dispatched on the tree itself, with the whole value, whenever an item is dragged. */
export class MeganavTreeChangeEvent<T> extends Event {
  static readonly TYPE = "meganav-tree-change";

  constructor(public readonly items: Array<T>) {
    super(MeganavTreeChangeEvent.TYPE);
  }
}

/** Clicking the inline create button between items. */
export class MeganavTreeInsertEvent extends Event {
  static readonly TYPE = "meganav-tree-insert";

  /** @param index position to insert at, or -1 to append. */
  constructor(
    public readonly parentId: string | null,
    public readonly index: number,
  ) {
    super(MeganavTreeInsertEvent.TYPE, options);
  }
}

/** From a level to the tree, which stops it. */
export class MeganavTreeLevelChangeEvent<T> extends Event {
  static readonly TYPE = "meganav-tree-level-change";

  constructor(
    public readonly parentId: string | null,
    public readonly children: Array<T>,
  ) {
    super(MeganavTreeLevelChangeEvent.TYPE, options);
  }
}

/** From a level to the tree, which stops it. */
export class MeganavTreeToggleEvent extends Event {
  static readonly TYPE = "meganav-tree-toggle";

  constructor(public readonly id: string) {
    super(MeganavTreeToggleEvent.TYPE, options);
  }
}
