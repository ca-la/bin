import Knex from "knex";
import uuid from "node-uuid";
import db from "../services/db";
import { log, logClientError } from "../services/logger";

import TemplateCategoriesDAO from "../components/templates/categories/dao";

function main() {
  const [ordering, title] = process.argv.slice(2);

  if (!ordering || !title) {
    throw new Error("You must provide an ordering value and a title");
  }

  const orderingInt = parseInt(ordering, 10);

  if (Number.isNaN(orderingInt)) {
    throw new Error("Ordering must be an integer");
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const created = await TemplateCategoriesDAO.create(trx, {
      id: uuid.v4(),
      ordering: orderingInt,
      title,
    });

    log(`Succesfully created:
${JSON.stringify(created, null, 2)}`);
  });
}

main()
  .catch((err: Error) => {
    logClientError(err.message);
    process.exit(1);
  })
  .then(() => process.exit(0));
