import Knex from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import dataAdapter from "./adapter";
import { Page } from "./types";

const dao = buildDao(
  "UserPageOnboarding",
  "user_page_onboardings",
  dataAdapter,
  {
    orderColumn: "page",
    excludeDeletedAt: false, // No `deleted_at` column here
  }
);

async function findByUser(stx: Knex, userId: string) {
  return dao.find(stx, { userId });
}

async function findByUserAndPage(stx: Knex, userId: string, page: Page) {
  return dao.findOne(stx, { userId, page });
}

export default {
  ...dao,
  findByUser,
  findByUserAndPage,
};
