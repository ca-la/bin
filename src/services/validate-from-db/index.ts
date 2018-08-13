import DataAdapter from '../data-adapter';

export function validate<RowData extends object, UserData>(
  table: string,
  validator: (a: any) => a is RowData,
  adapter: DataAdapter<RowData, UserData>,
  data: RowData
): UserData {
  if (validator(data)) {
    return adapter.parse(data);
  }

  throw new TypeError(
    `Schema mismatch: ${table}. Columns: ${Object.keys(data)}`
  );
}

export function validateEvery<RowData extends object, UserData>(
  table: string,
  validator: (a: any) => a is RowData,
  adapter: DataAdapter<RowData, UserData>,
  data: RowData[]
): UserData[] {
  if (isEvery(validator, data)) {
    return data.map((d: RowData) => adapter.parse(d));
  }

  throw new TypeError(
    `Schema mismatch: ${table}. Columns: ${Object.keys(data)}`
  );
}

export function isEvery<SpecificType>(
  validator: (a: any) => a is SpecificType,
  candidates: any[]
): candidates is SpecificType[] {
  return candidates.every(validator);
}
