import * as uuid from 'node-uuid';

import { sandbox, test, Test } from '../../../../test-helpers/fresh';
import * as DesignsDAO from '../../../product-designs/dao/dao';
import * as MachineService from '../../../product-designs/services/state-machine';
import { determineSubmissionStatus } from './index';
import createUser = require('../../../../test-helpers/create-user');
import createDesign from '../../../../services/create-design';
import { ProductDesignData } from '../../../product-designs/domain-objects/product-designs-new';
import * as ExpirationService from '../../../pricing-cost-inputs/services/determine-earliest-expiration';

test('determineSubmissionStatus works for a collection with no designs', async (t: Test) => {
  const collectionId = uuid.v4();
  const findDesignsStub = sandbox()
    .stub(DesignsDAO, 'findAllWithCostsAndEvents')
    .resolves([]);
  const expiryStub = sandbox()
    .stub(ExpirationService, 'determineEarliestExpiration')
    .returns(null);

  const result = await determineSubmissionStatus([collectionId]);
  t.deepEqual(
    result[collectionId],
    {
      collectionId,
      isSubmitted: false,
      isCosted: false,
      isQuoted: false,
      isPaired: false,
      pricingExpiresAt: null
    },
    'Returns false for everything if there are no designs'
  );
  t.equal(findDesignsStub.callCount, 1);
  t.equal(expiryStub.callCount, 1);
});

test('determineSubmissionStatus works for a collection with designs and no events', async (t: Test) => {
  const collectionId = uuid.v4();
  const { user: u1 } = await createUser({ withSession: false });
  const design = (await createDesign({
    productType: 'TEESHIRT',
    title: 'My cool tee',
    userId: u1.id
  })) as ProductDesignData;

  const findDesignsStub = sandbox()
    .stub(DesignsDAO, 'findAllWithCostsAndEvents')
    .resolves([{ ...design, events: [], costInputs: [], collectionId }]);
  const expiryStub = sandbox()
    .stub(ExpirationService, 'determineEarliestExpiration')
    .returns(null);

  const result = await determineSubmissionStatus([collectionId]);
  t.deepEqual(
    result[collectionId],
    {
      collectionId,
      isSubmitted: false,
      isCosted: false,
      isQuoted: false,
      isPaired: false,
      pricingExpiresAt: null
    },
    'Returns false for everything if there are designs that have not been submitted'
  );
  t.equal(findDesignsStub.callCount, 1);
  t.equal(expiryStub.callCount, 1);
});

test('determineSubmissionStatus works for a collection with designs that have been marked as submitted', async (t: Test) => {
  const collectionId = uuid.v4();

  const findDesignsStub = sandbox()
    .stub(DesignsDAO, 'findAllWithCostsAndEvents')
    .resolves([
      { id: 1, costInputs: [], collectionId },
      { id: 2, costInputs: [], collectionId }
    ]);
  const determineStateStub = sandbox()
    .stub(MachineService, 'determineState')
    .callsFake(() => MachineService.DesignState.SUBMITTED);
  const expiryStub = sandbox()
    .stub(ExpirationService, 'determineEarliestExpiration')
    .returns(null);

  const result = await determineSubmissionStatus([collectionId]);
  t.deepEqual(
    result[collectionId],
    {
      collectionId,
      isSubmitted: true,
      isCosted: false,
      isQuoted: false,
      isPaired: false,
      pricingExpiresAt: null
    },
    'Returns true if all designs have been marked as at least submitted'
  );
  t.equal(findDesignsStub.callCount, 1);
  t.equal(determineStateStub.callCount, 2);
  t.equal(expiryStub.callCount, 1);
});

test('determineSubmissionStatus works for a collection with designs that are partially submitted', async (t: Test) => {
  const collectionId = uuid.v4();

  const findDesignsStub = sandbox()
    .stub(DesignsDAO, 'findAllWithCostsAndEvents')
    .resolves([
      { id: 1, costInputs: [], collectionId },
      { id: 2, costInputs: [], collectionId },
      { id: 3, costInputs: [], collectionId }
    ]);
  const determineStateStub = sandbox()
    .stub(MachineService, 'determineState')
    .callsFake((design: any) => {
      if (design.id === 3) {
        return MachineService.DesignState.INITIAL;
      }

      return MachineService.DesignState.CHECKED_OUT;
    });
  const expiryStub = sandbox()
    .stub(ExpirationService, 'determineEarliestExpiration')
    .returns(null);

  const result = await determineSubmissionStatus([collectionId]);
  t.deepEqual(
    result[collectionId],
    {
      collectionId,
      isSubmitted: false,
      isCosted: false,
      isQuoted: false,
      isPaired: false,
      pricingExpiresAt: null
    },
    'Returns false for everything if there are any designs that have not been submitted'
  );
  t.equal(findDesignsStub.callCount, 1);
  t.equal(determineStateStub.callCount, 3);
  t.equal(expiryStub.callCount, 1);
});

test('determineSubmissionStatus works for a collection with designs that are partially paired', async (t: Test) => {
  const collectionId = uuid.v4();

  const findDesignsStub = sandbox()
    .stub(DesignsDAO, 'findAllWithCostsAndEvents')
    .resolves([
      { id: 1, costInputs: [], collectionId },
      { id: 2, costInputs: [], collectionId },
      { id: 3, costInputs: [], collectionId }
    ]);
  const determineStateStub = sandbox()
    .stub(MachineService, 'determineState')
    .callsFake((design: any) => {
      if (design.id === 1) {
        return MachineService.DesignState.PAIRED;
      }

      return MachineService.DesignState.CHECKED_OUT;
    });
  const expiryStub = sandbox()
    .stub(ExpirationService, 'determineEarliestExpiration')
    .returns(new Date('2019-04-20'));

  const result = await determineSubmissionStatus([collectionId]);
  t.deepEqual(
    result[collectionId],
    {
      collectionId,
      isSubmitted: true,
      isCosted: true,
      isQuoted: true,
      isPaired: false,
      pricingExpiresAt: new Date('2019-04-20')
    },
    'Returns true for everything except for pairing if all designs have gone up to checked out.s'
  );
  t.equal(findDesignsStub.callCount, 1);
  t.equal(determineStateStub.callCount, 3);
  t.equal(expiryStub.callCount, 1);
});
