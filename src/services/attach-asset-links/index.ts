import { USER_UPLOADS_BASE_URL, USER_UPLOADS_IMGIX_URL } from "../../config";
import { Component } from "../../components/components/types";
import { isPreviewable } from "../../services/is-previewable";
import { getExtension } from "../../services/get-extension";
import Asset, { AssetLinks } from "../../components/assets/types";
import getAsset from "../../components/components/get-asset";

const DESIGN_PREVIEW_TOOL_FORMAT = "?fm=jpg&fit=max";
const DESIGN_PREVIEW_TOOL_FORMAT_3X = "?fm=jpg&fit=max&dpr=3";
const PREVIEW_CARD_FORMAT = "?fm=jpg&w=560";
const THUMBNAIL_FORMAT = "?fm=jpg&w=160";
const DESIGN_PREVIEW_THUMBNAIL = "?fm=jpg&fit=fill&h=104&w=104";
const DESIGN_PREVIEW_THUMBNAIL_2X = DESIGN_PREVIEW_THUMBNAIL + "&dpr=2";
const ATTACHMENT_PREVIEW = "?fm=jpg&fit=fill&h=106&w=128";
const ATTACHMENT_PREVIEW_2X = ATTACHMENT_PREVIEW + "&dpr=2";

function constructAssetLinks(
  asset: Asset,
  pageNumber: number | null
): AssetLinks {
  const pageSuffix = pageNumber === null ? "" : `&page=${pageNumber}`;

  const hasPreview = isPreviewable(asset.mimeType);

  return {
    assetId: asset.id,
    assetLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_TOOL_FORMAT}${pageSuffix}`
      : null,
    asset3xLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_TOOL_FORMAT_3X}${pageSuffix}`
      : null,
    downloadLink: `${USER_UPLOADS_BASE_URL}/${asset.id}`,
    fileType: getExtension(asset.mimeType) || "Unknown",
    thumbnailLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_THUMBNAIL}${pageSuffix}`
      : null,
    thumbnail2xLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_THUMBNAIL_2X}${pageSuffix}`
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
async function getLink(component: Component): Promise<AssetLinks> {
  const asset = await getAsset(component);
  if (asset && asset.uploadCompletedAt) {
    return constructAssetLinks(asset, component.assetPageNumber);
  }

  return {
    assetId: null,
    assetLink: null,
    asset3xLink: null,
    downloadLink: "",
    fileType: "",
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
  component: Component
): Promise<Component & AssetLinks> {
  const assetLink = await getLink(component);
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
        previewLink: `${USER_UPLOADS_IMGIX_URL}/${imageId}${PREVIEW_CARD_FORMAT}`,
        thumbnailLink: `${USER_UPLOADS_IMGIX_URL}/${imageId}${THUMBNAIL_FORMAT}`,
      };
    }
  );
}

/**
 * Generates thumbnail links based off the given image ids.
 * Terminology:
 * - thumbnail: a 48px wide png image (intended for dropdown menus).
 */
export function generateThumbnailLinks(imageIds: string[]): string[] {
  return imageIds.map((imageId: string): string => {
    return `${USER_UPLOADS_IMGIX_URL}/${imageId}${THUMBNAIL_FORMAT}`;
  });
}

export function constructAttachmentAssetLinks(asset: Asset): AssetLinks {
  const hasPreview = isPreviewable(asset.mimeType);
  return {
    assetId: asset.id,
    assetLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_TOOL_FORMAT}`
      : null,
    asset3xLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_TOOL_FORMAT_3X}`
      : null,
    downloadLink: `${USER_UPLOADS_BASE_URL}/${asset.id}`,
    fileType: getExtension(asset.mimeType) || "Unknown",
    thumbnailLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${ATTACHMENT_PREVIEW}`
      : null,
    thumbnail2xLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${ATTACHMENT_PREVIEW_2X}`
      : null,
    originalWidthPx: asset.originalWidthPx,
    originalHeightPx: asset.originalHeightPx,
  };
}
