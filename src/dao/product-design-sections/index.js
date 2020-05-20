"use strict";

const uuid = require("node-uuid");
const rethrow = require("pg-rethrow");

const compact = require("../../services/compact");
const db = require("../../services/db");
const first = require("../../services/first").default;
const InvalidDataError = require("../../errors/invalid-data");
const ProductDesignSection = require("../../domain-objects/product-design-section");

const instantiate = (data) => new ProductDesignSection(data);

function create(data) {
  if (
    data.type === "FLAT_SKETCH" &&
    !data.templateName &&
    !data.customImageId
  ) {
    throw new InvalidDataError("Template name or custom image ID required");
  }

  return db("product_design_sections")
    .insert(
      {
        template_name: data.templateName,
        design_id: data.designId,
        title: data.title,
        custom_image_id: data.customImageId,
        panel_data: data.panelData,
        position: data.position,
        custom_data: data.customData,
        id: uuid.v4(),
        type: data.type,
      },
      "*"
    )
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(sectionId, data) {
  return db("product_design_sections")
    .where({ id: sectionId, deleted_at: null })
    .update(
      compact({
        template_name: data.templateName,
        title: data.title,
        custom_image_id: data.customImageId,
        custom_data: data.customData,
        panel_data: data.panelData,
        position: data.position,
        type: data.type,
      }),
      "*"
    )
    .then(first)
    .then(instantiate);
}

function deleteByIdTrx(trx, id) {
  return db("product_design_sections")
    .transacting(trx)
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

function findByDesignId(designId) {
  return db("product_design_sections")
    .where({
      design_id: designId,
      deleted_at: null,
    })
    .orderBy("position", "asc")
    .catch(rethrow)
    .then((sections) => sections.map(instantiate));
}

function findById(id) {
  return db("product_design_sections")
    .where({ id, deleted_at: null })
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  deleteByIdTrx,
  findById,
  update,
  findByDesignId,
};
