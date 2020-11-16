import { USER_UPLOADS_BASE_URL, USER_UPLOADS_IMGIX_URL } from "../../config";
import Component, {
  ComponentType,
} from "../../components/components/domain-object";
import OptionsDAO from "../../dao/product-design-options";
import * as ImagesDAO from "../../components/assets/dao";
import { isPreviewable } from "../../services/is-previewable";
import { getExtension } from "../../services/get-extension";
import Asset from "../../components/assets/types";

export interface AssetLinks {
  assetLink: string | null;
  downloadLink: string;
  fileType: string;
  thumbnail2xLink: string | null;
  thumbnailLink: string | null;
}

const DESIGN_PREVIEW_TOOL_FORMAT = "?fm=jpg&fit=max&dpr=3";
const PREVIEW_CARD_FORMAT = "?fm=jpg&w=560";
const THUMBNAIL_FORMAT = "?fm=jpg&w=160";
const DESIGN_PREVIEW_THUMBNAIL = "?fm=jpg&fit=fill&h=104&w=104";
const DESIGN_PREVIEW_THUMBNAIL_2X = DESIGN_PREVIEW_THUMBNAIL + "&dpr=2";
const ATTACHMENT_PREVIEW = "?fm=jpg&fit=fill&h=106&w=128";
const ATTACHMENT_PREVIEW_2X = ATTACHMENT_PREVIEW + "&dpr=2";

function constructAssetLinks(options: {
  id: string;
  mimeType: string;
}): AssetLinks {
  const hasPreview = isPreviewable(options.mimeType);
  return {
    assetLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${options.id}${DESIGN_PREVIEW_TOOL_FORMAT}`
      : null,
    downloadLink: `${USER_UPLOADS_BASE_URL}/${options.id}`,
    fileType: getExtension(options.mimeType) || "Unknown",
    thumbnailLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${options.id}${DESIGN_PREVIEW_THUMBNAIL}`
      : null,
    thumbnail2xLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${options.id}${DESIGN_PREVIEW_THUMBNAIL_2X}`
      : null,
  };
}

export function getLinksForAsset(asset: Asset): AssetLinks | null {
  if (asset.uploadCompletedAt) {
    return constructAssetLinks({ id: asset.id, mimeType: asset.mimeType });
  }

  return null;
}

/**
 * Adds in image links based off the given component.
 */
async function getLink(component: Component): Promise<AssetLinks> {
  switch (component.type) {
    case ComponentType.Artwork: {
      if (!component.artworkId) {
        throw new Error(`Component ${component.id} has no artwork_id.`);
      }

      const artworkImage = await ImagesDAO.findById(component.artworkId);
      if (!artworkImage || !artworkImage.uploadCompletedAt) {
        break;
      }

      return constructAssetLinks({
        id: artworkImage.id,
        mimeType: artworkImage.mimeType,
      });
    }

    case ComponentType.Sketch: {
      if (!component.sketchId) {
        throw new Error(`Component ${component.id} has no sketch_id.`);
      }

      const sketchImage = await ImagesDAO.findById(component.sketchId);
      if (!sketchImage || !sketchImage.uploadCompletedAt) {
        break;
      }

      return constructAssetLinks({
        id: sketchImage.id,
        mimeType: sketchImage.mimeType,
      });
    }

    case ComponentType.Material: {
      const option = await OptionsDAO.findById(component.materialId);
      const materialImage = await ImagesDAO.findById(option.previewImageId);
      if (!materialImage || !materialImage.uploadCompletedAt) {
        break;
      }

      return constructAssetLinks({
        id: materialImage.id,
        mimeType: materialImage.mimeType,
      });
    }
  }

  return {
    assetLink: null,
    downloadLink: "",
    fileType: "",
    thumbnail2xLink: null,
    thumbnailLink: null,
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
    assetLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${DESIGN_PREVIEW_TOOL_FORMAT}`
      : null,
    downloadLink: `${USER_UPLOADS_BASE_URL}/${asset.id}`,
    fileType: getExtension(asset.mimeType) || "Unknown",
    thumbnailLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${ATTACHMENT_PREVIEW}`
      : null,
    thumbnail2xLink: hasPreview
      ? `${USER_UPLOADS_IMGIX_URL}/${asset.id}${ATTACHMENT_PREVIEW_2X}`
      : null,
  };
}
