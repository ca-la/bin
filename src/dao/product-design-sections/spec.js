'use strict';

const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../../components/product-designs/dao');
const ProductDesignSectionsDAO = require('./index');
const generateAsset = require('../../test-helpers/factories/asset').default;
const { test } = require('../../test-helpers/fresh');

test('ProductDesignSectionsDAO.create creates a section', t => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then(design => {
      return ProductDesignSectionsDAO.create({
        designId: design.id,
        title: 'Front',
        templateName: 'okok',
        panelData: {
          panels: [
            {
              id: 'left-sleeve',
              points: [1, 2, 3]
            }
          ]
        },
        position: 0
      });
    })
    .then(section => {
      t.equal(section.templateName, 'okok');
      t.equal(section.panelData.panels[0].id, 'left-sleeve');
      t.equal(section.title, 'Front');
    });
});

test('ProductDesignSectionsDAO.update updates a section', t => {
  let imageId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      return Promise.all([
        generateAsset({
          originalHeightPx: 1024,
          originalWidthPx: 1024,
          mimeType: 'image/jpeg',
          userId: user.id
        }),
        ProductDesignsDAO.create({
          title: 'Plain White Tee',
          productType: 'TEESHIRT',
          userId: user.id
        })
      ]);
    })
    .then(([assets, design]) => {
      imageId = assets.asset.id;

      return ProductDesignSectionsDAO.create({
        designId: design.id,
        templateName: 'okok',
        position: 0
      });
    })
    .then(section => {
      return ProductDesignSectionsDAO.update(section.id, {
        templateName: null,
        customImageId: imageId,
        title: 'Front',
        panelData: {
          panels: [
            {
              id: 'left-sleeve',
              points: [1, 2, 3]
            }
          ]
        }
      });
    })
    .then(section => {
      t.equal(section.customImageId, imageId);
      t.equal(section.panelData.panels[0].id, 'left-sleeve');
      t.equal(section.title, 'Front');
    });
});
