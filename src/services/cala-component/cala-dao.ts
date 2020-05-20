import Knex, { QueryBuilder, Transaction } from "knex";
import { emit } from "../pubsub";
import { CalaAdapter, CalaDao, UpdateResult } from "./types";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { DaoCreated, DaoUpdating, DaoUpdated } from "../pubsub/cala-events";
import first from "../first";

type QueryModifier = (query: QueryBuilder) => QueryBuilder;
function identity<T>(a: T): T {
  return a;
}

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
    modifier: QueryModifier = identity
  ): Promise<Model[]> => {
    const rows = await trx(tableName)
      .select("*")
      .where(adapter.toDbPartial(filter))
      .orderBy(orderColumn)
      .modify(modifier);

    return adapter.fromDbArray(rows);
  };

  const findById = async (
    trx: Knex.Transaction,
    id: string
  ): Promise<Model | null> => {
    const row = await trx(tableName).select("*").where({ id }).first();

    if (!row) {
      return null;
    }

    return adapter.fromDb(row);
  };

  const findOne = async (
    trx: Knex.Transaction,
    filter: Partial<Model>,
    modifier: QueryModifier = identity
  ): Promise<Model | null> => {
    const row = await trx(tableName)
      .select("*")
      .where(adapter.toDbPartial(filter))
      .orderBy(orderColumn)
      .first()
      .modify(modifier);

    if (!row) {
      return null;
    }

    return adapter.fromDb(row);
  };

  const create = async (
    trx: Transaction,
    blank: Model,
    modifier: QueryModifier = identity
  ): Promise<Model> => {
    const rowData = adapter.forInsertion(blank);
    const createdRow = await trx(tableName)
      .insert(rowData)
      .returning("*")
      .modify(modifier)
      .then<ModelRow | undefined>(first);

    if (!createdRow) {
      throw new Error(`Failed to create a ${domain}!`);
    }

    const created = adapter.fromDb(createdRow);

    await emit<DaoCreated<Model, typeof domain>>("dao.created", domain, {
      trx,
      created,
    });

    return created;
  };

  const createAll = async (
    trx: Transaction,
    blanks: Model[],
    modifier: QueryModifier = identity
  ): Promise<Model[]> => {
    const rowData = blanks.map(adapter.forInsertion.bind(adapter));
    const createdRows: ModelRow[] = await trx(tableName)
      .insert(rowData)
      .returning("*")
      .modify(modifier);

    if (!createdRows || createdRows.length === 0) {
      throw new Error(`Failed to create ${domain}!`);
    }

    const creations = adapter.fromDbArray(createdRows);

    await Promise.all(
      creations.map((created: Model) =>
        emit<DaoCreated<Model, typeof domain>>("dao.created", domain, {
          trx,
          created,
        })
      )
    );

    return creations;
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
    if (patch.hasOwnProperty("id")) {
      throw new Error("Patch should not contain id!");
    }

    await emit<DaoUpdating<Model, typeof domain>>("dao.updating", domain, {
      trx,
      before,
      patch,
    });

    const patchRow = adapter.toDbPartial(patch);
    const listOfUpdated = await trx(tableName)
      .where({ id })
      .update(patchRow, "*")
      .then(adapter.fromDbArray.bind(adapter));

    if (listOfUpdated.length !== 1) {
      throw new Error(`Could not update ${tableName} #${id}`);
    }
    const updated = listOfUpdated[0];

    await emit<DaoUpdated<Model, typeof domain>>("dao.updated", domain, {
      trx,
      before,
      updated,
    });

    return {
      before,
      updated,
    };
  };

  return {
    find,
    findOne,
    findById,
    update,
    create,
    createAll,
  };
}
