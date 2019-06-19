import * as tape from 'tape';

import { test } from '../../../test-helpers/fresh';
import {
  deserializeAsset,
  deserializePartialAsset,
  isSerializedAsset
} from './serializer';
import Asset from '../domain-object';

test('isSerializedAsset can determine if an object is an asset', async (t: tape.Test) => {
  t.false(
    isSerializedAsset({
      foo: 'bar'
    })
  );
  const payload: Asset = {
    createdAt: new Date(),
    deletedAt: null,
    description: null,
    id: 'abc-123',
    mimeType: 'image/jpeg',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: null,
    uploadCompletedAt: null,
    userId: null
  };
  const serialized = JSON.parse(JSON.stringify(payload));
  t.true(isSerializedAsset(serialized));
});

test('deserializeAsset can deserialize an object', async (t: tape.Test) => {
  const payload: Asset = {
    createdAt: new Date(),
    deletedAt: null,
    description: null,
    id: 'abc-123',
    mimeType: 'image/jpeg',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: null,
    uploadCompletedAt: null,
    userId: null
  };
  const serialized = JSON.parse(JSON.stringify(payload));
  t.deepEqual(deserializeAsset(serialized), payload);
});

test('deserializePartialAsset can deserialize a partial object', async (t: tape.Test) => {
  const payload = {
    createdAt: new Date('2019-04-20'),
    deletedAt: new Date('2019-04-24'),
    uploadCompletedAt: new Date('2019-04-22')
  };
  const serialized = JSON.parse(JSON.stringify(payload));
  t.deepEqual(deserializePartialAsset(serialized), payload);
});
