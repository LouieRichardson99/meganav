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
