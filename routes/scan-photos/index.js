'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const getScanPhotoUrl = require('../../services/get-scan-photo-url');
const ScanPhotosDAO = require('../../dao/scan-photos');
const ScansDAO = require('../../dao/scans');
const { AWS_SCANPHOTO_BUCKET_NAME } = require('../../config');
const { getFile } = require('../../services/aws');

const router = new Router();

function* getRawPhoto() {
  const photo = yield ScanPhotosDAO.findById(this.params.photoId);

  this.assert(photo, 404, 'Photo not found');

  const scan = yield ScansDAO.findById(photo.scanId);

  if (scan.userId) {
    canAccessUserResource.call(this, scan.userId);
  }

  const data = yield getFile(
    AWS_SCANPHOTO_BUCKET_NAME,
    `${photo.id}.jpg`
  );

  this.status = 200;
  this.set('content-type', 'image/jpeg');

  this.body = data.Body;
}

function* updatePhoto() {
  const photo = yield ScanPhotosDAO.findById(this.params.photoId);
  this.assert(photo, 404, 'Photo not found');

  const scan = yield ScansDAO.findById(photo.scanId);

  if (scan.userId) {
    canAccessUserResource.call(this, scan.userId);
  }

  const { calibrationData, controlPoints } = this.request.body;

  const updated = yield ScanPhotosDAO.updateOneById(
    this.params.photoId,
    { calibrationData, controlPoints }
  );

  updated.setUrl(getScanPhotoUrl(this, updated.id));

  this.status = 200;
  this.body = updated;
}

router.get('/:photoId/raw', getRawPhoto);
router.patch('/:photoId', updatePhoto);
router.put('/:photoId', updatePhoto); // TODO: deprecate

module.exports = router.routes();
