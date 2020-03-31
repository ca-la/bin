import getAddressesDAO from './addresses-dao';
import Address, { dataMapper } from '../../domain-objects/address';
import rethrow from 'pg-rethrow';
import db from '../../services/db';

const dao = getAddressesDAO<Address>('addresses', dataMapper, Address);

export function findByUserId(userId: string): Promise<Address[]> {
  return db('addresses')
    .where({
      'addresses.user_id': userId,
      'addresses.deleted_at': null
    })
    .leftJoin(
      'invoice_addresses',
      'addresses.id',
      '=',
      'invoice_addresses.address_id'
    )
    .orderByRaw('invoice_addresses.created_at DESC NULLS LAST')
    .select('addresses.*')
    .catch(rethrow)
    .then((addresses: any[]) => addresses.map(dao.instantiate));
}

export const {
  create,
  update,
  deleteById,
  findById,
  validate
  // findByUserId
} = dao;

export default dao;
