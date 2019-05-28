'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first').default;
const DesignerPhoto = require('../../domain-objects/designer-photo');

const instantiate = row => new DesignerPhoto(row);

function create(data) {
  return db('designerphotos')
    .insert(
      {
        id: uuid.v4(),
        photo_url: data.photoUrl,
        designer_id: data.designerId,
        position: data.position
      },
      '*'
    )
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

module.exports = {
  create
};
