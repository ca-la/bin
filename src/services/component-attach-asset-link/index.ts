import { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } from '../../config';
import Component, { ComponentType } from '../../domain-objects/component';

/**
 * addAssetLink simplifies the api for getting an image on a component that
 * will be displayed in the client.
 * @param component {Component} component to add link to
 */
export default function addAssetLink(component: Component): Component & { assetLink: string } {
  const awsBaseUrl = `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/`;

  let enrichedComponent = { ...component, assetLink: '' };
  if (component.type === ComponentType.Artwork) {
    const assetLink = `${awsBaseUrl}${component.artworkId}`;
    enrichedComponent = { ...component, assetLink };
  } else if (component.type === ComponentType.Sketch) {
    const assetLink = `${awsBaseUrl}${component.sketchId}`;
    enrichedComponent = { ...component, assetLink };
  }
  return enrichedComponent;
}
