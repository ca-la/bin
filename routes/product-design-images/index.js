'use strict';

const Router = require('koa-router');
const multer = require('koa-multer');

const ProductDesignImagesDAO = require('../../dao/product-design-images');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../domain-objects/user');
const { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } = require('../../config');
const { uploadFile } = require('../../services/aws');

const router = new Router();

function* createImage() {
  const data = this.req.files.image;
  this.assert(data, 400, 'Image must be uploaded as `image`');
  this.assert(data.mimetype === 'image/jpeg', 400, 'Only JPEG can be uploaded for now?');

  const localPath = data.path;

  // This is bad and inefficient; the entire request body has to be loaded into
  // memory before sending to S3. TODO figure out streaming, offload this to
  // Lambda or something, or let clients upload direct to S3.
  const image = yield ProductDesignImagesDAO.create({
    userId: this.state.userId
  });

  const fileName = `${image.id}.jpg`;
  yield uploadFile(AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME, fileName, localPath);

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

router.post('/', requireAuth, multer(), createImage);
router.get('/', requireAuth, getList);
