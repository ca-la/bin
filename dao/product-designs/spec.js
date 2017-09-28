'use strict';

const ProductDesignsDAO = require('./index');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

test('ProductDesignsDAO.create creates a design', (t) => {
  let userId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id,
        previewImageUrls: [
          'abcd', 'efgh'
        ],
        metadata: {
          'dipped drawstrings': 'yes please'
        }
      });
    })
    .then((design) => {
      t.equal(design.userId, userId);
      t.equal(design.productType, 'TEESHIRT');
      t.deepEqual(design.metadata, {
        'dipped drawstrings': 'yes please'
      });
      t.deepEqual(design.previewImageUrls, [
        'abcd', 'efgh'
      ]);
    });
});

test('ProductDesignsDAO.update updates a design', (t) => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then((design) => {
      return ProductDesignsDAO.update(design.id, { title: 'Blue Tee' });
    })
    .then((updatedDesign) => {
      t.equal(updatedDesign.title, 'Blue Tee');
    });
});
