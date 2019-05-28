import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import ComponentRelationship, {
  ComponentRelationshipRow,
  dataAdapter,
  isComponentRelationshipRow
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'component_relationships';

export async function create(
  data: MaybeUnsaved<ComponentRelationship>
): Promise<ComponentRelationship> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: ComponentRelationshipRow[]) =>
      first<ComponentRelationshipRow>(rows)
    );

  if (!created) {
    throw new Error('Failed to create a component relationship!');
  }

  return validate<ComponentRelationshipRow, ComponentRelationship>(
    TABLE_NAME,
    isComponentRelationshipRow,
    dataAdapter,
    created
  );
}

export async function update(
  id: string,
  data: MaybeUnsaved<ComponentRelationship>
): Promise<ComponentRelationship> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id
  });
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: ComponentRelationshipRow[]) =>
      first<ComponentRelationshipRow>(rows)
    );

  if (!updated) {
    throw new Error(`Failed to update component relationship ${id}!`);
  }

  return validate<ComponentRelationshipRow, ComponentRelationship>(
    TABLE_NAME,
    isComponentRelationshipRow,
    dataAdapter,
    updated
  );
}

export async function del(id: string): Promise<number> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() });

  if (deleted !== 1) {
    throw new Error(`Failed to delete ComponentRelationship ${id}!`);
  }

  return deleted;
}

/**
 * Returns all relationships where the given id is either the source or target.
 */
export async function findAllByComponent(
  componentId: string
): Promise<ComponentRelationship[]> {
  const relationships = await db(TABLE_NAME)
    .where(
      (builder: Knex.QueryBuilder): void => {
        builder
          .where({ source_component_id: componentId })
          .orWhere({ target_component_id: componentId });
      }
    )
    .andWhere({ deleted_at: null })
    .orderBy('created_at', 'asc');

  return validateEvery<ComponentRelationshipRow, ComponentRelationship>(
    TABLE_NAME,
    isComponentRelationshipRow,
    dataAdapter,
    relationships
  );
}

export async function findById(
  id: string
): Promise<ComponentRelationship | null> {
  const componentRelationship = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then((rows: ComponentRelationshipRow[]) =>
      first<ComponentRelationshipRow>(rows)
    );

  if (!componentRelationship) {
    return null;
  }

  return validate<ComponentRelationshipRow, ComponentRelationship>(
    TABLE_NAME,
    isComponentRelationshipRow,
    dataAdapter,
    componentRelationship
  );
}
