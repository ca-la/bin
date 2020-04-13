import Address, {
  keyNamesByColumnName as addressKeyNamesByColumnName
} from './address';
import DataMapper from '../services/data-mapper';

export const keyNamesByColumnName = {
  ...addressKeyNamesByColumnName,
  address_id: 'addressId'
};

export const dataMapper = new DataMapper(keyNamesByColumnName);

class InvoiceAddress extends Address {
  public static dataMapper = dataMapper;
  public addressId!: string;
}

export default InvoiceAddress;
