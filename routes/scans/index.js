'use strict';

const router = require('koa-router')({
  prefix: '/scans'
});

const InvalidDataError = require('../../errors/invalid-data');
const requireAuth = require('../../middleware/require-auth');
const ScansDAO = require('../../dao/scans');
const ScanPhotosDAO = require('../../dao/scan-photos');
const { uploadFile } = require('../../services/aws');
const { AWS_SCANPHOTO_BUCKET_NAME } = require('../../services/config');

function* createScan() {
  const { type } = this.state.body;

  const scan = yield ScansDAO.create({
    type,
    userId: this.state.userId
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = scan;
}

function* createScanPhoto() {
  const scan = yield ScansDAO.findById(this.params.scanId);
  this.assert(scan, 404, 'Scan not found');
  this.assert(scan.userId === this.state.userId, 403, 'You can only upload photos for your own scan');

  this.assert(this.request.length < 1e8, 413, 'Image is too large');
  this.assert(this.is('image/*'), 415, 'Only images may be uploaded');

  // This is bad and inefficient; the entire request body has to be loaded into
  // memory before sending to S3. TODO figure out streaming, offload this to
  // Lambda or something, or let clients upload direct to S3.
  const photo = yield ScanPhotosDAO.create({
    scanId: this.params.scanId
  });

  const fileName = `${photo.id}.jpg`;
  yield uploadFile(AWS_SCANPHOTO_BUCKET_NAME, fileName, this.body);

  this.status = 201;
  this.body = photo;
}

/**
 * GET /scans?userId=ABC123
 */
function* getList() {
  this.assert(this.query.userId === this.state.userId, 403, 'You can only request scans for your own user');

  const scans = yield ScansDAO.findByUserId(this.query.userId);

  this.body = scans;
  this.status = 200;
}

router.post('/', requireAuth, createScan);
router.post('/:id/photos', requireAuth, createScanPhoto);
router.get('/', requireAuth, getList);

module.exports = router.routes();
