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

  for (const collection of collections) {
    const state = await determineSubmissionStatus(collection.id);

    if (state.isSubmitted && !state.isCosted) {
      labelledCollections.push({ ...collection, label: 'Needs Costing' });
    }
  }

  return labelledCollections;
}
