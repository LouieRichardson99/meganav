import type { MeganavItem, MeganavItemType } from "../../types.js";
import type { MeganavEntityInfo } from "../../utils/entities.js";
import type { MeganavLinkPickerConfig } from "../../utils/link.js";
import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface MeganavItemModalData {
  itemTypes: Array<MeganavItemType>;
  /** The item types allowed where the item sits, offered by "Change type". */
  allowedTypes: Array<MeganavItemType>;
  entity?: MeganavEntityInfo;
  resolveEntity: (udi: string) => Promise<MeganavEntityInfo | undefined>;
  linkPicker: MeganavLinkPickerConfig;
  /** Opens on the Settings tab, e.g. straight after a new item's link is picked. */
  openSettings?: boolean;
}

export const MEGANAV_ITEM_MODAL = new UmbModalToken<
  MeganavItemModalData,
  MeganavItem
>("Meganav.Modal.Item", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
