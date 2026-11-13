export interface MeganavItem {
  id: string;
  name?: string;
  target?: string;
  queryString?: string;
  udi?: string;
  url?: string;
  visible?: boolean;
  itemTypeId?: string;
  settings: Record<string, unknown>;
  children: MeganavItem[];
}

export type MeganavValue = Array<MeganavItem>;

export interface MeganavItemType {
  id: string;
  name: string;
  alias: string;
  icon?: string;
  /** Unique of the element type whose properties make up the item's settings. */
  settingsType?: string;
  allowAtRoot: boolean;
  /** Ids of the item types allowed as children; empty allows all. */
  allowedTypes: Array<string>;
}
