-- https://docs.google.com/spreadsheets/d/1ixbmwAGWVoDMxFr4OvvF7WSwAg35VR3TeGVa4Z_rLAs/edit#gid=0

with to_update as (select * from (values
  ('d@ca.la', 'DYLAN'),
  ('foda@kidsuper.com', 'FODA'),
  ('june@ca.la', 'JUNE'),
  ('brian@ca.la', 'BRIAN'),
  ('a@ca.la', 'VIP'),
  ('marc@ca.la', 'MARC'),
  ('a+test@ca.la', 'KANYE'),
  ('heron@heronpreston.com', 'HERON'),
  ('janet@realventures.com', 'JANET'),
  ('spector2@gmail.com', 'SPECTOR'),
  ('iamjoshuascott+cala@gmail.com', 'JOSH'),
  ('Jonathan.Hung@uotcbarrage.com', 'JON'),
  ('cam.drum@gmail.com', 'CAM'),
  ('lon@ca.la', 'LON'),
  ('sebastian@ca.la', 'BAT'),
  ('daniel.seo@tpc-group.com', 'SEO'),
  ('sg@sean.glass', 'GLASS'),
  ('daniel.hansson@hm.com', 'DANIEL'),
  ('lina.lind@hm.com', 'LINA'),
  ('jessica@ca.la', 'JESSICA'),
  ('bernadette@ca.la', 'BERNADETTE'),
  ('John@ca.la ', 'DOLLYPARTON'),
  ('agnes@ca.la', 'AGNES'),
  ('peter@ca.la', 'PETERC'),
  ('kristina@ca.la', 'KRISTINA'),
  ('jordan.lee@ca.la', 'JL758'),
  ('ana@ca.la', 'ANA'),
  ('ryan@ca.la', 'RYAN')
) as t (email, referral_code))
update
  users
set
  referral_code = to_update.referral_code
from to_update
where lower(users.email) = lower(to_update.email)
