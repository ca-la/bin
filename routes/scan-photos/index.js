'use strict';

const Router = require('koa-router');

const getScanPhotoUrl = require('../../services/get-scan-photo-url');
const requireAuth = require('../../middleware/require-auth');
const ScanPhotosDAO = require('../../dao/scan-photos');
const ScansDAO = require('../../dao/scans');
const User = require('../../domain-objects/user');
const { AWS_SCANPHOTO_BUCKET_NAME } = require('../../services/config');
const { getFile } = require('../../services/aws');

const router = new Router();

function* getRawPhoto() {
  const photo = yield ScanPhotosDAO.findById(this.params.photoId);

  this.assert(photo, 404, 'Photo not found');

  const scan = yield ScansDAO.findById(photo.scanId);

  this.assert(
    (
      scan.userId === this.state.userId ||
      this.state.role === User.ROLES.admin
    ),
    403
  );

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

  this.assert(
    (
      scan.userId === this.state.userId ||
      this.state.role === User.ROLES.admin
    ),
    403
  );

  const { calibrationData, controlPoints } = this.request.body;

  const updated = yield ScanPhotosDAO.updateOneById(
    this.params.photoId,
    { calibrationData, controlPoints }
  );

  updated.setUrl(getScanPhotoUrl(this, updated.id));

  this.status = 200;
  this.body = updated;
}

router.get('/:photoId/raw', requireAuth, getRawPhoto);
router.put('/:photoId', requireAuth, updatePhoto);

module.exports = router.routes();
