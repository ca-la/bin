import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
delete from design_events where id in (
  -- Find all bid events, for which there is a newer "duplicate" accept/reject event
  select e1.id from design_events as e1
  where (
    select count(*) from design_events as e2
    where e1.id != e2.id
    and (
      e2.type='ACCEPT_SERVICE_BID'
      or e2.type='REJECT_SERVICE_BID'
    )
    and e1.bid_id = e2.bid_id
    and e2.created_at > e1.created_at
  ) > 0
  and (
    e1.type='ACCEPT_SERVICE_BID'
    or e1.type='REJECT_SERVICE_BID'
  )
);

create unique index one_accept_or_reject_per_bid
  on design_events (bid_id) where (
    type='ACCEPT_SERVICE_BID' or
    type='REJECT_SERVICE_BID'
  );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index one_accept_or_reject_per_bid;
  `);
}
