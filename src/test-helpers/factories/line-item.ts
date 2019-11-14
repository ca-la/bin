import uuid from 'node-uuid';

import * as LineItemsDAO from '../../dao/line-items';
import LineItem from '../../domain-objects/line-item';
import * as InvoicesDAO from '../../dao/invoices';
import generateInvoice from './invoice';
import ProductDesignsDAO from '../../components/product-designs/dao';
import createUser = require('../create-user');
import createDesign from '../../services/create-design';

interface LineItemWithResources {
  lineItem: LineItem;
}

export default async function generateLineItem(
  quoteId: string,
  options: Partial<LineItem> = {}
): Promise<LineItemWithResources> {
  const { invoice } = options.invoiceId
    ? { invoice: await InvoicesDAO.findById(options.invoiceId) }
    : await generateInvoice();
  const { user } = await createUser({ withSession: false });
  const design = options.designId
    ? await ProductDesignsDAO.findById(options.designId)
    : await createDesign({
        productType: 'SWEATER',
        title: 'Mohair Wool Sweater',
        userId: user.id
      });

  if (!design) {
    throw new Error('Expected to generate a design for a line item!');
  }

  const lineItem = await LineItemsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    title: 'A line item',
    description: 'A purchase of something',
    designId: design.id,
    quoteId,
    invoiceId: invoice.id,
    ...options
  });

  return { lineItem };
}
