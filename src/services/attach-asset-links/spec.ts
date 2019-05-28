import * as tape from 'tape';
import * as uuid from 'node-uuid';

import * as Configuration from '../../config';
import { addAssetLink, generatePreviewLinks } from './index';
import { sandbox, test } from '../../test-helpers/fresh';

import Component, { ComponentType } from '../../domain-objects/component';
import * as OptionsDAO from '../../dao/product-design-options';
import * as ImagesDAO from '../../components/images/dao';

function stubUrls(): void {
  sandbox()
    .stub(Configuration, 'AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME')
    .value('aws-example');
  sandbox()
    .stub(Configuration, 'IMGIX_BASE_URL')
    .value('https://imgix.example.com');
}

test('attachAssetsLink returns aws link when component is of type sketch', async (t: tape.Test) => {
  stubUrls();
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
  t.equal(
    enrichedComponent.downloadLink,
    `https://aws-example.s3.amazonaws.com/${sketchId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&max-w=2288`
  );
});

test('attachAssetsLink returns link when component is of type artwork', async (t: tape.Test) => {
  stubUrls();
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
  t.equal(
    enrichedComponent.downloadLink,
    `https://aws-example.s3.amazonaws.com/${artworkId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&max-w=2288`
  );
});

test('attachAssetsLink returns link when component is of type material', async (t: tape.Test) => {
  stubUrls();
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
    .resolves({
      previewImageId: materialImageId,
      uploadCompletedAt: new Date()
    });
  sandbox()
    .stub(ImagesDAO, 'findById')
    .resolves({ uploadCompletedAt: new Date() });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://aws-example.s3.amazonaws.com/${materialImageId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&max-w=2288`
  );
});

test('attachAssetsLink returns link when component is of type material', async (t: tape.Test) => {
  stubUrls();
  const imageId = uuid.v4();
  const imageIdTwo = uuid.v4();
  const enrichedImages = generatePreviewLinks([imageId, imageIdTwo]);
  t.equal(
    enrichedImages[0].thumbnailLink,
    `https://imgix.example.com/${imageId}?fm=jpg&w=48`
  );
  t.equal(
    enrichedImages[0].previewLink,
    `https://imgix.example.com/${imageId}?fm=jpg&w=560`
  );
  t.equal(
    enrichedImages[1].thumbnailLink,
    `https://imgix.example.com/${imageIdTwo}?fm=jpg&w=48`
  );
  t.equal(
    enrichedImages[1].previewLink,
    `https://imgix.example.com/${imageIdTwo}?fm=jpg&w=560`
  );
});
