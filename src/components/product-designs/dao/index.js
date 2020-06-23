"use strict";

const uuid = require("node-uuid");
const rethrow = require("pg-rethrow");
const { omit } = require("lodash");

const compact = require("../../../services/compact");
const db = require("../../../services/db");
const filterError = require("../../../services/filter-error");
const first = require("../../../services/first").default;
const attachApprovalSteps = require("./attach-approval-steps").default;
const attachBidId = require("./attach-bid-id").default;
const InvalidDataError = require("../../../errors/invalid-data");
const ProductDesign = require("../domain-objects/product-design");
const View = require("./view");

const { queryWithCollectionMeta } = View;

const instantiate = (data) => new ProductDesign(data);
const maybeInstantiate = (data) => (data && new ProductDesign(data)) || null;

const { dataMapper } = ProductDesign;

const TABLE_NAME = "product_designs";

function create(data, trx) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4(),
    preview_image_urls: JSON.stringify(data.previewImageUrls),
  });

  return db(TABLE_NAME)
    .insert(rowData, "id")
    .modify((query) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow)
    .then((ids) =>
      queryWithCollectionMeta(db, trx).where({ "product_designs.id": ids[0] })
    )
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(productDesignId, data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    preview_image_urls: JSON.stringify(data.previewImageUrls),
  });

  const compacted = compact(rowData);

  if (Object.keys(compacted).length < 1) {
    throw new InvalidDataError("No data provided");
  }

  return db(TABLE_NAME)
    .where({ id: productDesignId, deleted_at: null })
    .update(compacted, "id")
    .then((ids) =>
      queryWithCollectionMeta(db).where({ "product_designs.id": ids[0] })
    )
    .catch(rethrow)
    .catch(
      filterError(rethrow.ERRORS.ForeignKeyViolation, (err) => {
        if (err.constraint === "product_designs_status_fkey") {
          throw new InvalidDataError("Invalid product design status");
        }
        throw err;
      })
    )
    .then(first)
    .then(instantiate);
}

function findByUserId(userId, filters) {
  const query = Object.assign(
    {},
    {
      "product_designs.user_id": userId,
      "product_designs.deleted_at": null,
    },
    filters
  );

  return queryWithCollectionMeta(db)
    .where(query)
    .catch(rethrow)
    .then((designs) => designs.map(instantiate));
}

function findAll({ limit, offset, search, needsQuote }) {
  if (typeof limit !== "number" || typeof offset !== "number") {
    throw new Error("Limit and offset must be provided to find all users");
  }

  return queryWithCollectionMeta(db)
    .where({ "product_designs.deleted_at": null })
    .modify((query) => {
      if (search) {
        // Lazy person's search - allow fuzzy matching for design title, or
        // exact matching for design owner ID / status
        query.andWhere(
          db.raw(
            "(product_designs.title ~* :search or product_designs.user_id::text = :search or product_designs.status::text = :search)",
            { search }
          )
        );
      }
      if (needsQuote) {
        query
          .whereIn("product_designs.id", (subquery) =>
            subquery
              .select("design_id")
              .from("design_events")
              .whereIn("type", ["SUBMIT_DESIGN"])
          )
          .whereNotIn("product_designs.id", (subquery) =>
            subquery
              .select("design_id")
              .from("design_events")
              .whereIn("type", ["BID_DESIGN"])
          );
      }
    })
    .limit(limit)
    .offset(offset)
    .catch(rethrow)
    .catch(
      filterError(rethrow.ERRORS.InvalidRegularExpression, () => {
        throw new InvalidDataError("Search contained invalid characters");
      })
    )
    .then((designs) => designs.map(instantiate));
}

function findById(id, filters, options = {}, trx) {
  const query = Object.assign(
    {},
    {
      "product_designs.id": id,
    },
    filters
  );

  if (options.includeDeleted !== true) {
    query["product_designs.deleted_at"] = null;
  }
  return (
    queryWithCollectionMeta(db)
      .where(query)
      .modify((currentQuery) => {
        if (trx) {
          currentQuery.transacting(trx);
        }
      })
      .modify(attachApprovalSteps)
      .modify((q) => {
        if (options.bidUserId) {
          attachBidId(q, options.bidUserId);
        }
      })
      .then(first)
      // we need current_step_ordering for sorting, but don't want it to be a part of domain object
      .then((data) => {
        return data
          ? maybeInstantiate(omit(data, "current_step_ordering"))
          : null;
      })
      .catch(rethrow)
      .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null))
  );
}

function findByIds(ids) {
  return queryWithCollectionMeta(db)
    .whereIn("product_designs.id", ids)
    .andWhere({ "product_designs.deleted_at": null })
    .catch(rethrow)
    .then((designs) => designs.map(instantiate));
}

function findByCollectionId(collectionId, trx) {
  return queryWithCollectionMeta(db)
    .where({
      "collection_designs.collection_id": collectionId,
      "product_designs.deleted_at": null,
    })
    .orderBy("product_designs.created_at", "DESC")
    .modify((query) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow)
    .then((designs) => designs.map(instantiate));
}

function findByQuoteId(quoteId) {
  return queryWithCollectionMeta(db)
    .join("pricing_quotes", "pricing_quotes.design_id", "product_designs.id")
    .where({
      "pricing_quotes.id": quoteId,
      "product_designs.deleted_at": null,
    })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

module.exports = {
  create,
  update,
  findAll,
  findById,
  findByIds,
  findByUserId,
  findByCollectionId,
  findByQuoteId,
};
