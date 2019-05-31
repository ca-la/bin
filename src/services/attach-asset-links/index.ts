import {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
  IMGIX_BASE_URL
} from '../../config';
import Component, {
  ComponentType
} from '../../components/components/domain-object';
import * as OptionsDAO from '../../dao/product-design-options';
import * as ImagesDAO from '../../components/images/dao';

interface AssetLinks {
  assetLink: string;
  downloadLink: string;
}

const DESIGN_PREVIEW_TOOL_FORMAT = '?fm=jpg&max-w=2288';
const PREVIEW_CARD_FORMAT = '?fm=jpg&w=560';
const THUMBNAIL_FORMAT = '?fm=jpg&w=48';

/**
 * Adds in image links based off the given component.
 */
async function getLink(component: Component): Promise<AssetLinks> {
  const AWS_BASE_URL = `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com`;

  switch (component.type) {
    case ComponentType.Artwork:
      const artworkImage = await ImagesDAO.findById(component.artworkId);
      if (!artworkImage.uploadCompletedAt) {
        break;
      }

      return {
        assetLink: `${IMGIX_BASE_URL}/${
          component.artworkId
        }${DESIGN_PREVIEW_TOOL_FORMAT}`,
        downloadLink: `${AWS_BASE_URL}/${component.artworkId}`
      };
    case ComponentType.Sketch:
      const sketchImage = await ImagesDAO.findById(component.sketchId);
      if (!sketchImage.uploadCompletedAt) {
        break;
      }

      return {
        assetLink: `${IMGIX_BASE_URL}/${
          component.sketchId
        }${DESIGN_PREVIEW_TOOL_FORMAT}`,
        downloadLink: `${AWS_BASE_URL}/${component.sketchId}`
      };
    case ComponentType.Material:
      const option = await OptionsDAO.findById(component.materialId);
      const materialImage = await ImagesDAO.findById(option.previewImageId);
      if (!materialImage.uploadCompletedAt) {
        break;
      }
      return {
        assetLink: `${IMGIX_BASE_URL}/${
          option.previewImageId
        }${DESIGN_PREVIEW_TOOL_FORMAT}`,
        downloadLink: `${AWS_BASE_URL}/${option.previewImageId}`
      };
  }

  return {
    assetLink: '',
    downloadLink: ''
  };
}

export interface EnrichedComponent extends Component {
  assetLink: string;
  downloadLink: string;
}

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
