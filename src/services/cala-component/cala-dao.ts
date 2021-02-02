import Knex, { QueryBuilder, Transaction } from "knex";
import { emit } from "../pubsub";
import { CalaAdapter, CalaDao, UpdateResult } from "./types";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { DaoCreated, DaoUpdating, DaoUpdated } from "../pubsub/cala-events";
import first from "../first";

export type QueryModifier = (query: QueryBuilder) => QueryBuilder;
export function identity<T>(a: T): T {
  return a;
}

interface DaoOptions<ModelRow> {
  orderColumn: keyof ModelRow;
  orderDirection?: "ASC" | "DESC";
  excludeDeletedAt?: boolean;
  queryModifier?: QueryModifier;
  insertModifier?: QueryModifier;
}

interface Identifiable {
  id: string;
}

export function buildDao<
  Model extends Identifiable,
  ModelRow extends Identifiable
>(
  domain: string,
  tableName: string,
  adapter: CalaAdapter<Model, ModelRow>,
  {
    orderColumn,
    orderDirection = "ASC",
    excludeDeletedAt = true,
    queryModifier = identity,
    insertModifier = identity,
  }: DaoOptions<ModelRow>
): CalaDao<Model> {
  const namespacedSplatSelect = `${tableName}.*`;
  const namespacedOrderColumn = `${tableName}.${orderColumn}`;
  const getNamespacedFilter = (filter: Partial<Model>): object => {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(adapter.toDbPartial(filter))) {
      transformed[`${tableName}.${key}`] = value;
    }

    if (excludeDeletedAt) {
      transformed[`${tableName}.deleted_at`] = null;
    }

    return transformed;
  };

  const find = async (
    trx: Knex.Transaction,
    filter: Partial<Model> = {},
    modifier: QueryModifier = identity
  ): Promise<Model[]> => {
    const namespacedFilter = getNamespacedFilter(filter);

    const rows = await trx(tableName)
      .select(namespacedSplatSelect)
      .where(namespacedFilter)
      .orderBy(namespacedOrderColumn, orderDirection)
      .modify(queryModifier)
      .modify(modifier);

    return adapter.fromDbArray(rows);
  };

  const count = async (
    trx: Knex.Transaction,
    filter: Partial<Model> = {},
    modifier: QueryModifier = identity
  ): Promise<number> => {
    const namespacedFilter = getNamespacedFilter(filter);

    const result = await trx(tableName)
      .count("*")
      .where(namespacedFilter)
      .modify(modifier);

    return Number(result[0].count);
  };

  const findOne = async (
    trx: Knex.Transaction,
    filter: Partial<Model>,
    modifier: QueryModifier = identity
  ): Promise<Model | null> => {
    const row = await trx(tableName)
      .select(namespacedSplatSelect)
      .where(getNamespacedFilter(filter))
      .orderBy(`${tableName}.${orderColumn}`, orderDirection)
      .first()
      .modify(queryModifier)
      .modify(modifier);

    if (!row) {
      return null;
    }

    return adapter.fromDb(row);
  };

  const findById = async (
    trx: Knex.Transaction,
    id: string,
    modifier: QueryModifier = identity
  ): Promise<Model | null> => {
    const row = await trx(tableName)
      .select(namespacedSplatSelect)
      .where(getNamespacedFilter({ id } as Partial<Model>))
      .modify(queryModifier)
      .modify(modifier)
      .first();

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
      .modify(insertModifier)
      .modify(modifier)
      .then<ModelRow | undefined>(first);

    if (!createdRow) {
      throw new Error(`Failed to create a ${domain}!`);
    }

    const created = adapter.fromDb(createdRow);

    await emit<Model, DaoCreated<Model, typeof domain>>({
      type: "dao.created",
      domain,
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
    const createdRows = await trx(tableName)
      .insert(rowData)
      .returning("*")
      .modify(insertModifier)
      .modify(modifier);

    if (!createdRows || createdRows.length === 0) {
      throw new Error(`Failed to create ${domain}!`);
    }

    const creations = adapter.fromDbArray(createdRows);

    await Promise.all(
      creations.map((created: Model) =>
        emit<Model, DaoCreated<Model, typeof domain>>({
          type: "dao.created",
          domain,
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

    await emit<Model, DaoUpdating<Model, typeof domain>>({
      type: "dao.updating",
      domain,
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

    await emit<Model, DaoUpdated<Model, typeof domain>>({
      type: "dao.updated",
      domain,
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
    count,
    findOne,
    findById,
    update,
    create,
    createAll,
  };
}
