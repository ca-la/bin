import Knex from "knex";

import { test, db, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";

import ProductDesignOptionsDAO from "./dao";

test("ProductDesignOptionsDAO: create and find work correctly with DB", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const option = {
    ...ProductDesignOptionsDAO.getOptionDefaults({
      userId: user.id,
      title: "The Material Option",
    }),
  };

  const created = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignOptionsDAO.create(trx, option)
  );
  t.equals(created.id, option.id, "option successfully created");

  const found = await ProductDesignOptionsDAO.findOne(db, { id: created.id });

  t.equals(found!.id, option.id, "option successfully found");
  t.equals(found!.title, "The Material Option");
});
