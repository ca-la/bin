import sinon from 'sinon';
import { test, Test } from '../../test-helpers/simple';
import ProductDesignsDAO = require('../../components/product-designs/dao');
import * as DesignEventsDAO from '../../dao/design-events';
import isEveryDesignPaired from './index';

let findEventsStub: sinon.SinonStub;

function beforeEach(): void {
  sinon
    .stub(ProductDesignsDAO, 'findByCollectionId')
    .resolves([{ id: 'one' }, { id: 'two' }]);
  findEventsStub = sinon.stub(DesignEventsDAO, 'findByDesignId');
}

test('isEveryDesignPaired when all are paired', async (t: Test) => {
  beforeEach();

  findEventsStub
    .onCall(0)
    .resolves([{ type: 'ACCEPT_SERVICE_BID' }])
    .onCall(1)
    .resolves([{ type: 'ACCEPT_SERVICE_BID' }]);

  t.true(await isEveryDesignPaired('collection-one'));

  sinon.restore();
});

test('isEveryDesignPaired when one is not paired', async (t: Test) => {
  beforeEach();
  findEventsStub
    .onCall(0)
    .resolves([{ type: 'ACCEPT_SERVICE_BID' }])
    .onCall(1)
    .resolves([]);

  t.false(await isEveryDesignPaired('collection-one'));

  sinon.restore();
});

test('isEveryDesignPaired when all are not paired', async (t: Test) => {
  beforeEach();
  findEventsStub
    .onCall(0)
    .resolves([])
    .onCall(1)
    .resolves([]);

  t.false(await isEveryDesignPaired('collection-one'));

  sinon.restore();
});
