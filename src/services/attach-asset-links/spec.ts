import * as tape from 'tape';
import * as uuid from 'node-uuid';

import * as Configuration from '../../config';
import { addAssetLink, generatePreviewLinks } from './index';
import { sandbox, test } from '../../test-helpers/fresh';

import Component, {
  ComponentType
} from '../../components/components/domain-object';
import * as OptionsDAO from '../../dao/product-design-options';
import * as ImagesDAO from '../../components/assets/dao';

function stubUrls(): void {
  sandbox()
    .stub(Configuration, 'USER_UPLOADS_BASE_URL')
    .value('https://user-uploads.example.com');
  sandbox()
    .stub(Configuration, 'USER_UPLOADS_IMGIX_URL')
    .value('https://imgix.example.com');
}

test('addAssetLink returns only the download link for non-previewable assets', async (t: tape.Test) => {
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
    .resolves({
      id: sketchId,
      mimeType: 'text/csv',
      uploadCompletedAt: new Date()
    });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${sketchId}`
  );
  t.equal(enrichedComponent.assetLink, null);
  t.equal(enrichedComponent.thumbnailLink, null);
  t.equal(enrichedComponent.fileType, 'csv');
});

test('addAssetLink returns aws link when component is of type sketch', async (t: tape.Test) => {
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
    .resolves({
      id: sketchId,
      mimeType: 'image/png',
      uploadCompletedAt: new Date()
    });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${sketchId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&max-w=2288`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=fill&h=104&w=104`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=fill&h=104&w=104&dpr=2`
  );
  t.equal(enrichedComponent.fileType, 'png');
});

test('addAssetLink returns link when component is of type artwork', async (t: tape.Test) => {
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
    .resolves({
      id: artworkId,
      mimeType: 'image/heic',
      uploadCompletedAt: new Date()
    });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${artworkId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&max-w=2288`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=fill&h=104&w=104`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=fill&h=104&w=104&dpr=2`
  );
  t.equal(enrichedComponent.fileType, 'heic');
});

test('addAssetLink returns link when component is of type material', async (t: tape.Test) => {
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
    .resolves({
      id: materialImageId,
      mimeType: 'image/vnd.adobe.photoshop',
      uploadCompletedAt: new Date()
    });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${materialImageId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&max-w=2288`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=104&w=104`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=104&w=104&dpr=2`
  );
  t.equal(enrichedComponent.fileType, 'psd');
});

test('addAssetLink returns link when component is of type material', async (t: tape.Test) => {
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
