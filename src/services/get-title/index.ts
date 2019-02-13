import ProductDesign = require('../../domain-objects/product-design');
import Collection from '../../domain-objects/collection';

function normalizeTitle(title?: string | null): string {
  return title || 'Untitled';
}

export default function getTitle(
  design: ProductDesign | null, collection: Collection | null
): string {
  if (design) {
    return normalizeTitle(design.title);
  }
  if (collection) {
    return normalizeTitle(collection.title);
  }
  throw new Error('Neither a collection or design was specified!');
}
