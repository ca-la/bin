import getAddressesDAO from "../addresses/addresses-dao";
import AddressesDAO from "../addresses";
import omit from "lodash/omit";
import Knex from "knex";

import db from "../../services/db";
import InvoiceAddress, {
  dataMapper,
} from "../../domain-objects/invoice-address";
import first from "../../services/first";
import rethrow from "pg-rethrow";

const TABLE_NAME = "invoice_addresses";

const dao = getAddressesDAO<InvoiceAddress>(
  TABLE_NAME,
  dataMapper,
  InvoiceAddress
);

export const createFromAddress = async (
  trx: Knex.Transaction,
  addressId: string
): Promise<InvoiceAddress> => {
  const address = await AddressesDAO.findById(addressId);
  return dao.createTrx(trx, {
    ...omit(address, "id"),
    addressId: address.id,
  });
};

export const findByAddressId = async (
  addressId: string
): Promise<InvoiceAddress> => {
  return db(TABLE_NAME)
    .where({
      address_id: addressId,
      deleted_at: null,
    })
    .then(first)
    .then(dao.maybeInstantiate)
    .catch(rethrow);
};

export const {
  create,
  update,
  deleteById,
  findById,
  validate,
  findByUserId,
} = dao;

export default dao;
