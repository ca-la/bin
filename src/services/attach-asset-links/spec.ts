import uuid from "node-uuid";

import Configuration from "../../config";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import { Component, ComponentType } from "../../components/components/types";
import OptionsDAO from "../../dao/product-design-options";
import * as AssetsDAO from "../../components/assets/dao";
import Asset from "../../components/assets/types";

import {
  buildImgixLink,
  addAssetLink,
  constructAttachmentAssetLinks,
  generatePreviewLinks,
} from "./index";

function stubUrls(): void {
  sandbox()
    .stub(Configuration, "USER_UPLOADS_BASE_URL")
    .value("https://user-uploads.example.com");
  sandbox()
    .stub(Configuration, "USER_UPLOADS_IMGIX_URL")
    .value("https://imgix.example.com");
}

test("buildImgixLink", async (t: Test) => {
  stubUrls();

  t.equal(
    buildImgixLink("an-annotation-id"),
    "https://imgix.example.com/an-annotation-id?fm=jpg",
    "sets jpg format"
  );

  t.equal(
    buildImgixLink("an-annotation-id", { fit: "max" }),
    "https://imgix.example.com/an-annotation-id?fm=jpg&fit=max",
    "can set fit to max"
  );

  t.equal(
    buildImgixLink("an-annotation-id", { fit: "fill" }),
    "https://imgix.example.com/an-annotation-id?fm=jpg&fit=fill",
    "can set fit to fill"
  );

  t.equal(
    buildImgixLink("an-annotation-id", { dpr: 2 }),
    "https://imgix.example.com/an-annotation-id?fm=jpg&dpr=2",
    "can set dpr"
  );

  t.equal(
    buildImgixLink("an-annotation-id", { dpr: 2, fit: "fill" }),
    "https://imgix.example.com/an-annotation-id?fm=jpg&fit=fill&dpr=2",
    "can set dpr and fit"
  );

  t.equal(
    buildImgixLink("an-annotation-id", {
      dpr: 2,
      fit: "fill",
      height: 100,
      pageNumber: 3,
      width: 200,
    }),
    "https://imgix.example.com/an-annotation-id?fm=jpg&fit=fill&h=100&w=200&dpr=2&page=3",
    "can set all options"
  );
});

test("addAssetLink returns only the download link for non-previewable assets", async (t: Test) => {
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

test("addAssetLink returns aws link when component is of type sketch", async (t: Test) => {
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
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=fill&h=160&w=208`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${sketchId}?fm=jpg&fit=fill&h=160&w=208&dpr=2`
  );
  t.equal(enrichedComponent.fileType, "png");
  t.equal(enrichedComponent.assetId, sketchId);
});

test("addAssetLink returns link when component is of type artwork", async (t: Test) => {
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
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=fill&h=160&w=208`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${artworkId}?fm=jpg&fit=fill&h=160&w=208&dpr=2`
  );
  t.equal(enrichedComponent.fileType, "heic");
  t.equal(enrichedComponent.assetId, artworkId);
});

test("addAssetLink returns link when component is of type material", async (t: Test) => {
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
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=160&w=208`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=160&w=208&dpr=2`
  );
  t.equal(enrichedComponent.fileType, "psd");
  t.equal(enrichedComponent.assetId, materialImageId);
});

test("generatePreviewLinks", async (t: Test) => {
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

test("constructAttachmentAssetLinks", async (t: Test) => {
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

test("addAssetLink returns paginated links for components with pages", async (t: Test) => {
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
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=160&w=208&page=2`
  );
  t.equal(
    enrichedComponent.thumbnail2xLink,
    `https://imgix.example.com/${materialImageId}?fm=jpg&fit=fill&h=160&w=208&dpr=2&page=2`
  );
});
