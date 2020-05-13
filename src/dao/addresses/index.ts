import getAddressesDAO from './addresses-dao';
import Address, { dataMapper } from '../../domain-objects/address';
import rethrow from 'pg-rethrow';
import db from '../../services/db';

export const tableName = 'addresses';

const dao = getAddressesDAO<Address>(tableName, dataMapper, Address);

export function findByUserId(userId: string): Promise<Address[]> {
  return db('addresses')
    .where({
      'addresses.user_id': userId,
      'addresses.deleted_at': null
    })
    .leftJoin(
      db('invoice_addresses')
        .where({
          user_id: userId
        })
        .distinct('address_id')
        .select('created_at')
        .as('ia'),
      'addresses.id',
      '=',
      'ia.address_id'
    )
    .orderByRaw('ia.created_at DESC NULLS LAST')
    .select('addresses.*')
    .catch(rethrow)
    .then((addresses: any[]) => addresses.map(dao.instantiate));
}

export const { create, update, deleteById, findById, validate } = dao;

export default {
  ...dao,
  findByUserId
};
