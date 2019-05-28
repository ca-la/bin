'use strict';

const Router = require('koa-router');
const multer = require('koa-multer');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const filterError = require('../../services/filter-error');
const FitPartnerScanService = require('../../services/fit-partner-scan');
const getScanPhotoUrl = require('../../services/get-scan-photo-url');
const InvalidDataError = require('../../errors/invalid-data');
const requireAuth = require('../../middleware/require-auth');
const ScanPhotosDAO = require('../../dao/scan-photos');
const ScansDAO = require('../../dao/scans');
const User = require('../../components/users/domain-object');
const UserAttributesService = require('../../services/user-attributes');
const validateMeasurements = require('../../services/validate-measurements');
const { AWS_SCANPHOTO_BUCKET_NAME } = require('../../config');
const { canAccessScanInParam } = require('../../middleware/can-access-scan');
const { logServerError } = require('../../services/logger');
const { uploadFile, deleteFile } = require('../../services/aws');

const router = new Router();

function* createScan() {
  const { type, isComplete } = this.request.body;

  const scan = yield ScansDAO.create({
    type,
    userId: this.state.userId,
    isComplete
  }).catch(filterError(InvalidDataError, err => this.throw(400, err)));

  if (this.state.userId && isComplete) {
    try {
      yield UserAttributesService.recordScan(this.state.userId);
    } catch (err) {
      logServerError(
        'Could not save scan status in Mailchimp for user',
        this.state.userId
      );
      logServerError(err);
    }
  }

  this.status = 201;
  this.body = scan;
}

function* deleteScan() {
  yield ScansDAO.deleteById(this.params.scanId);
  const deletedPhotos = yield ScanPhotosDAO.deleteByScanId(this.params.scanId);

  yield Promise.all(
    deletedPhotos.map(photo => {
      return deleteFile(AWS_SCANPHOTO_BUCKET_NAME, `${photo.id}.jpg`);
    })
  );

  this.body = { success: true };
  this.status = 200;
}

function* createScanPhoto() {
  const data = this.req.files.image;
  this.assert(data, 400, 'Image must be uploaded as `image`');
  this.assert(
    data.mimetype === 'image/jpeg',
    400,
    'Only photos can be uploaded'
  );

  const localPath = data.path;

  // This is bad and inefficient; the entire request body has to be loaded into
  // memory before sending to S3. TODO figure out streaming, offload this to
  // Lambda or something, or let clients upload direct to S3.
  const photo = yield ScanPhotosDAO.create({
    scanId: this.params.scanId
  });

  const fileName = `${photo.id}.jpg`;
  yield uploadFile(
    AWS_SCANPHOTO_BUCKET_NAME,
    fileName,
    localPath,
    data.mimetype,
    'authenticated-read'
  );

  photo.setUrl(getScanPhotoUrl(this, photo.id));

  this.status = 201;
  this.body = photo;
}

function* updateScan() {
  this.assert(this.request.body, 400, 'New data must be provided');

  const { isComplete, isStarted, measurements } = this.request.body;

  validateMeasurements(measurements);

  if (this.state.userId && isComplete) {
    try {
      yield UserAttributesService.recordScan(this.state.userId);
    } catch (err) {
      logServerError(
        'Could not save scan status in Mailchimp for user',
        this.state.userId
      );
      logServerError(err);
    }
  }

  const updated = yield ScansDAO.updateOneById(this.params.scanId, {
    isComplete,
    isStarted,
    measurements
  });

  // Scan is owned by a 3rd party CALA fit customer, potentially update details
  // in their Shopify site
  if (updated.fitPartnerCustomerId) {
    if (isComplete) {
      yield FitPartnerScanService.markComplete(updated);
    }

    if (measurements && measurements.calculatedValues) {
      // This is a fire-and-forget; it's a heavy request and we're *NOT* waiting
      // for it to finish before giving a 200.
      FitPartnerScanService.saveCalculatedValues(updated);
    }
  }

  this.status = 200;
  this.body = updated;
}

/**
 * GET /scans?userId=ABC123
 */
function* getByUserId() {
  canAccessUserResource.call(this, this.query.userId);

  const scans = yield ScansDAO.findByUserId(this.query.userId);

  this.body = scans;
  this.status = 200;
}

function* getAllScans() {
  this.assert(this.state.userId, 401);

  let scans;

  if (this.state.role === User.ROLES.admin) {
    scans = yield ScansDAO.findAll({
      limit: Number(this.query.limit) || 10,
      offset: Number(this.query.offset) || 0
    });
  } else if (this.state.role === User.ROLES.fitPartner) {
    scans = yield ScansDAO.findByFitPartner(this.state.userId, {
      limit: Number(this.query.limit) || 10,
      offset: Number(this.query.offset) || 0
    });
  } else {
    this.throw(403);
  }

  this.body = scans;
  this.status = 200;
}

function* getList() {
  if (this.query.userId) {
    yield getByUserId;
  } else {
    yield getAllScans;
  }
}

/**
 * POST /scans/:scanId/claim
 *
 * If a user created an anonymous scan prior to signing up, they can use this
 * endpoint to claim it afterwards.
 */
function* claimScan() {
  this.assert(
    !this.state.scan.userId,
    400,
    'This scan has already been claimed'
  );

  const updated = yield ScansDAO.updateOneById(this.params.scanId, {
    userId: this.state.userId
  });

  try {
    yield UserAttributesService.recordScan(this.state.userId);
  } catch (err) {
    logServerError(
      'Could not save scan status in Mailchimp for user',
      this.state.userId
    );
    logServerError(err);
  }

  this.body = updated;
  this.status = 200;
}

/**
 * GET /scans/:scanId/photos
 */
function* getScanPhotos() {
  const photos = yield ScanPhotosDAO.findByScanId(this.params.scanId);

  photos.forEach(photo => photo.setUrl(getScanPhotoUrl(this, photo.id)));

  this.body = photos;
  this.status = 200;
}

// eslint-disable-next-line require-yield
function* getScan() {
  this.body = this.state.scan;
  this.status = 200;
}

router.del('/:scanId', canAccessScanInParam, deleteScan);
router.get('/', requireAuth, getList);
router.get('/:scanId', canAccessScanInParam, getScan);
router.get('/:scanId/photos', canAccessScanInParam, getScanPhotos);
router.patch('/:scanId', canAccessScanInParam, updateScan);
router.post('/', createScan);
router.post('/:scanId/claim', canAccessScanInParam, claimScan);
router.post('/:scanId/photos', canAccessScanInParam, multer(), createScanPhoto);
router.put('/:scanId', canAccessScanInParam, updateScan); // TODO: deprecate

module.exports = router.routes();
