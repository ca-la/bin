import { pick } from 'lodash';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import addCollaborator from './index';
import generateCollection from '../../test-helpers/factories/collection';
import * as ApprovalService from '../../components/approved-signups/services/find-or-create';
import * as NotificationsService from '../../services/create-notifications';

test('addCollaborator can add a collaborator', async (t: Test) => {
  const approvalStub = sandbox().stub(ApprovalService, 'default').resolves();
  const notificationsStub = sandbox().stub(
    NotificationsService,
    'immediatelySendInviteCollaborator'
  ).resolves();

  const { collection, createdBy } = await generateCollection();
  const collaborator = await addCollaborator({
    collectionId: collection.id,
    designId: null,
    email: 'foo@example.com',
    inviterUserId: createdBy.id,
    role: 'EDIT'
  });

  t.equal(approvalStub.callCount, 1, 'Calls the approval creation service');
  t.true(approvalStub.calledWith({
    consumedAt: null,
    email: 'foo@example.com',
    firstName: null,
    isManuallyApproved: false,
    lastName: null
  }), 'Calls with the expected arguments');
  t.equal(notificationsStub.callCount, 1, 'Calls the notifications service');
  const partialCollaborator = pick(
    collaborator,
    ['userEmail', 'role']
  );
  t.deepEqual(
    partialCollaborator,
    {
      role: 'EDIT',
      userEmail: 'foo@example.com'
    },
    'Creates a collaborator'
  );
});
