'use strict';

const fs = require('fs');
const multer = require('koa-multer');
const Router = require('koa-router');
const probeSize = require('probe-image-size');

const ProductDesignImagesDAO = require('../../dao/product-design-images');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../domain-objects/user');
const { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } = require('../../config');
const { getDownloadUrl, uploadFile } = require('../../services/aws');

const router = new Router();

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml'
];

const HUMAN_READABLE_NAMES = ALLOWED_MIMETYPES.map((type) => {
  const afterSlash = type.split('/')[1];
  const ext = afterSlash.split('+')[0];
  return ext;
}).join(', ');

function* createImage() {
  const data = this.req.files.image;
  this.assert(data, 400, 'Image must be uploaded as `image`');

  const isAllowed = ALLOWED_MIMETYPES.indexOf(data.mimetype) > -1;
  this.assert(isAllowed, 400, `We don't support "${data.mimetype}" files yet. Please choose a file with one of these formats: ${HUMAN_READABLE_NAMES}`);

  const localPath = data.path;

  const {
    title,
    description
  } = this.req.body;

  const localStream = fs.createReadStream(localPath);
  const size = yield probeSize(localStream);

  const { width, height } = size;

  localStream.destroy();

  // This is bad and inefficient; the entire request body has to be loaded into
  // memory before sending to S3. TODO figure out streaming, offload this to
  // Lambda or something, or let clients upload direct to S3.
  const image = yield ProductDesignImagesDAO.create({
    description,
    originalHeightPx: height,
    originalWidthPx: width,
    mimeType: data.mimetype,
    title,
    userId: this.state.userId
  });

  yield uploadFile(
    AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
    image.id,
    localPath,
    data.mimetype,
    'public-read'
  );

  this.status = 201;
  this.body = image;
}

function* create() {
  const {
    title,
    description,
    originalHeightPx,
    originalWidthPx,
    mimeType
  } = this.request.body;

  const image = yield ProductDesignImagesDAO.create({
    id: this.params.imageId,
    title,
    description,
    originalHeightPx,
    originalWidthPx,
    mimeType,
    userId: this.state.userId
  });

  this.status = 201;
  this.body = image;
}

function* getList() {
  const isAuthorized = (
    this.query.userId === this.state.userId ||
    this.state.role === User.ROLES.admin
  );

  this.assert(isAuthorized, 403);
  this.assert(this.query.userId, 400, 'User ID must be provided');

  const images = yield ProductDesignImagesDAO.findByUserId(this.query.userId);

  this.body = images;
  this.status = 200;
}

function* getById() {
  const image = yield ProductDesignImagesDAO.findById(this.params.imageId);
  this.assert(image, 404);

  this.body = image;
  this.status = 200;
}

function* downloadById() {
  const image = yield ProductDesignImagesDAO.findById(this.params.imageId);
  this.assert(image, 404);

  const url = yield getDownloadUrl(
    AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
    image.id
  );

  this.redirect(url, 302);
}

function* deleteById() {
  const image = yield ProductDesignImagesDAO.findById(this.params.imageId);
  this.assert(image, 404);

  const isAuthorized = (
    (image.userId && (image.userId === this.state.userId)) ||
    this.state.role === User.ROLES.admin
  );

  this.assert(isAuthorized, 403);

  yield ProductDesignImagesDAO.deleteById(this.params.imageId);
  this.body = null;
  this.status = 200;
}

router.post('/', requireAuth, multer(), createImage);
router.put('/:imageId', requireAuth, create);
router.get('/', requireAuth, getList);
router.get('/:imageId', requireAuth, getById);
router.get('/:imageId/download', downloadById);
router.del('/:imageId', requireAuth, deleteById);

module.exports = router.routes();
