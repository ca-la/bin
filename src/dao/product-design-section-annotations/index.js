"use strict";

const uuid = require("node-uuid");
const rethrow = require("pg-rethrow");

const db = require("../../services/db");
const first = require("../../services/first").default;
const ProductDesignSectionAnnotation = require("../../domain-objects/product-design-section-annotation");

const instantiate = (data) => new ProductDesignSectionAnnotation(data);

function deleteById(id) {
  return db("product_design_section_annotations")
    .where({ id, deleted_at: null })
    .update(
      {
        deleted_at: new Date(),
      },
      "*"
    )
    .then(first)
    .then(instantiate);
}

function createForSection(sectionId, data) {
  return db("product_design_section_annotations")
    .insert(
      {
        id: uuid.v4(),
        section_id: sectionId,
        x: data.x,
        y: data.y,
        text: data.text,
        in_reply_to_id: data.inReplyToId,
        user_id: data.userId,
      },
      "*"
    )
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findById(id) {
  return db("product_design_section_annotations")
    .where({ id, deleted_at: null })
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findBySectionId(sectionId) {
  return db("product_design_section_annotations")
    .where({ section_id: sectionId, deleted_at: null })
    .orderBy("created_at", "asc")
    .catch(rethrow)
    .then((annotations) => annotations.map(instantiate));
}

function update(id, data) {
  return db("product_design_section_annotations")
    .where({ id, deleted_at: null })
    .update(
      {
        text: data.text,
      },
      "*"
    )
    .then(first)
    .then(instantiate);
}

module.exports = {
  deleteById,
  findById,
  createForSection,
  findBySectionId,
  update,
};
