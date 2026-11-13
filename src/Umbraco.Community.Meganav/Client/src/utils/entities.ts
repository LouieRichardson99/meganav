import { parseUdi } from "./link.js";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { UmbDocumentItemRepository } from "@umbraco-cms/backoffice/document";
import { UmbMediaItemRepository } from "@umbraco-cms/backoffice/media";

export type MeganavEntityState =
  "published" | "unpublished" | "trashed" | "missing";

export interface MeganavEntityInfo {
  name: string;
  icon?: string;
  url?: string;
  state: MeganavEntityState;
}

type UrlsResponse = Array<{
  id: string;
  urlInfos: Array<{
    culture: string | null;
    url: string | null;
  }>;
}>;

/** Looks up the current name, icon, URL and state of the documents and media items links point to. */
export class MeganavEntityResolver extends UmbControllerBase {
  async resolve(
    udis: Array<string>,
    culture?: string | null,
  ): Promise<Map<string, MeganavEntityInfo>> {
    const documents = new Map<string, string>();
    const media = new Map<string, string>();

    for (const udi of udis) {
      const entity = parseUdi(udi);

      if (entity?.entityType === "document") {
        documents.set(entity.unique, udi);
      } else if (entity?.entityType === "media") {
        media.set(entity.unique, udi);
      }
    }

    const result = new Map<string, MeganavEntityInfo>();

    for (const udi of [...documents.values(), ...media.values()]) {
      result.set(udi, {
        name: "",
        state: "missing",
      });
    }

    await Promise.all([
      this.#resolveDocuments(documents, culture, result),
      this.#resolveMedia(media, result),
    ]);

    return result;
  }

  async #resolveDocuments(
    udis: Map<string, string>,
    culture: string | null | undefined,
    result: Map<string, MeganavEntityInfo>,
  ) {
    if (!udis.size) return;

    const ids = [...udis.keys()];
    const [{ data }, urls] = await Promise.all([
      new UmbDocumentItemRepository(this).requestItems(ids),
      this.#requestUrls("document", ids, culture),
    ]);

    for (const item of data ?? []) {
      const variant =
        item.variants.find((v) => v.culture === culture) ?? item.variants[0];
      // Compared as strings, as the backend API enum isn't a runtime export in every version.
      const state: string | null | undefined = variant?.state;
      const published =
        state === "Published" || state === "PublishedPendingChanges";

      result.set(udis.get(item.unique)!, {
        name: variant?.name ?? item.name,
        icon: item.documentType.icon,
        url: urls.get(item.unique),
        state: item.isTrashed
          ? "trashed"
          : published
            ? "published"
            : "unpublished",
      });
    }
  }

  async #resolveMedia(
    udis: Map<string, string>,
    result: Map<string, MeganavEntityInfo>,
  ) {
    if (!udis.size) return;

    const ids = [...udis.keys()];
    const [{ data }, urls] = await Promise.all([
      new UmbMediaItemRepository(this).requestItems(ids),
      this.#requestUrls("media", ids),
    ]);

    for (const item of data ?? []) {
      result.set(udis.get(item.unique)!, {
        name: item.name,
        icon: item.mediaType.icon,
        url: urls.get(item.unique),
        state: item.isTrashed ? "trashed" : "published",
      });
    }
  }

  // Calls the Management API directly, as the generated client's signature changes between v14 and v15.
  async #requestUrls(
    entityType: "document" | "media",
    ids: Array<string>,
    culture?: string | null,
  ): Promise<Map<string, string>> {
    const urls = new Map<string, string>();
    const auth = await this.getContext(UMB_AUTH_CONTEXT);

    if (!auth) return urls;

    const config = auth.getOpenApiConfiguration();
    const query = ids.map((id) => `id=${encodeURIComponent(id)}`).join("&");
    const response = await fetch(
      `${config.base}/umbraco/management/api/v1/${entityType}/urls?${query}`,
      {
        credentials: config.credentials,
        headers: {
          Authorization: `Bearer ${await config.token()}`,
        },
      },
    ).catch(() => undefined);

    if (!response?.ok) return urls;

    const data = (await response.json()) as UrlsResponse;

    for (const { id, urlInfos } of data) {
      const info =
        urlInfos.find((u) => u.culture === culture && u.url) ??
        urlInfos.find((u) => u.url);

      if (info?.url) {
        urls.set(id, info.url);
      }
    }

    return urls;
  }
}
