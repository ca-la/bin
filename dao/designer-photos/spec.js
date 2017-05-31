'use strict';

const DesignerPhotosDAO = require('./index');
const DesignersDAO = require('../designers');
const { test } = require('../../test-helpers/fresh');

test('DesignerPhotosDAO.create creates designer photos', (t) => {
  let designerId;
  return DesignersDAO.create({
    name: 'J Designer',
    twitterHandle: 'desiigner',
    instagramHandle: 'desiigner',
    position: 1,
    bioHtml: '<h1>the real deal</h1>'
  })
    .then((designer) => {
      designerId = designer.id;

      return DesignerPhotosDAO.create({
        photoUrl: 'http://example.com/img.jpg',
        designerId,
        position: 1
      });
    })
    .then((designerPhoto) => {
      t.equal(designerPhoto.position, 1);
      t.equal(designerPhoto.photoUrl, 'http://example.com/img.jpg');
      t.equal(designerPhoto.designerId, designerId);
    });
});
