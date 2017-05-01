'use strict';

const CollectionPhotosDAO = require('./index');
const { test } = require('../../test-helpers/fresh');

test('CollectionPhotosDAO.create creates a new photo', (t) => {
  return CollectionPhotosDAO.create({
    collectionId: '123123',
    photoUrl: 'https://example.com/photo.jpg'
  })
    .then((photo) => {
      t.equal(photo.collectionId, '123123');
      t.equal(photo.photoUrl, 'https://example.com/photo.jpg');
    });
});

test('CollectionPhotosDAO.findByCollectionId returns photos', (t) => {
  return Promise.all([
    CollectionPhotosDAO.create({
      collectionId: '1',
      photoUrl: 'https://example.com/photo1.jpg'
    }),
    CollectionPhotosDAO.create({
      collectionId: '1',
      photoUrl: 'https://example.com/photo2.jpg'
    }),
    CollectionPhotosDAO.create({
      collectionId: '2',
      photoUrl: 'https://example.com/photo3.jpg'
    })
  ])
    .then(() => {
      return CollectionPhotosDAO.findByCollectionId('1');
    })
    .then((photos) => {
      t.equal(photos.length, 2);

      const urls = photos.map(photo => photo.photoUrl).sort();

      t.equal(urls[0], 'https://example.com/photo1.jpg');
      t.equal(urls[1], 'https://example.com/photo2.jpg');
    });
});
