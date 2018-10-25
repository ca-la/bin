import * as tape from 'tape';
import { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } from '../../config';
import { test } from '../../test-helpers/fresh';
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
  const enrichedComponent = addAssetLink(component);
  const expectedLink =
    `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/${sketchId}`;
  t.equal(enrichedComponent.assetLink, expectedLink, 'link matches sketchid');
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
  const enrichedComponent = addAssetLink(component);
  const expectedLink =
    `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/${artworkId}`;
  t.equal(enrichedComponent.assetLink, expectedLink, 'link matches sketchid');
});

test('attachAssetsLink returns blank when component is of type material', async (t: tape.Test) => {
  const id = uuid.v4();
  const materialId = uuid.v4();
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
  const enrichedComponent = addAssetLink(component);
  const expectedLink = '';
  t.equal(enrichedComponent.assetLink, expectedLink, 'link matches sketchid');
});
