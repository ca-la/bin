import * as mime from 'mime-types';
import {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
  IMGIX_BASE_URL
} from '../../config';
import Component, {
  ComponentType
} from '../../components/components/domain-object';
import * as OptionsDAO from '../../dao/product-design-options';
import * as ImagesDAO from '../../components/assets/dao';
import { isPreviewable } from '../../components/assets/services/is-previewable';

export interface AssetLinks {
  assetLink: string | null;
  downloadLink: string;
  fileType: string;
  thumbnail2xLink: string | null;
  thumbnailLink: string | null;
}

const DESIGN_PREVIEW_TOOL_FORMAT = '?fm=jpg&max-w=2288';
const PREVIEW_CARD_FORMAT = '?fm=jpg&w=560';
const THUMBNAIL_FORMAT = '?fm=jpg&w=48';
const DESIGN_PREVIEW_THUMBNAIL = '?fm=jpg&fit=fill&h=104&w=104';
const DESIGN_PREVIEW_THUMBNAIL_2X = DESIGN_PREVIEW_THUMBNAIL + '&dpr=2';

function constructAssetLinks(options: {
  id: string;
  mimeType: string;
}): AssetLinks {
  const AWS_BASE_URL = `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com`;
  const hasPreview = isPreviewable(options.mimeType);
  return {
    assetLink: hasPreview
      ? `${IMGIX_BASE_URL}/${options.id}${DESIGN_PREVIEW_TOOL_FORMAT}`
      : null,
    downloadLink: `${AWS_BASE_URL}/${options.id}`,
    fileType: mime.extension(options.mimeType) || 'Unknown',
    thumbnailLink: hasPreview
      ? `${IMGIX_BASE_URL}/${options.id}${DESIGN_PREVIEW_THUMBNAIL}`
      : null,
    thumbnail2xLink: hasPreview
      ? `${IMGIX_BASE_URL}/${options.id}${DESIGN_PREVIEW_THUMBNAIL_2X}`
      : null
  };
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
        mimeType: artworkImage.mimeType
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
        mimeType: sketchImage.mimeType
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
        mimeType: materialImage.mimeType
      });
    }
  }

  return {
    assetLink: null,
    downloadLink: '',
    fileType: '',
    thumbnail2xLink: null,
    thumbnailLink: null
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
        previewLink: `${IMGIX_BASE_URL}/${imageId}${PREVIEW_CARD_FORMAT}`,
        thumbnailLink: `${IMGIX_BASE_URL}/${imageId}${THUMBNAIL_FORMAT}`
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
  return imageIds.map(
    (imageId: string): string => {
      return `${IMGIX_BASE_URL}/${imageId}${THUMBNAIL_FORMAT}`;
    }
  );
}
