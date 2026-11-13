import type { MeganavPropertyEditorUiElement } from "../property-editor/meganav-property-editor-ui.element.js";
import { MeganavPropertyActionBase } from "./meganav-property-action-base.js";

export class MeganavExpandAllPropertyAction extends MeganavPropertyActionBase {
  protected override run(editor: MeganavPropertyEditorUiElement) {
    return editor.expandAll();
  }
}

export default MeganavExpandAllPropertyAction;
