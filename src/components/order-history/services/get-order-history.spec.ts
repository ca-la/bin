import { sandbox, test, Test } from '../../../test-helpers/fresh';
import { getOrderHistory } from './get-order-history';
import createUser = require('../../../test-helpers/create-user');
import * as PaymentsDAO from '../../invoice-payments/dao';
import * as AssetLinksService from '../../../services/attach-asset-links';
import * as InvoicesDAO from '../../../dao/invoices/search';
import * as LineItemsDAO from '../../../dao/line-items';

import generateInvoice from '../../../test-helpers/factories/invoice';
import { LineItemWithMeta } from '../../../domain-objects/line-item';

test('getOrderHistory returns a list', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { invoice: invoice1 } = await generateInvoice({ userId: user.id });
  const lineItemWithMeta: LineItemWithMeta = {
    id: 'abc-123',
    createdAt: new Date('2019-04-20'),
    title: 'a line item',
    description: 'for something',
    designId: 'design-one',
    quoteId: 'quote-one',
    invoiceId: invoice1.id,
    designTitle: 'my design',
    designCollections: null,
    designImageIds: ['image-one'],
    quotedUnits: 100,
    quotedUnitCostCents: 1000
  };

  const getInvoicesStub = sandbox()
    .stub(InvoicesDAO, 'getInvoicesByUser')
    .resolves([invoice1]);
  const getLineItemsStub = sandbox()
    .stub(LineItemsDAO, 'getLineItemsWithMetaByInvoiceId')
    .resolves([lineItemWithMeta]);
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
        ...invoice1,
        amountCreditApplied: 0,
        isPayLater: true,
        lineItems: [
          {
            ...lineItemWithMeta,
            imageLinks: []
          }
        ],
        payments: [],
        totalUnits: 100
      }
    ],
    'Returns a list of order histories'
  );

  t.equal(getInvoicesStub.callCount, 1);
  t.equal(getLineItemsStub.callCount, 1);
  t.equal(getPaymentsStub.callCount, 1);
  t.equal(getLinksStub.callCount, 1);
});
