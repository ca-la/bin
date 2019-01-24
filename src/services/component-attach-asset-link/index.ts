import { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } from '../../config';
import Component, { ComponentType } from '../../domain-objects/component';
import { findById as findOptionById } from '../../dao/product-design-options';

async function getLink(component: Component): Promise<string> {
  const awsBaseUrl = `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/`;

  switch (component.type) {
    case ComponentType.Artwork:
      return `${awsBaseUrl}${component.artworkId}`;
    case ComponentType.Sketch:
      return `${awsBaseUrl}${component.sketchId}`;
    case ComponentType.Material:
      const option = await findOptionById(component.materialId);
      return `${awsBaseUrl}${option.previewImageId}`;
  }
  return '';
}

/**
 * addAssetLink simplifies the api for getting an image on a component that
 * will be displayed in the client.
 * @param component {Component} component to add link to
 */
export default async function addAssetLink(
  component: Component
): Promise<Component & { assetLink: string }> {

  const assetLink = await getLink(component);
  return { ...component, assetLink };
}
