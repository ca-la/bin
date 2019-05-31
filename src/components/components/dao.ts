import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { pick } from 'lodash';

import * as db from '../../services/db';
import Component, {
  ComponentRow,
  dataAdapter,
  isComponentRow
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'components';

const INSERTABLE_PROPERTIES = [
  'id',
  'parent_id',
  'created_at',
  'created_by',
  'deleted_at',
  'type',
  'material_id',
  'artwork_id',
  'sketch_id'
];

export async function create(
  data: MaybeUnsaved<Component>,
  trx?: Knex.Transaction
): Promise<Component> {
  const rowData = pick(
    dataAdapter.forInsertion({
      id: uuid.v4(),
      ...data,
      deletedAt: null
    }),
    INSERTABLE_PROPERTIES
  );

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ComponentRow[]) => first<ComponentRow>(rows));

  if (!created) {
    throw new Error('Failed to create rows');
  }

  return validate<ComponentRow, Component>(
    TABLE_NAME,
    isComponentRow,
    dataAdapter,
    created
  );
}

export async function update(
  id: string,
  data: Unsaved<Component>
): Promise<Component> {
  const rowData = pick(
    dataAdapter.forInsertion({
      ...data,
      deletedAt: null,
      id
    }),
    INSERTABLE_PROPERTIES
  );
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: ComponentRow[]) => first<ComponentRow>(rows));

  if (!updated) {
    throw new Error('Failed to update rows');
  }

  return validate<ComponentRow, Component>(
    TABLE_NAME,
    isComponentRow,
    dataAdapter,
    updated
  );
}

export async function del(id: string): Promise<Component> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: ComponentRow[]) => first<ComponentRow>(rows));

  if (!deleted) {
    throw new Error('Failed to delete rows');
  }

  return validate<ComponentRow, Component>(
    TABLE_NAME,
    isComponentRow,
    dataAdapter,
    deleted
  );
}

export async function findById(id: string): Promise<Component | null> {
  const component = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then((rows: ComponentRow[]) => first<ComponentRow>(rows));

  if (!component) {
    return null;
  }

  return validate<ComponentRow, Component>(
    TABLE_NAME,
    isComponentRow,
    dataAdapter,
    component
  );
}

export async function findAllByCanvasId(id: string): Promise<Component[]> {
  const components: ComponentRow[] = await db(TABLE_NAME)
    .select('components.*')
    .from(TABLE_NAME)
    .innerJoin(
      'product_design_canvases',
      'components.id',
      'product_design_canvases.component_id'
    )
    .where({ 'product_design_canvases.id': id, 'components.deleted_at': null });

  return validateEvery<ComponentRow, Component>(
    TABLE_NAME,
    isComponentRow,
    dataAdapter,
    components
  );
}

/*
 * Returns the root component for the given component.
 */
export async function findRoot(id: string): Promise<Component> {
  const rootComponent = await db
    .raw(
      `
WITH RECURSIVE parent_components AS (
	SELECT *
  FROM components
  WHERE id = ?
  UNION ALL
  	SELECT c.*
  	FROM components c
  	INNER JOIN parent_components p ON p.parent_id = c.id
) SELECT * FROM parent_components WHERE parent_id is null;
`,
      [id]
    )
    .then((rawResult: any): ComponentRow[] => rawResult.rows)
    .then((rows: ComponentRow[]) => first<ComponentRow>(rows));

  if (!rootComponent) {
    throw new Error(`Cannot find root component for component ${id}`);
  }

  return validate<ComponentRow, Component>(
    TABLE_NAME,
    isComponentRow,
    dataAdapter,
    rootComponent
  );
}
