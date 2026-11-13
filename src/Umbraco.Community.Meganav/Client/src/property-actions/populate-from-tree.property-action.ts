import type { MeganavPropertyEditorUiElement } from "../property-editor/meganav-property-editor-ui.element.js";
import { MeganavPropertyActionBase } from "./meganav-property-action-base.js";

export class MeganavPopulateFromTreePropertyAction extends MeganavPropertyActionBase {
  protected override run(editor: MeganavPropertyEditorUiElement) {
    return editor.populateFromTree();
  }
}

export default MeganavPopulateFromTreePropertyAction;
