import type { MeganavPropertyEditorUiElement } from "../property-editor/meganav-property-editor-ui.element.js";
import { UmbActionBase } from "@umbraco-cms/backoffice/action";
import { UMB_PROPERTY_CONTEXT } from "@umbraco-cms/backoffice/property";

// `UmbPropertyActionBase` isn't exported until after v14, so this builds on `UmbActionBase`.
export abstract class MeganavPropertyActionBase extends UmbActionBase<unknown> {
  protected abstract run(
    editor: MeganavPropertyEditorUiElement,
  ): void | Promise<void>;

  async getHref(): Promise<string | undefined> {
    return undefined;
  }

  async execute() {
    const context = await this.getContext(UMB_PROPERTY_CONTEXT);
    const editor = context?.getEditor() as
      | MeganavPropertyEditorUiElement
      | undefined;

    if (!editor) return;

    await this.run(editor);
  }
}
