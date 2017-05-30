'use strict';

const DesignersDAO = require('./index');
const { test } = require('../../test-helpers/fresh');
const { createDesigners } = require('../../test-helpers/factories/designer');

test('DesignersDAO.getList returns many designers and their photos', (t) => {
  return createDesigners()
    .then(() => DesignersDAO.getList())
    .then((list) => {
      t.equal(list.length, 2);
      t.equal(list[0].name, 'Designer 1');
      t.equal(list[0].bioHtml, 'The original and best');

      t.equal(list[1].name, 'Designer 2');
      t.equal(list[1].bioHtml, 'Second place');

      const firstPhotos = list[0].photos;
      const secondPhotos = list[1].photos;

      t.equal(firstPhotos.length, 3);
      t.equal(firstPhotos[0].photoUrl, 'http://designer-1-photo-1.jpg');
      t.equal(firstPhotos[1].photoUrl, 'http://designer-1-photo-2.jpg');
      t.equal(firstPhotos[2].photoUrl, 'http://designer-1-photo-3.jpg');

      t.equal(secondPhotos.length, 3);
      t.equal(secondPhotos[0].photoUrl, 'http://designer-2-photo-1.jpg');
      t.equal(secondPhotos[1].photoUrl, 'http://designer-2-photo-2.jpg');
      t.equal(secondPhotos[2].photoUrl, 'http://designer-2-photo-3.jpg');
    });
});

test('DesignersDAO.getById returns a single designer and their photos', (t) => {
  return createDesigners()
    .then(() => DesignersDAO.getById('5de8a9ee-e46b-4e5b-b7f9-bffb3c3b405c'))
    .then((designer) => {
      t.equal(designer.name, 'Designer 1');
      t.equal(designer.twitterHandle, 'thisiscala');

      const { photos } = designer;

      t.equal(photos.length, 3);
      t.equal(photos[0].photoUrl, 'http://designer-1-photo-1.jpg');
      t.equal(photos[1].photoUrl, 'http://designer-1-photo-2.jpg');
      t.equal(photos[2].photoUrl, 'http://designer-1-photo-3.jpg');
    });
});
