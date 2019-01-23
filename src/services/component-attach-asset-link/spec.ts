import * as tape from 'tape';
import {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME as AWS_BUCKET_NAME,
  IMGIX_DOMAIN
} from '../../config';
import { sandbox, test } from '../../test-helpers/fresh';
import * as OptionsDAO from '../../dao/product-design-options';
import addAssetLink from './index';
import * as uuid from 'node-uuid';
import Component, { ComponentType } from '../../domain-objects/component';

test('attachAssetsLink returns aws link when component is of type sketch', async (t: tape.Test) => {
  const id = uuid.v4();
  const sketchId = uuid.v4();
  const component: Component = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: 'test',
    deletedAt: new Date(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch
  };
  const enrichedComponent = await addAssetLink(component);
  const expectedLink = `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/${sketchId}`;
  const expectedAssetLink = `https://${IMGIX_DOMAIN}.imgix.net/${sketchId}`;
  t.equal(enrichedComponent.downloadLink, expectedLink, 'download link matches sketch id.');
  t.equal(enrichedComponent.assetLink, expectedAssetLink, 'asset link matches sketch id.');
});

test('attachAssetsLink returns link when component is of type artwork', async (t: tape.Test) => {
  const id = uuid.v4();
  const artworkId = uuid.v4();
  const component: Component = {
    artworkId,
    createdAt: new Date(),
    createdBy: 'test',
    deletedAt: new Date(),
    id,
    materialId: null,
    parentId: null,
    sketchId: null,
    type: ComponentType.Artwork
  };
  const enrichedComponent = await addAssetLink(component);
  const expectedLink = `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/${artworkId}`;
  const expectedAssetLink = `https://${IMGIX_DOMAIN}.imgix.net/${artworkId}`;
  t.equal(enrichedComponent.downloadLink, expectedLink, 'download link matches artwork id.');
  t.equal(enrichedComponent.assetLink, expectedAssetLink, 'asset link matches artwork id.');
});

test('attachAssetsLink returns link when component is of type material', async (t: tape.Test) => {
  const id = uuid.v4();
  const materialId = uuid.v4();
  const imgId = uuid.v4();
  sandbox().stub(OptionsDAO, 'findById').resolves({ previewImageId: imgId });
  const component: Component = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: 'test',
    deletedAt: new Date(),
    id,
    materialId,
    parentId: null,
    sketchId: null,
    type: ComponentType.Material
  };
  const enrichedComponent = await addAssetLink(component);
  const expectedLink = `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/${imgId}`;
  const expectedAssetLink = `https://${IMGIX_DOMAIN}.imgix.net/${imgId}`;
  t.equal(enrichedComponent.downloadLink, expectedLink, 'download link matches preview image id.');
  t.equal(enrichedComponent.assetLink, expectedAssetLink, 'asset link matches preview image id.');
});
