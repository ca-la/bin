'use strict';

const createUser = require('../../test-helpers/create-user');
const Scan = require('../../domain-objects/scan');
const ScanPhoto = require('../../domain-objects/scan-photo');
const ScanPhotosDAO = require('../../dao/scan-photos');
const ScansDAO = require('../../dao/scans');
const { put, authHeader } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

test('PUT /scan-photos/:photoId updates a photo', t => {
  const sb = sandbox();

  let scan;
  let photo;

  return createUser()
    .then(({ session }) => {
      scan = new Scan({
        user_id: session.userId,
        id: 'scan-123'
      });

      photo = new ScanPhoto({
        id: 'photo-123',
        scan_id: 'scan-123'
      });

      sb.stub(ScansDAO, 'findById').returns(Promise.resolve(scan));
      sb.stub(ScanPhotosDAO, 'findById').returns(Promise.resolve(photo));
      sb.stub(ScanPhotosDAO, 'updateOneById').returns(Promise.resolve(photo));

      return put('/scan-photos/photo-123', {
        body: {
          calibrationData: { a: 1 },
          controlPoints: { fooz: { x: 1, y: 2 } }
        },
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);

      t.equal(body.url.includes('/scan-photos/photo-123/raw'), true);

      t.equal(ScanPhotosDAO.findById.args[0][0], 'photo-123');
      t.equal(ScansDAO.findById.args[0][0], 'scan-123');
      t.deepEqual(ScanPhotosDAO.updateOneById.args[0], [
        'photo-123',
        {
          calibrationData: { a: 1 },
          controlPoints: { fooz: { x: 1, y: 2 } }
        }
      ]);
    });
});
