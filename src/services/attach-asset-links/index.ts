import Knex from "knex";
import { URL, URLSearchParams } from "url";
import { USER_UPLOADS_BASE_URL, USER_UPLOADS_IMGIX_URL } from "../../config";
import { Component } from "../../components/components/types";
import { isPreviewable } from "../../services/is-previewable";
import { getExtension } from "../../services/get-extension";
import Asset, {
  AssetLinks,
  DesignImageAsset,
} from "../../components/assets/types";
import getAsset from "../../components/components/get-asset";
import { ComponentWithAssetLinks } from "../../components/canvases/types";
import db from "../../services/db";

interface ImgixOptions {
  fit: "max" | "fill" | null;
  dpr: number | null;
  width: number | null;
  height: number | null;
  pageNumber: number | null;
}

const DESIGN_PREVIEW_TOOL_FORMAT: Partial<ImgixOptions> = { fit: "max" };
export const PREVIEW_CARD_FORMAT: Partial<ImgixOptions> = { width: 560 };
export const THUMBNAIL_FORMAT: Partial<ImgixOptions> = { width: 160 };
export const EMAIL_PREVIEW_FORMAT: Partial<ImgixOptions> = { height: 194 };
const DESIGN_PREVIEW_THUMBNAIL: Partial<ImgixOptions> = {
  fit: "fill",
  width: 208,
  height: 160,
};
const ATTACHMENT_PREVIEW: Partial<ImgixOptions> = {
  fit: "fill",
  height: 106,
  width: 128,
};

export function buildImgixLink(
  assetId: string,
  {
    fit = null,
    dpr = null,
    width = null,
    height = null,
    pageNumber = null,
  }: Partial<ImgixOptions> = {}
): string {
  const url = new URL(USER_UPLOADS_IMGIX_URL);
  const search = new URLSearchParams();

  url.pathname = assetId;
  search.set("fm", "jpg");

  if (fit !== null) {
    search.set("fit", fit);
  }

  if (height !== null) {
    search.set("h", String(height));
  }

  if (width !== null) {
    search.set("w", String(width));
  }

  if (dpr !== null) {
    search.set("dpr", String(dpr));
  }

  if (pageNumber !== null) {
    search.set("page", String(pageNumber));
  }

  url.search = search.toString();

  return url.toString();
}

function constructAssetLinks(
  asset: Asset,
  pageNumber: number | null
): AssetLinks {
  const hasPreview = isPreviewable(asset.mimeType);

  return {
    assetId: asset.id,
    key: `${asset.id}${pageNumber || ""}`,
    assetLink: hasPreview
      ? buildImgixLink(asset.id, {
          ...DESIGN_PREVIEW_TOOL_FORMAT,
          pageNumber,
        })
      : null,
    asset3xLink: hasPreview
      ? buildImgixLink(asset.id, {
          ...DESIGN_PREVIEW_TOOL_FORMAT,
          pageNumber,
          dpr: 3,
        })
      : null,
    downloadLink: `${USER_UPLOADS_BASE_URL}/${asset.id}`,
    fileType: getExtension(asset.mimeType) || "Unknown",
    thumbnailLink: hasPreview
      ? buildImgixLink(asset.id, {
          ...DESIGN_PREVIEW_THUMBNAIL,
          pageNumber,
        })
      : null,
    thumbnail2xLink: hasPreview
      ? buildImgixLink(asset.id, {
          ...DESIGN_PREVIEW_THUMBNAIL,
          pageNumber,
          dpr: 2,
        })
      : null,
    originalWidthPx: asset.originalWidthPx,
    originalHeightPx: asset.originalHeightPx,
  };
}

export function getLinksForAsset(asset: Asset): AssetLinks | null {
  if (asset.uploadCompletedAt) {
    return constructAssetLinks(asset, null);
  }

  return null;
}

/**
 * Adds in image links based off the given component.
 */
export async function getLink(
  component: Component,
  ktx: Knex = db
): Promise<AssetLinks & { mimeType: string }> {
  const asset = await getAsset(component, ktx);
  if (asset && asset.uploadCompletedAt) {
    return {
      ...constructAssetLinks(asset, component.assetPageNumber),
      mimeType: asset.mimeType,
    };
  }

  return {
    assetId: null,
    key: "",
    assetLink: null,
    asset3xLink: null,
    downloadLink: "",
    fileType: "",
    mimeType: "",
    thumbnail2xLink: null,
    thumbnailLink: null,
    originalWidthPx: null,
    originalHeightPx: null,
  };
}

export type EnrichedComponent = Component & AssetLinks;
/**
 * addAssetLink simplifies the api for getting an image on a component that
 * will be displayed in the client.
 * @param component {Component} component to add link to
 */
export async function addAssetLink(
  component: Component,
  ktx: Knex = db
): Promise<ComponentWithAssetLinks> {
  const assetLink = await getLink(component, ktx);
  return { ...component, ...assetLink };
}

export interface ThumbnailAndPreviewLinks {
  thumbnailLink: string;
  previewLink: string;
}

/**
 * Generates thumbnail and preview links based off the given image ids.
 * Terminology:
 * - thumbnail: a 48px wide png image (intended for dropdown menus).
 * - preview: a 560px wide png image (intended for resource cards).
 */
export function generatePreviewLinks(
  imageIds: string[]
): ThumbnailAndPreviewLinks[] {
  return imageIds.map(
    (imageId: string): ThumbnailAndPreviewLinks => {
      return {
        previewLink: buildImgixLink(imageId, PREVIEW_CARD_FORMAT),
        thumbnailLink: buildImgixLink(imageId, THUMBNAIL_FORMAT),
      };
    }
  );
}

export function generatePreviewLinksFromDesignImageAssets(
  imageAssets: DesignImageAsset[]
): ThumbnailAndPreviewLinks[] {
  return imageAssets.map(
    (imageAsset: {
      id: string;
      page: number | null;
    }): ThumbnailAndPreviewLinks => {
      return {
        previewLink: buildImgixLink(imageAsset.id, {
          ...PREVIEW_CARD_FORMAT,
          pageNumber: imageAsset.page,
        }),
        thumbnailLink: buildImgixLink(imageAsset.id, {
          ...THUMBNAIL_FORMAT,
          pageNumber: imageAsset.page,
        }),
      };
    }
  );
}

export function generateThumbnailLinks(imageIds: string[]): string[] {
  return imageIds.map((imageId: string): string => {
    return buildImgixLink(imageId, THUMBNAIL_FORMAT);
  });
}

export function generateThumbnailLinksFromDesignImageAssets(
  imageAssets: DesignImageAsset[]
): string[] {
  return imageAssets.map(
    (imageAsset: { id: string; page: number | null }): string => {
      return buildImgixLink(imageAsset.id, {
        ...THUMBNAIL_FORMAT,
        pageNumber: imageAsset.page,
      });
    }
  );
}

export function constructAttachmentAssetLinks(asset: Asset): AssetLinks {
  const hasPreview = isPreviewable(asset.mimeType);
  return {
    assetId: asset.id,
    key: asset.id,
    assetLink: hasPreview
      ? buildImgixLink(asset.id, DESIGN_PREVIEW_TOOL_FORMAT)
      : null,
    asset3xLink: hasPreview
      ? buildImgixLink(asset.id, { ...DESIGN_PREVIEW_TOOL_FORMAT, dpr: 3 })
      : null,
    downloadLink: `${USER_UPLOADS_BASE_URL}/${asset.id}`,
    fileType: getExtension(asset.mimeType) || "Unknown",
    thumbnailLink: hasPreview
      ? buildImgixLink(asset.id, ATTACHMENT_PREVIEW)
      : null,
    thumbnail2xLink: hasPreview
      ? buildImgixLink(asset.id, { ...ATTACHMENT_PREVIEW, dpr: 2 })
      : null,
    originalWidthPx: asset.originalWidthPx,
    originalHeightPx: asset.originalHeightPx,
  };
}
