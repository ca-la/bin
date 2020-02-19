import { test, Test } from '../../test-helpers/fresh';
import { getExtension } from './index';

test('getExtension will return an extension for a supported mimeType', async (t: Test) => {
  t.equal(getExtension('image/png'), 'png');
  t.equal(getExtension('image/jpeg'), 'jpeg');

  t.equal(getExtension('image/heic'), 'heic');
  t.equal(getExtension('image/vnd.adobe.photoshop'), 'psd');
  t.equal(getExtension('application/x-photoshop'), 'psd');
  t.equal(getExtension('application/pdf'), 'pdf');

  t.equal(getExtension('text/csv'), 'csv');
  t.equal(getExtension('fooooo/bar'), null);
});
