import * as uuid from 'node-uuid';

import ProductDesign = require('../../components/product-designs/domain-objects/product-design');

/**
 * Creates an in-memory instance of a ProductDesign.
 */
export function staticProductDesign(
  options?: Partial<ProductDesign>
): ProductDesign {
  return {
    id: uuid.v4(),
    createdAt: new Date('2019-04-20'),
    productType: 'SHIRT',
    title: 'My Shirt',
    userId: 'user-one',
    ...options
  };
}
