import * as tape from 'tape';

import { sandbox, test } from '../../../test-helpers/fresh';
import * as DAO from '../dao';
import { gatherChanges } from './gather-changes';

test('gatherChanges', async (t: tape.Test) => {
  const metadata = {
    canvasId: 'b-l-o-n-d-e',
    createdAt: new Date('2016-08-20'),
    createdByName: 'Frank Ocean'
  };
  const creatorStub = sandbox()
    .stub(DAO, 'getCreatorMetadata')
    .resolves(metadata);

  const changes = await gatherChanges('b-l-o-n-d-e');
  t.deepEqual(changes, [
    { statement: 'Created by Frank Ocean', timestamp: metadata.createdAt }
  ]);
  t.equal(creatorStub.callCount, 1);
});
