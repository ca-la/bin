import Knex, { QueryBuilder, Transaction } from 'knex';
import { emit } from '../pubsub';
import { CalaAdapter, CalaDao, UpdateResult } from './types';
import ResourceNotFoundError from '../../errors/resource-not-found';
import { DaoUpdating, DaoUpdated } from '../pubsub/cala-events';
import first from '../first';

interface DaoOptions<ModelRow> {
  orderColumn: keyof ModelRow;
}

export function buildDao<Model, ModelRow extends object>(
  domain: string,
  tableName: string,
  adapter: CalaAdapter<Model, ModelRow>,
  { orderColumn }: DaoOptions<ModelRow>
): CalaDao<Model> {
  const find = async (
    trx: Knex.Transaction,
    filter: Partial<Model>,
    modifier?: (query: QueryBuilder) => QueryBuilder
  ): Promise<Model[]> => {
    const basicQuery = trx(tableName)
      .select('*')
      .where(adapter.toDbPartial(filter))
      .orderBy(orderColumn);

    const rows = await (modifier ? basicQuery.modify(modifier) : basicQuery);

    return adapter.fromDbArray(rows);
  };

  const findById = async (
    trx: Knex.Transaction,
    id: string
  ): Promise<Model> => {
    const row = await trx(tableName)
      .select('*')
      .where({ id })
      .first();

    return adapter.fromDb(row);
  };

  const findOne = async (
    trx: Knex.Transaction,
    filter: Partial<Model>,
    modifier?: (query: QueryBuilder) => QueryBuilder
  ): Promise<Model> => {
    const basicQuery = trx(tableName)
      .select('*')
      .where(adapter.toDbPartial(filter))
      .orderBy(orderColumn)
      .first();

    const row = await (modifier ? basicQuery.modify(modifier) : basicQuery);

    return adapter.fromDb(row);
  };

  const create = async (trx: Transaction, blank: Model): Promise<Model> => {
    const rowData = adapter.forInsertion(blank);
    const created = await trx(tableName)
      .insert(rowData)
      .returning('*')
      .then((rows: ModelRow[]) => first(rows));

    if (!created) {
      throw new Error(`Failed to create a ${domain}!`);
    }

    return adapter.fromDb(created);
  };

  const createAll = async (
    trx: Transaction,
    blanks: Model[]
  ): Promise<Model[]> => {
    return Promise.all(blanks.map((blank: Model) => create(trx, blank)));
  };

  const update = async (
    trx: Transaction,
    id: string,
    patch: Partial<Model>
  ): Promise<UpdateResult<Model>> => {
    const before = await findById(trx, id);
    if (!before) {
      throw new ResourceNotFoundError(`Could not find ${tableName} #${id}`);
    }
    if (patch.hasOwnProperty('id')) {
      throw new Error('Patch should not contain id!');
    }

    await emit<DaoUpdating<Model, typeof domain>>('dao.updating', domain, {
      trx,
      before,
      patch
    });

    const patchRow = adapter.toDbPartial(patch);
    const listOfUpdated = await trx(tableName)
      .where({ id })
      .update(patchRow, '*')
      .then(adapter.fromDbArray.bind(adapter));

    if (listOfUpdated.length !== 1) {
      throw new Error(`Could not update ${tableName} #${id}`);
    }
    const updated = listOfUpdated[0];

    await emit<DaoUpdated<Model, typeof domain>>('dao.updated', domain, {
      trx,
      before,
      updated
    });

    return {
      before,
      updated
    };
  };

  return {
    find,
    findOne,
    findById,
    update,
    create,
    createAll
  };
}
