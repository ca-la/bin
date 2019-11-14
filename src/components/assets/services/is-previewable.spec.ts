import tape from 'tape';

import { test } from '../../../test-helpers/fresh';
import { isPreviewable } from './is-previewable';

test('isPreviewable can determine if a mimeType is previewable', async (t: tape.Test) => {
  t.true(isPreviewable('image/png'));
  t.true(isPreviewable('image/jpeg'));

  t.true(isPreviewable('image/heic'));
  t.true(isPreviewable('image/vnd.adobe.photoshop'));
  t.true(isPreviewable('application/x-photoshop'));
  t.true(isPreviewable('application/pdf'));
  t.true(isPreviewable('application/postscript'));

  t.false(isPreviewable('text/csv'));
  t.false(
    isPreviewable(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  );
});
