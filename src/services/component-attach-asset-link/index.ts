import {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
  IMGIX_DOMAIN
} from '../../config';
import Component, { ComponentType } from '../../domain-objects/component';
import { findById as findOptionById } from '../../dao/product-design-options';

interface AssetLinks {
  assetLink: string;
  downloadLink: string;
}

async function getLink(component: Component): Promise<AssetLinks> {
  const imgixBaseUrl = `https://${IMGIX_DOMAIN}.imgix.net/`;
  const awsBaseUrl = `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/`;

  switch (component.type) {
    case ComponentType.Artwork:
      return {
        assetLink: `${imgixBaseUrl}${component.artworkId}`,
        downloadLink: `${awsBaseUrl}${component.artworkId}`
      };
    case ComponentType.Sketch:
      return {
        assetLink: `${imgixBaseUrl}${component.sketchId}`,
        downloadLink: `${awsBaseUrl}${component.sketchId}`
      };
    case ComponentType.Material:
      const option = await findOptionById(component.materialId);
      return {
        assetLink: `${imgixBaseUrl}${option.previewImageId}`,
        downloadLink: `${awsBaseUrl}${option.previewImageId}`
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
