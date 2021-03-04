import Knex from "knex";
import uuid from "node-uuid";

import { Page } from "./types";
import UserPageOnboardingsDAO from "./dao";

export async function viewPage(
  trx: Knex.Transaction,
  userId: string,
  page: Page
) {
  const existing = await UserPageOnboardingsDAO.findByUserAndPage(
    trx,
    userId,
    page
  );
  const viewedAt = new Date();

  return existing
    ? UserPageOnboardingsDAO.update(trx, existing.id, {
        viewedAt,
      })
    : UserPageOnboardingsDAO.create(trx, {
        id: uuid.v4(),
        userId,
        page,
        viewedAt,
      });
}
