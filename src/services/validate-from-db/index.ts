import DataAdapter from "../data-adapter";

export function validate<RowData extends object, UserData>(
  table: string,
  validator: (a: any) => a is RowData,
  adapter: DataAdapter<RowData, UserData>,
  data?: RowData | null
): UserData {
  if (validator(data)) {
    return adapter.parse(data);
  }

  throw new Error(
    `Schema mismatch: ${table}. Columns: ${data && Object.keys(data)}`
  );
}

export function validateEvery<RowData extends object, UserData>(
  table: string,
  validator: (a: any) => a is RowData,
  adapter: DataAdapter<RowData, UserData>,
  data?: (RowData | null | undefined)[] | null
): UserData[] {
  if (!data) {
    throw new Error("Validator was passed a falsy value");
  }

  return data.map((d: RowData | null | undefined) =>
    validate(table, validator, adapter, d)
  );
}

export function isEvery<SpecificType>(
  validator: (a: any) => a is SpecificType,
  candidates: any[]
): candidates is SpecificType[] {
  return candidates.every(validator);
}
