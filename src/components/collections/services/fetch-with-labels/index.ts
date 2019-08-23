import Collection from '../../domain-object';
import { findSubmittedButUnpaidCollections } from '../../dao';
import { determineSubmissionStatus } from '../determine-submission-status';

interface CollectionWithLabels extends Collection {
  label: string;
}

/**
 * Returns a list of all collections that need to be costed.
 */
export async function fetchUncostedWithLabels(): Promise<
  CollectionWithLabels[]
> {
  const collections = await findSubmittedButUnpaidCollections();
  const labelledCollections: CollectionWithLabels[] = [];
  const collectionStatuses = await determineSubmissionStatus(
    collections.map((collection: Collection): string => collection.id)
  );

  for (const collection of collections) {
    const status = collectionStatuses[collection.id];

    if (status.isSubmitted && !status.isCosted) {
      labelledCollections.push({ ...collection, label: 'Needs Costing' });
    }
  }

  return labelledCollections;
}
