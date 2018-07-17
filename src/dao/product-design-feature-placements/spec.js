'use strict';

const pick = require('lodash/pick');
const createUser = require('../../test-helpers/create-user');
const ProductDesignFeaturePlacementsDAO = require('./index');
const ProductDesignImagesDAO = require('../product-design-images');
const ProductDesignsDAO = require('../product-designs');
const ProductDesignSectionsDAO = require('../product-design-sections');
const { test } = require('../../test-helpers/fresh');

function getPlacementData(imageId, iteration = 0) {
  return [{
    x: iteration + 101,
    y: iteration + 102,
    imageId,
    zIndex: iteration + 103,
    rotation: iteration + 104,
    height: iteration + 105,
    productionHeightCm: 10,
    productionWidthCm: 10,
    width: iteration + 106,
    type: 'IMAGE',
    processName: 'Embroidery'
  },
  {
    x: iteration + 201,
    y: iteration + 202,
    imageId,
    zIndex: iteration + 203,
    rotation: iteration + 204,
    height: iteration + 205,
    width: iteration + 206,
    productionHeightCm: 10,
    productionWidthCm: 10,
    type: 'IMAGE',
    processName: 'Embroidery'
  }];
}

test('ProductDesignFeaturePlacementsDAO.replaceForSection creates pathData placements', (t) => {
  let sectionId;

  const pathPlacement = {
    x: 12,
    y: 13,
    pathData: {
      points: [
        { x: 1, y: 2 },
        { x: 1000, y: 1200 }
      ]
    },
    zIndex: 14,
    rotation: 15,
    height: 16,
    width: 17,
    type: 'PATH'
  };

  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then((design) => {
      return ProductDesignSectionsDAO.create({
        designId: design.id,
        templateName: 'okok',
        position: 0
      });
    })
    .then((section) => {
      sectionId = section.id;
      return ProductDesignFeaturePlacementsDAO.replaceForSection(sectionId, [pathPlacement]);
    })
    .then((placements) => {
      t.deepEqual(placements[0].pathData, pathPlacement.pathData);
    });
});

test('ProductDesignFeaturePlacementsDAO.replaceForSection creates and updates placements', (t) => {
  let imageId;
  let sectionId;

  let firstPlacementData;
  let secondPlacementData;
  return createUser({ withSession: false })
    .then(({ user }) => {
      return Promise.all([
        ProductDesignImagesDAO.create({
          userId: user.id,
          originalWidthPx: 1024,
          originalHeightPx: 768,
          mimeType: 'image/jpeg'
        }),
        ProductDesignsDAO.create({
          title: 'Plain White Tee',
          productType: 'TEESHIRT',
          userId: user.id
        })
      ]);
    })
    .then(([image, design]) => {
      imageId = image.id;
      firstPlacementData = getPlacementData(imageId);
      secondPlacementData = getPlacementData(imageId, 100);
      return ProductDesignSectionsDAO.create({
        designId: design.id,
        templateName: 'okok',
        position: 0
      });
    })
    .then((section) => {
      sectionId = section.id;
      return ProductDesignFeaturePlacementsDAO.replaceForSection(sectionId, firstPlacementData);
    })
    .then(() => {
      return ProductDesignFeaturePlacementsDAO.findBySectionId(sectionId);
    })
    .then((placements) => {
      t.equal(placements.length, 2);
      t.equal(placements[0].sectionId, sectionId);
      t.equal(placements[1].sectionId, sectionId);
      t.deepEqual(
        pick(placements[0], Object.keys(firstPlacementData[0])),
        firstPlacementData[0]
      );
      t.deepEqual(
        pick(placements[1], Object.keys(firstPlacementData[1])),
        firstPlacementData[1]
      );

      return ProductDesignFeaturePlacementsDAO.replaceForSection(sectionId, secondPlacementData);
    })
    .then(() => {
      return ProductDesignFeaturePlacementsDAO.findBySectionId(sectionId);
    })
    .then((placements) => {
      t.equal(placements.length, 2);
      t.equal(placements[0].sectionId, sectionId);
      t.equal(placements[1].sectionId, sectionId);
      t.deepEqual(
        pick(placements[0], Object.keys(secondPlacementData[0])),
        secondPlacementData[0]
      );
      t.deepEqual(
        pick(placements[1], Object.keys(secondPlacementData[1])),
        secondPlacementData[1]
      );
    });
});
