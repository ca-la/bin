'use strict';

const pick = require('lodash/pick');
const createUser = require('../../test-helpers/create-user');
const ProductDesignImagePlacementsDAO = require('./index');
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
    width: iteration + 106
  },
  {
    x: iteration + 201,
    y: iteration + 202,
    imageId,
    zIndex: iteration + 203,
    rotation: iteration + 204,
    height: iteration + 205,
    width: iteration + 206
  }];
}


test('ProductDesignImagePlacementsDAO.replaceForSection creates and updates placements', (t) => {
  let imageId;
  let sectionId;

  let firstPlacementData;
  let secondPlacementData;
  return createUser({ withSession: false })
    .then(({ user }) => {
      return Promise.all([
        ProductDesignImagesDAO.create({ userId: user.id }),
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
        templateName: 'okok'
      });
    })
    .then((section) => {
      sectionId = section.id;
      return ProductDesignImagePlacementsDAO.replaceForSection(sectionId, firstPlacementData);
    })
    .then(() => {
      return ProductDesignImagePlacementsDAO.findBySectionId(sectionId);
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

      return ProductDesignImagePlacementsDAO.replaceForSection(sectionId, secondPlacementData);
    })
    .then(() => {
      return ProductDesignImagePlacementsDAO.findBySectionId(sectionId);
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
