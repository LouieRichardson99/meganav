import type { MeganavItem } from "./types.js";

const options: EventInit = {
  bubbles: true,
  composed: true,
};

export class MeganavEditItemEvent extends Event {
  static readonly TYPE = "meganav-edit-item";

  constructor(public readonly id: string) {
    super(MeganavEditItemEvent.TYPE, options);
  }
}

/** Clicking an item, as opposed to the cog. */
export class MeganavEditLinkEvent extends Event {
  static readonly TYPE = "meganav-edit-link";

  constructor(public readonly id: string) {
    super(MeganavEditLinkEvent.TYPE, options);
  }
}

export class MeganavRemoveItemEvent extends Event {
  static readonly TYPE = "meganav-remove-item";

  constructor(public readonly id: string) {
    super(MeganavRemoveItemEvent.TYPE, options);
  }
}

export class MeganavToggleVisibilityEvent extends Event {
  static readonly TYPE = "meganav-toggle-visibility";

  constructor(public readonly id: string) {
    super(MeganavToggleVisibilityEvent.TYPE, options);
  }
}

export class MeganavToggleCollapseEvent extends Event {
  static readonly TYPE = "meganav-toggle-collapse";

  constructor(public readonly id: string) {
    super(MeganavToggleCollapseEvent.TYPE, options);
  }
}

export class MeganavAddItemEvent extends Event {
  static readonly TYPE = "meganav-add-item";

  /** @param index position to insert at, or -1 to append. */
  constructor(
    public readonly parentId: string | null,
    public readonly index: number,
  ) {
    super(MeganavAddItemEvent.TYPE, options);
  }
}

export class MeganavChildrenChangeEvent extends Event {
  static readonly TYPE = "meganav-children-change";

  constructor(
    public readonly parentId: string | null,
    public readonly children: Array<MeganavItem>,
  ) {
    super(MeganavChildrenChangeEvent.TYPE, options);
  }
}
