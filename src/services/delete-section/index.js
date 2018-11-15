'use strict';

const db = require('../../services/db');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const { requireValues } = require('../require-properties');
const { sendSectionDeleteNotifications } = require('../create-notifications');

async function deleteSection({ sectionId, designId, actorUserId }) {
  requireValues({ sectionId, designId, actorUserId });

  return db.transaction(async (trx) => {
    const deleted = await ProductDesignSectionsDAO.deleteByIdTrx(trx, sectionId);

    await ProductDesignFeaturePlacementsDAO.deleteForSectionTrx(trx, sectionId);
    await ProductDesignSelectedOptionsDAO.deleteForSectionTrx(trx, sectionId);

    await sendSectionDeleteNotifications(
      deleted.title || 'Untitled',
      designId,
      actorUserId
    );
  });
}

module.exports = deleteSection;
