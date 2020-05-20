import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "../../../services/require-properties";

/**
 * A grouping of users
 */
export default interface CohortUser {
  cohortId: string;
  userId: string;
}

export interface CohortUserRow {
  cohort_id: string;
  user_id: string;
}

export const dataAdapter = new DataAdapter<CohortUserRow, CohortUser>();

export function isCohortUserRow(row: object): row is CohortUserRow {
  return hasProperties(row, "cohort_id", "user_id");
}

export function isCohortUser(data: object): data is CohortUser {
  return hasProperties(data, "cohortId", "userId");
}
