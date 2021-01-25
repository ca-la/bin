import Knex from "knex";

export default function createTeamUserLock(
  trx: Knex.Transaction,
  teamId: string
) {
  return trx.raw("select * from team_users where team_id = ? for update", [
    teamId,
  ]);
}
