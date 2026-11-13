import type { MeganavItemType } from "../../types.js";
import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface MeganavItemTypeModalData {
  /** Every configured item type, offered as allowed child types. */
  itemTypes: Array<MeganavItemType>;
}

export const MEGANAV_ITEM_TYPE_MODAL = new UmbModalToken<
  MeganavItemTypeModalData,
  MeganavItemType
>("Meganav.Modal.ItemType", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
