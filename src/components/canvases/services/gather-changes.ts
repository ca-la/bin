import { getCreatorMetadata } from "../dao";

interface ChangeLog {
  statement: string;
  timestamp: Date;
}

/**
 * Gathers the list of changes for the given resource.
 * TODO: when we build out logging for real, we'll need to create a `change_logs` table
 * that keeps track of all the new changes; possibly looking at `notifications` as inspiration
 * on how to build such a tracking system.
 */
export async function gatherChanges(canvasId: string): Promise<ChangeLog[]> {
  const changes: ChangeLog[] = [];
  const created = await getCreatorMetadata(canvasId);

  if (created) {
    changes.push({
      statement: `Created by ${created.createdByName}`,
      timestamp: created.createdAt,
    });
  }

  return changes;
}
