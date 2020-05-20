import Knex from "knex";
import db from "../../services/db";

export const ALIASES = {
  collaboratorId: "collaborators_forcollaboratorsviewraw.id",
  userId: "users_forcollaboratorsviewraw.id",
};

export const getBuilder = (trx?: Knex.Transaction): Knex.QueryBuilder =>
  db
    .select("collaborators_forcollaboratorsviewraw.*")
    .select(db.raw("to_json(users_forcollaboratorsviewraw.*) as user"))
    .from("collaborators AS collaborators_forcollaboratorsviewraw")
    .leftJoin(
      "users AS users_forcollaboratorsviewraw",
      "users_forcollaboratorsviewraw.id",
      "collaborators_forcollaboratorsviewraw.user_id"
    )
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
