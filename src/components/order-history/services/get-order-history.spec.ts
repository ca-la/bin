import * as uuid from 'node-uuid';

import { sandbox, test, Test } from '../../../test-helpers/fresh';
import { getOrderHistory } from './get-order-history';
import createUser = require('../../../test-helpers/create-user');
import * as HistoryDAO from '../dao';
import * as PaymentsDAO from '../../invoice-payments/dao';
import { OrderHistory } from '../domain-object';
import * as AssetLinksService from '../../../services/attach-asset-links';
import { FINANCING_MARGIN } from '../../../config';
import addMargin from '../../../services/add-margin';

test('getOrderHistory returns a list', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const orderHistory1: OrderHistory = {
    lineItemId: uuid.v4(),
    invoiceId: uuid.v4(),
    designId: uuid.v4(),
    designTitle: 'Plain White Tee',
    designCollections: [
      {
        id: uuid.v4(),
        title: 'Collection1'
      }
    ],
    designImageIds: [uuid.v4()],
    createdAt: new Date('2019-04-20'),
    totalCostCents: 1000,
    units: 100,
    baseUnitCostCents: 10
  };
  const getHistoryStub = sandbox()
    .stub(HistoryDAO, 'getOrderHistoryByUserId')
    .resolves([orderHistory1]);
  const getPaymentsStub = sandbox()
    .stub(PaymentsDAO, 'findByInvoiceId')
    .resolves([]);
  const getLinksStub = sandbox()
    .stub(AssetLinksService, 'generatePreviewLinks')
    .returns([]);

  const result = await getOrderHistory({ userId: user.id });

  t.deepEqual(
    result,
    [
      {
        ...orderHistory1,
        firstPaidAt: null,
        imageLinks: [],
        isCreditApplied: false,
        isPayLater: true,
        unitCostCents: addMargin(10, FINANCING_MARGIN)
      }
    ],
    'Returns a list of order histories'
  );

  t.equal(getHistoryStub.callCount, 1);
  t.equal(getPaymentsStub.callCount, 1);
  t.equal(getLinksStub.callCount, 1);
});
