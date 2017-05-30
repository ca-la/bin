'use strict';

const rethrow = require('pg-rethrow');
const Promise = require('bluebird');

const db = require('../../services/db');
const InvalidDataError = require('../../errors/invalid-data');
const Designer = require('../../domain-objects/designer');
const DesignerPhoto = require('../../domain-objects/designer-photo');

function instantiateWithPhotos(row) {
  const designer = new Designer(row.designer);

  const photos = row.photos
    .filter(Boolean)
    .sort((a, b) => a.position - b.position)
    .map(photo => new DesignerPhoto(photo));

  designer.setPhotos(photos);
  return designer;
}

function getList() {
  return Promise.resolve()
    .then(() => {
      return db.raw(`
    select
      row_to_json(designers.*) as designer,
      json_agg(row_to_json(designerphotos.*)) as photos
    from designers
    left join designerphotos
      on designerphotos.designer_id = designers.id
    group by designers.id;
      `);
    })
    .then((res) => {
      const results = res.rows;

      return results
        .sort((a, b) => a.position - b.position)
        .map(instantiateWithPhotos);
    })
    .catch(rethrow);
}

function getById(designerId) {
  return Promise.resolve()
    .then(() => {
      return db.raw(`
    select
      row_to_json(designers.*) as designer,
      json_agg(row_to_json(designerphotos.*)) as photos
    from designers
    left join designerphotos
      on designerphotos.designer_id = designers.id
    where designers.id = ?
    group by designers.id;
      `, [designerId]);
    })
    .then((res) => {
      const result = res.rows[0];

      if (!result) {
        throw new InvalidDataError('Designer not found');
      }

      return instantiateWithPhotos(result);
    })
    .catch(rethrow)
    .catch(rethrow.ERRORS.InvalidTextRepresentation, () => {
      throw new InvalidDataError('Invalid designer ID format');
    });
}

module.exports = {
  getList,
  getById
};
