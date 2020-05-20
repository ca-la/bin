import uuid from "node-uuid";

import db from "../../services/db";
import ResolveAccount, {
  dataAdapter,
  isResolveAccountRow,
  ResolveAccountRow,
} from "./domain-object";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "resolve_accounts";

export async function create(
  data: MaybeUnsaved<ResolveAccount>
): Promise<ResolveAccount> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null,
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .then((rows: ResolveAccountRow[]) => first<ResolveAccountRow>(rows));

  if (!created) {
    throw new Error("Failed to create a process!");
  }

  return validate<ResolveAccountRow, ResolveAccount>(
    TABLE_NAME,
    isResolveAccountRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<ResolveAccount | null> {
  const process = await db(TABLE_NAME)
    .select("*")
    .where({ id, deleted_at: null })
    .then((rows: ResolveAccountRow[]) => first<ResolveAccountRow>(rows));

  if (!process) {
    return null;
  }

  return validate<ResolveAccountRow, ResolveAccount>(
    TABLE_NAME,
    isResolveAccountRow,
    dataAdapter,
    process
  );
}

export async function findAllByUserId(
  userId: string
): Promise<ResolveAccount[]> {
  const processes = await db(TABLE_NAME)
    .select("*")
    .where({ user_id: userId, deleted_at: null });

  return validateEvery<ResolveAccountRow, ResolveAccount>(
    TABLE_NAME,
    isResolveAccountRow,
    dataAdapter,
    processes
  );
}
