'use strict';

const ProductVideosDAO = require('./index');
const { test } = require('../../test-helpers/fresh');

test('ProductVideosDAO.create creates a new video', (t) => {
  return ProductVideosDAO.create({
    productId: '123123',
    videoUrl: 'https://example.com/video.mp4',
    posterImageUrl: 'https://example.com/poster.jpg'
  })
    .then((video) => {
      t.equal(video.productId, '123123');
      t.equal(video.videoUrl, 'https://example.com/video.mp4');
      t.equal(video.posterImageUrl, 'https://example.com/poster.jpg');
    });
});

test('ProductVideosDAO.findByProductIds returns videos given a set of ids', (t) => {
  return Promise.all([
    ProductVideosDAO.create({
      productId: '1',
      videoUrl: 'https://example.com/product1-video1.mp4',
      posterImageUrl: 'https://example.com/poster.jpg'
    }),
    ProductVideosDAO.create({
      productId: '2',
      videoUrl: 'https://example.com/product2-video1.mp4',
      posterImageUrl: 'https://example.com/poster.jpg'
    }),
    ProductVideosDAO.create({
      productId: '1',
      videoUrl: 'https://example.com/product1-video2.mp4',
      posterImageUrl: 'https://example.com/poster.jpg'
    }),
    ProductVideosDAO.create({
      productId: '3',
      videoUrl: 'https://example.com/product3-video1.mp4',
      posterImageUrl: 'https://example.com/poster.jpg'
    })
  ])
    .then(() => {
      return ProductVideosDAO.findByProductIds(['1', '3']);
    })
    .then((videos) => {
      t.equal(videos.length, 3);
      t.equal(videos[0].videoUrl, 'https://example.com/product1-video1.mp4');
      t.equal(videos[1].videoUrl, 'https://example.com/product1-video2.mp4');
      t.equal(videos[2].videoUrl, 'https://example.com/product3-video1.mp4');
    });
});

