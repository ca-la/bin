import ProductDesign = require('../../domain-objects/product-design');
import Collection from '../../domain-objects/collection';
import { DetailsTask } from '../../domain-objects/task-event';

export interface LinkBase {
  design?: ProductDesign | null;
  collection?: Collection | null;
  task?: DetailsTask | null;
}

function normalizeTitle(title?: string | null): string {
  return title || 'Untitled';
}

export default function getTitle(
  linkBase: LinkBase
): string {
  const { design, collection, task } = linkBase;
  if (task) {
    return normalizeTitle(task.title);
  }

  if (design) {
    return normalizeTitle(design.title);
  }
  if (collection) {
    return normalizeTitle(collection.title);
  }
  throw new Error('Neither a collection or design was specified!');
}
