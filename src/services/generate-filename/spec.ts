import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/simple';

import { generateFilename } from './index';

test('generateFilename can generate filenames with extensions', async (t: tape.Test) => {
  const someId = uuid.v4();

  t.equal(
    generateFilename(someId, 'image/png'),
    `${someId}.png`,
    'Returned a png filename.'
  );
  t.equal(
    generateFilename(someId, 'image/jpeg'),
    `${someId}.jpeg`,
    'Returned a jpeg filename.'
  );
  t.equal(
    generateFilename(someId, 'image/svg+xml'),
    `${someId}.svg`,
    'Returned an svg filename.'
  );
  t.equal(
    generateFilename(someId, 'application/postscript; version="16.0"'),
    `${someId}.ai`,
    'Returned an AI filename.'
  );
  t.equal(
    generateFilename(someId, 'image/vnd.adobe.photoshop'),
    `${someId}.psd`,
    'Returned a photoshop filename.'
  );
  t.equal(
    generateFilename(someId, 'application/pdf'),
    `${someId}.pdf`,
    'Returned a pdf filename.'
  );
  t.equal(
    generateFilename(someId, 'image/heic'),
    `${someId}.heic`,
    'Returned a heic filename.'
  );
});

test('generateFilename will generate a filename if the extension fails', async (t: tape.Test) => {
  const someId = uuid.v4();

  t.equal(
    generateFilename(someId, 'bah-blah-bu-blah'),
    `${someId}`,
    'Returned filename without an extension'
  );
});
