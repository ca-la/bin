import uuid from "node-uuid";
import rethrow from "pg-rethrow";
import omit from "lodash/omit";
import Knex from "knex";

import DataMapper from "../../services/data-mapper";

import Address from "../../domain-objects/address";

import db from "../../services/db";
import first from "../../services/first";
import compact from "../../services/compact";

import { validatePropertiesFormatted } from "../../services/validate";

export type AddressesDao<T> = DAO<T> & {
  createTrx: (trx: Knex.Transaction, data: any) => Promise<T>;
  findByUserId: DaoFindById<T[]>;
  instantiate: (row: any) => T;
  maybeInstantiate: (row: any) => T | null;
};

export default function getAddressesDAO<T extends Address>(
  tableName: string,
  dataMapper: DataMapper<any, any>,
  addressClass: new (data: any) => T
): AddressesDao<T> {
  const instantiate = (row: any): T => new addressClass(row);

  const maybeInstantiate = (data: any): T | null =>
    (data && new addressClass(data)) || null;

  function validate(data: any): void {
    const requiredMessages = {
      addressLine1: "Address Line 1",
      city: "City",
      region: "Region",
      postCode: "Post Code",
      country: "Country",
    };

    validatePropertiesFormatted(data, requiredMessages);
  }

  function createTrx(trx: Knex.Transaction, data: any): Promise<T> {
    validate(data);

    const rowData = Object.assign(
      {},
      compact(dataMapper.userDataToRowData(data)),
      { id: uuid.v4() }
    );

    return trx(tableName)
      .insert(rowData, "*")
      .catch(rethrow)
      .then(first)
      .then(instantiate);
  }

  function create(data: any): Promise<T> {
    return db.transaction((trx: Knex.Transaction) => createTrx(trx, data));
  }

  function findByUserId(userId: string): Promise<T[]> {
    return db(tableName)
      .where({
        user_id: userId,
        deleted_at: null,
      })
      .orderBy("created_at", "desc")
      .catch(rethrow)
      .then((addresses: any[]) => addresses.map(instantiate));
  }

  function findById(id: string): Promise<T> {
    return db(tableName)
      .where({
        id,
        deleted_at: null,
      })
      .then(first)
      .then(maybeInstantiate)
      .catch(rethrow);
  }

  function deleteById(id: string): Promise<T> {
    return db(tableName)
      .where({
        id,
        deleted_at: null,
      })
      .update(
        {
          deleted_at: new Date(),
        },
        "*"
      )
      .then(first)
      .then(maybeInstantiate)
      .catch(rethrow);
  }

  function update(id: string, data: any): Promise<T> {
    return db(tableName)
      .where({
        id,
      })
      .update(
        compact(
          dataMapper.userDataToRowData(omit(data, "userId", "id", "createdAt"))
        ),
        "*"
      )
      .then(first)
      .then(instantiate);
  }

  return {
    instantiate,
    maybeInstantiate,
    create,
    createTrx,
    update,
    deleteById,
    findById,
    validate,
    findByUserId,
  };
}
