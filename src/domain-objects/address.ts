import DataMapper from '../services/data-mapper';
import { requireProperties } from '../services/require-properties';

export const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  company_name: 'companyName',

  address_line_1: 'addressLine1',
  address_line_2: 'addressLine2',
  city: 'city',
  region: 'region',
  post_code: 'postCode',
  country: 'country',
  phone: 'phone',
  user_id: 'userId'
};
export const dataMapper = new DataMapper(keyNamesByColumnName);

class Address {
  public static dataMapper = dataMapper;

  public id: string = '';
  public createdAt: Date | null = null;
  public deletedAt: Date | null = null;
  public userId: string | null = null;
  public companyName: string | null = null;
  public addressLine1: string = '';
  public addressLine2: string | null = null;
  public city: string = '';
  public region: string = '';
  public postCode: string = '';
  public country: string = '';
  public phone: string = '';

  constructor(row: any) {
    requireProperties(row, 'id');
    const data = (this
      .constructor as typeof Address).dataMapper.rowDataToUserData(row);
    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

export default Address;
