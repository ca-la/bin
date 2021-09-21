import Knex from "knex";
import meow from "meow";
import { z } from "zod";

import db from "../services/db";
import { log } from "../services/logger";
import * as UserFeaturesDAO from "../components/user-features/dao";
import ResourceNotFoundError from "../errors/resource-not-found";

const HELP_TEXT = `
  Add or remove a feature flag for a list of users. If you pass no options, it
  will list the current feature flags available for the listed users.

  Usage
  $ bin/run [environment] user-features [options] user_email[, ...user_email]

  Options
  --add, -a feature_name     Add a feature to these users
  --remove, -r feature_name  Remove a feature from these users
`;

const cli = meow(HELP_TEXT, {
  flags: {
    add: {
      alias: "a",
      type: "string",
    },
    remove: {
      alias: "r",
      type: "string",
    },
    list: {
      alias: "l",
      type: "boolean",
    },
    dryRun: {
      type: "boolean",
      default: false,
    },
  },
});

const addSchema = z.object({
  flags: z.object({
    add: z.string(),
    dryRun: z.boolean(),
  }),
  input: z.array(z.string().email()),
});

const removeSchema = z.object({
  flags: z.object({
    remove: z.string(),
    dryRun: z.boolean(),
  }),
  input: z.array(z.string().email()),
});

const listSchema = z.object({
  flags: z.object({
    dryRun: z.boolean(),
  }),
  input: z.array(z.string().email()),
});

const cliSchema = z.union([addSchema, removeSchema, listSchema]);

async function getUserIdByEmail(ktx: Knex, email: string) {
  const user = await ktx("users")
    .select<{ id: string }>("id")
    .where({ email })
    .first();
  if (!user) {
    throw new ResourceNotFoundError(
      `Could not find user with email like ${email}`
    );
  }

  return user.id;
}

async function main(): Promise<void> {
  const result = cliSchema.safeParse(cli);

  if (!result.success) {
    log(cli.help);
    throw new Error("Incorrect usage");
  }

  const { flags, input } = result.data;

  const trx = await db.transaction();

  try {
    for (const userEmail of input) {
      const userId = await getUserIdByEmail(trx, userEmail);

      if ("add" in flags) {
        const featureName = flags.add;
        await UserFeaturesDAO.create(trx, userId, featureName);
      } else if ("remove" in flags) {
        const featureName = flags.remove;
        await UserFeaturesDAO.deleteByUserAndFeature(trx, userId, featureName);
      }

      const currentFeatures = await UserFeaturesDAO.findNamesByUser(
        trx,
        userId
      );
      log(`
User: ${userEmail} (${userId})
- [${currentFeatures.length}] ${currentFeatures.join(", ")}
`);
    }
  } catch (err) {
    await trx.rollback(err);
    throw err;
  }

  if (flags.dryRun) {
    log("⚠️  Dry run; rolling back...");
    await trx.rollback();
  } else {
    await trx.commit();
  }
}

main()
  .then(() => {
    process.exit();
  })
  .catch((err: Error) => {
    log(err.message);
    process.exit(1);
  });
