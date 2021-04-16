import tape from "tape";
import uuid from "node-uuid";

import Configuration from "../../config";
import {
  addAssetLink,
  constructAttachmentAssetLinks,
  generatePreviewLinks,
} from "./index";
import { sandbox, test } from "../../test-helpers/fresh";

import { Component, ComponentType } from "../../components/components/types";
import OptionsDAO from "../../dao/product-design-options";
import * as AssetsDAO from "../../components/assets/dao";
import Asset from "../../components/assets/types";

function stubUrls(): void {
  sandbox()
    .stub(Configuration, "USER_UPLOADS_BASE_URL")
    .value("https://user-uploads.example.com");
  sandbox()
    .stub(Configuration, "USER_UPLOADS_IMGIX_URL")
    .value("https://imgix.example.com");
}

test("addAssetLink returns only the download link for non-previewable assets", async (t: tape.Test) => {
  stubUrls();
  const id = uuid.v4();
  const sketchId = uuid.v4();
  const component: Component = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: "test",
    deletedAt: new Date(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
    assetPageNumber: null,
  };

  sandbox().stub(AssetsDAO, "findById").resolves({
    id: sketchId,
    mimeType: "text/csv",
    uploadCompletedAt: new Date(),
  });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${sketchId}`
  );
  t.equal(enrichedComponent.assetLink, null);
  t.equal(enrichedComponent.thumbnailLink, null);
  t.equal(enrichedComponent.fileType, "csv");
  t.equal(enrichedComponent.assetId, sketchId);
});

test("addAssetLink returns aws link when component is of type sketch", async (t: tape.Test) => {
  stubUrls();
  const id = uuid.v4();
  const sketchId = uuid.v4();
  const component: Component = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: "test",
    deletedAt: new Date(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch,
    assetPageNumber: null,
  };

  sandbox().stub(AssetsDAO, "findById").resolves({
    id: sketchId,
    mimeType: "image/png",
    uploadCompletedAt: new Date(),
  });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${sketchId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=max`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=fill&h=104&w=104`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=fill&h=104&w=104&dpr=2`
  );
  t.equal(enrichedComponent.fileType, "png");
  t.equal(enrichedComponent.assetId, sketchId);
});

test("addAssetLink returns link when component is of type artwork", async (t: tape.Test) => {
  stubUrls();
  const id = uuid.v4();
  const artworkId = uuid.v4();
  const component: Component = {
    artworkId,
    createdAt: new Date(),
    createdBy: "test",
    deletedAt: new Date(),
    id,
    materialId: null,
    parentId: null,
    sketchId: null,
    type: ComponentType.Artwork,
    assetPageNumber: null,
  };

  sandbox().stub(AssetsDAO, "findById").resolves({
    id: artworkId,
    mimeType: "image/heic",
    uploadCompletedAt: new Date(),
  });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${artworkId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=max`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=fill&h=104&w=104`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=fill&h=104&w=104&dpr=2`
  );
  t.equal(enrichedComponent.fileType, "heic");
  t.equal(enrichedComponent.assetId, artworkId);
});

test("addAssetLink returns link when component is of type material", async (t: tape.Test) => {
  stubUrls();
  const id = uuid.v4();
  const materialId = uuid.v4();
  const materialImageId = uuid.v4();
  const component: Component = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: "test",
    deletedAt: new Date(),
    id,
    materialId,
    parentId: null,
    sketchId: null,
    type: ComponentType.Material,
    assetPageNumber: null,
  };

  sandbox().stub(OptionsDAO, "findById").resolves({
    previewImageId: materialImageId,
    uploadCompletedAt: new Date(),
  });
  sandbox().stub(AssetsDAO, "findById").resolves({
    id: materialImageId,
    mimeType: "image/vnd.adobe.photoshop",
    uploadCompletedAt: new Date(),
  });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${materialImageId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=max`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=104&w=104`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=104&w=104&dpr=2`
  );
  t.equal(enrichedComponent.fileType, "psd");
  t.equal(enrichedComponent.assetId, materialImageId);
});

test("generatePreviewLinks", async (t: tape.Test) => {
  stubUrls();
  const imageId = uuid.v4();
  const imageIdTwo = uuid.v4();
  const enrichedImages = generatePreviewLinks([imageId, imageIdTwo]);
  t.equal(
    enrichedImages[0].thumbnailLink,
    `https://imgix.example.com/${imageId}?fm=jpg&w=160`
  );
  t.equal(
    enrichedImages[0].previewLink,
    `https://imgix.example.com/${imageId}?fm=jpg&w=560`
  );
  t.equal(
    enrichedImages[1].thumbnailLink,
    `https://imgix.example.com/${imageIdTwo}?fm=jpg&w=160`
  );
  t.equal(
    enrichedImages[1].previewLink,
    `https://imgix.example.com/${imageIdTwo}?fm=jpg&w=560`
  );
});

test("constructAttachmentAssetLinks", async (t: tape.Test) => {
  stubUrls();
  const imageId = uuid.v4();
  const attachmentAssetLinks = constructAttachmentAssetLinks({
    id: imageId,
    mimeType: "image/png",
  } as Asset);
  t.equal(
    attachmentAssetLinks.thumbnailLink,
    `https://imgix.example.com/${imageId}?fm=jpg&fit=fill&h=106&w=128`
  );
  t.equal(
    attachmentAssetLinks.downloadLink,
    `https://user-uploads.example.com/${imageId}`
  );
});

test("addAssetLink returns paginated links for components with pages", async (t: tape.Test) => {
  stubUrls();
  const id = uuid.v4();
  const materialId = uuid.v4();
  const materialImageId = uuid.v4();
  const component: Component = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: "test",
    deletedAt: new Date(),
    id,
    materialId,
    parentId: null,
    sketchId: null,
    type: ComponentType.Material,
    assetPageNumber: 2,
  };

  sandbox().stub(OptionsDAO, "findById").resolves({
    previewImageId: materialImageId,
    uploadCompletedAt: new Date(),
  });
  sandbox().stub(AssetsDAO, "findById").resolves({
    id: materialImageId,
    mimeType: "application/pdf",
    uploadCompletedAt: new Date(),
  });

  const enrichedComponent = await addAssetLink(component);
  t.equal(
    enrichedComponent.downloadLink,
    `https://user-uploads.example.com/${materialImageId}`
  );
  t.equal(
    enrichedComponent.assetLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=max&page=2`
  );
  t.equal(
    enrichedComponent.thumbnailLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=104&w=104&page=2`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=104&w=104&dpr=2&page=2`
  );
});
