"use strict";

const db = require("../../services/db");

function createDesigners() {
  return db.raw(`
insert into designers
  (id, name, bio_html, twitter_handle, instagram_handle, position)
  values
  (
    '5de8a9ee-e46b-4e5b-b7f9-bffb3c3b405c',
    'Designer 1',
    'The original and best',
    'thisiscala',
    'cala__',
    1
  ),
  (
    'e888e4c3-1cd6-41df-92a7-e7241795394f',
    'Designer 2',
    'Second place',
    'thisiscala',
    'cala__',
    2
  );

insert into designerphotos
  (id, designer_id, photo_url, position)
  values
  (
    'fcad6e0e-285c-488e-a998-db2310f11f3e',
    '5de8a9ee-e46b-4e5b-b7f9-bffb3c3b405c',
    'http://designer-1-photo-3.jpg',
    3
  ),
  (
    '4cf94b3d-7155-498e-895b-75f29c36e939',
    '5de8a9ee-e46b-4e5b-b7f9-bffb3c3b405c',
    'http://designer-1-photo-2.jpg',
    2
  ),
  (
    '4d07ae73-1208-436a-9dc6-bfe37f61bd94',
    '5de8a9ee-e46b-4e5b-b7f9-bffb3c3b405c',
    'http://designer-1-photo-1.jpg',
    1
  ),
  (
    'a98fa973-9929-4023-8566-1b0d274317c6',
    'e888e4c3-1cd6-41df-92a7-e7241795394f',
    'http://designer-2-photo-3.jpg',
    3
  ),
  (
    'f0888101-3e02-41c1-a3e4-221d46c0452e',
    'e888e4c3-1cd6-41df-92a7-e7241795394f',
    'http://designer-2-photo-1.jpg',
    1
  ),
  (
    'e8aeb90f-ff68-4a08-b9f5-95e7deba82d5',
    'e888e4c3-1cd6-41df-92a7-e7241795394f',
    'http://designer-2-photo-2.jpg',
    2
  );
  `);
}

module.exports = {
  createDesigners,
};
