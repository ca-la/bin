import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { sandbox, test } from '../../test-helpers/fresh';
import { addAssetLink, AWS_BASE_URL, generatePreviewLinks, IMGIX_BASE_URL } from './index';

import Component, { ComponentType } from '../../domain-objects/component';
import * as OptionsDAO from '../../dao/product-design-options';
import * as ImagesDAO from '../../components/images/dao';

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

  sandbox()
    .stub(ImagesDAO, 'findById')
    .resolves({ uploadCompletedAt: new Date() });

  const enrichedComponent = await addAssetLink(component);
  t.ok(enrichedComponent.downloadLink.includes(sketchId), 'download link contains the sketch id.');
  t.ok(enrichedComponent.downloadLink.includes(AWS_BASE_URL), 'download link points to AWS.');
  t.ok(enrichedComponent.assetLink.includes(sketchId), 'asset link matches sketch id.');
  t.ok(enrichedComponent.assetLink.includes(IMGIX_BASE_URL), 'asset link points to imgix.');
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

  sandbox()
    .stub(ImagesDAO, 'findById')
    .resolves({ uploadCompletedAt: new Date() });

  const enrichedComponent = await addAssetLink(component);
  t.ok(enrichedComponent.downloadLink.includes(artworkId), 'download link contains artwork id.');
  t.ok(enrichedComponent.downloadLink.includes(AWS_BASE_URL), 'download link points to AWS.');
  t.ok(enrichedComponent.assetLink.includes(artworkId), 'asset link contains artwork id.');
  t.ok(enrichedComponent.assetLink.includes(IMGIX_BASE_URL), 'asset link points to imgix.');
});

test('attachAssetsLink returns link when component is of type material', async (t: tape.Test) => {
  const id = uuid.v4();
  const materialId = uuid.v4();
  const materialImageId = uuid.v4();
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

  sandbox()
    .stub(OptionsDAO, 'findById')
    .resolves({ previewImageId: materialImageId, uploadCompletedAt: new Date() });
  sandbox()
    .stub(ImagesDAO, 'findById')
    .resolves({ uploadCompletedAt: new Date() });

  const enrichedComponent = await addAssetLink(component);
  t.ok(
    enrichedComponent.downloadLink.includes(materialImageId),
    'download link contains material id.'
  );
  t.ok(enrichedComponent.downloadLink.includes(AWS_BASE_URL), 'download link points to AWS.');
  t.ok(
    enrichedComponent.assetLink.includes(materialImageId),
    'asset link contains material id.'
  );
  t.ok(enrichedComponent.assetLink.includes(IMGIX_BASE_URL), 'asset link points to imgix.');
});

test('attachAssetsLink returns link when component is of type material', async (t: tape.Test) => {
  const imageId = uuid.v4();
  const imageIdTwo = uuid.v4();
  const enrichedImages = generatePreviewLinks([imageId, imageIdTwo]);
  t.ok(enrichedImages[0].thumbnailLink.includes(imageId));
  t.ok(enrichedImages[0].previewLink.includes(imageId));
  t.ok(enrichedImages[1].thumbnailLink.includes(imageIdTwo));
  t.ok(enrichedImages[1].previewLink.includes(imageIdTwo));
});
