import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

/**
 * A grouping of users
 */
export default interface Cohort {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  createdAt: Date;
  createdBy: string;
}

export interface CohortRow {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  created_at: string;
  created_by: string;
}

function decode(row: CohortRow): Cohort {
  return {
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    description: row.description,
    id: row.id,
    slug: row.slug,
    title: row.title
  };
}

function encode(data: Cohort): CohortRow {
  return {
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    description: data.description,
    id: data.id,
    slug: data.slug,
    title: data.title
  };
}

function forInsertion(data: Uninserted<Cohort>): Uninserted<CohortRow> {
  return {
    created_by: data.createdBy,
    description: data.description,
    id: data.id,
    slug: data.slug,
    title: data.title
  };
}

export const dataAdapter = new DataAdapter<CohortRow, Cohort>(
  decode,
  encode,
  forInsertion
);

export function isCohortRow(row: object): row is CohortRow {
  return hasProperties(
    row,
    'id',
    'slug',
    'title',
    'description',
    'created_at',
    'created_by'
  );
}

export function isCohort(data: object): data is Cohort {
  return hasProperties(
    data,
    'id',
    'slug',
    'title',
    'description',
    'createdAt',
    'createdBy'
  );
}
