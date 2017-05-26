'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const Designer = require('../../domain-objects/designer');
const DesignerPhoto = require('../../domain-objects/designer-photo');

const instantiate = data => new Designer(data);

function getList() {
  return db.raw(`
select
  row_to_json(designers.*) as designer,
  row_to_json(designerphotos.*) as "designerPhoto"
from designerphotos
left join designerphotos
  on designerphotos.designer_id = designers.id
order by designers.created_at DESC
    `)
    .then((res) => {
      const results = res.rows;

      return results.map((row) => {
        const journal = new Journal(row.journal);
        const featuredPhoto = new Photo(row.featuredPhoto);
        designer.setPhotos(featuredPhoto);
        return journal;
      });
    })
    .catch(rethrow);
}

function getById() {
}
