'use strict';

const Router = require('koa-router');
const multer = require('koa-multer');

const attachRole = require('../../middleware/attach-role');
const InvalidDataError = require('../../errors/invalid-data');
const requireAuth = require('../../middleware/require-auth');
const ScanPhotosDAO = require('../../dao/scan-photos');
const ScansDAO = require('../../dao/scans');
const User = require('../../domain-objects/user');
const validateMeasurements = require('../../services/validate-measurements');
const { AWS_SCANPHOTO_BUCKET_NAME } = require('../../services/config');
const { uploadFile, deleteFile } = require('../../services/aws');

const router = new Router();

function* createScan() {
  const { type, isComplete } = this.request.body;

  const scan = yield ScansDAO.create({
    type,
    userId: this.state.userId,
    isComplete
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = scan;
}

function* deleteScan() {
  const scan = yield ScansDAO.findById(this.params.scanId);

  this.assert(scan, 404, 'Scan not found');

  this.assert(
    scan.userId && scan.userId === this.state.userId,
    403,
    'You can only delete a scan that you own'
  );

  yield ScansDAO.deleteById(this.params.scanId);
  const deletedPhotos = yield ScanPhotosDAO.deleteByScanId(this.params.scanId);

  yield Promise.all(deletedPhotos.map((photo) => {
    return deleteFile(AWS_SCANPHOTO_BUCKET_NAME, `${photo.id}.jpg`);
  }));

  this.body = { success: true };
  this.status = 200;
}

function* createScanPhoto() {
  const scan = yield ScansDAO.findById(this.params.scanId);
  this.assert(scan, 404, 'Scan not found');

  if (scan.userId) {
    this.assert(scan.userId === this.state.userId, 403, 'You can only upload photos for your own scan');
  }

  const data = this.req.files.image;
  this.assert(data, 400, 'Image must be uploaded as `image`');
  this.assert(data.mimetype === 'image/jpeg', 400, 'Only photos can be uploaded');

  const localPath = data.path;

  // This is bad and inefficient; the entire request body has to be loaded into
  // memory before sending to S3. TODO figure out streaming, offload this to
  // Lambda or something, or let clients upload direct to S3.
  const photo = yield ScanPhotosDAO.create({
    scanId: this.params.scanId
  });

  const fileName = `${photo.id}.jpg`;
  yield uploadFile(AWS_SCANPHOTO_BUCKET_NAME, fileName, localPath);

  this.status = 201;
  this.body = photo;
}

function* updateScan() {
  const scan = yield ScansDAO.findById(this.params.scanId);
  this.assert(scan, 404, 'Scan not found');

  if (scan.userId) {
    this.assert(scan.userId === this.state.userId, 403, 'You can only upload photos for your own scan');
  }

  this.assert(this.request.body, 400, 'New data must be provided');

  const { isComplete, measurements } = this.request.body;

  validateMeasurements(measurements);

  const updated = yield ScansDAO.updateOneById(
    this.params.scanId,
    { isComplete, measurements }
  );

  this.status = 200;
  this.body = updated;
}

/**
 * GET /scans?userId=ABC123
 */
function* getList() {
  const isAuthorized = (
    this.query.userId === this.state.userId ||
    this.state.role === User.ROLES.admin
  );

  this.assert(isAuthorized, 403, 'You can only request scans for your own user');
  this.assert(this.query.userId, 400, 'User ID must be provided');

  const scans = yield ScansDAO.findByUserId(this.query.userId);

  this.body = scans;
  this.status = 200;
}

/**
 * POST /scans/:scanId/claim
 *
 * If a user created an anonymous scan prior to signing up, they can use this
 * endpoint to claim it afterwards.
 */
function* claimScan() {
  const scan = yield ScansDAO.findById(this.params.scanId);
  this.assert(scan, 404, 'Scan not found');

  this.assert(!scan.userId, 400, 'This scan has already been claimed');

  const updated = yield ScansDAO.updateOneById(this.params.scanId, {
    userId: this.state.userId
  });

  this.body = updated;
  this.status = 200;
}

/**
 * GET /scans/:scanId/photos
 */
function* getScanPhotos() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const photos = yield ScanPhotosDAO.findByScanId(this.params.scanId);

  this.body = photos;
  this.status = 200;
}

function* getScan() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const scan = yield ScansDAO.findById(this.params.scanId);
  this.assert(scan, 404, 'Scan not found');

  this.body = scan;
  this.status = 200;
}

router.del('/:scanId', requireAuth, deleteScan);
router.get('/', requireAuth, attachRole, getList);
router.get('/:scanId', requireAuth, attachRole, getScan);
router.get('/:scanId/photos', requireAuth, attachRole, getScanPhotos);
router.post('/', createScan);
router.post('/:scanId/claim', requireAuth, claimScan);
router.post('/:scanId/photos', multer(), createScanPhoto);
router.put('/:scanId', updateScan);

module.exports = router.routes();
