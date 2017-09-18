'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',

  // true if this is a fabric/trim we're offering ourselves, false if
  // user-created. if false then user_id must be present
  is_builtin_option: 'isBuiltinOption',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  type: 'type',
  user_id: 'userId',

  // for trims only - cost per unit. use per_meter_cost_cents for fabric
  unit_cost_cents: 'unitCostCents',
  preferred_length_unit: 'preferredLengthUnit',

  // grams per square meter
  weight_gsm: 'weightGsm',
  preferred_weight_unit: 'preferredWeightUnit',
  title: 'title',
  sku: 'sku',
  preview_image_id: 'previewImageId',
  pattern_image_id: 'patternImageId',
  vendor_name: 'vendorName',
  per_meter_cost_cents: 'perMeterCostCents',
  composition: 'composition',
  roll_width_cm: 'rollWidthCm',
  preferred_width_unit: 'preferredWidthUnit',
  weave_type: 'weaveType',

  // suggested types of garments
  end_use: 'endUse',
  origin_country: 'originCountry',
  care_instructions: 'careInstructions',
  ships_from_city: 'shipsFromCity',
  ships_from_country: 'shipsFromCountry',
  tests_and_certifications: 'testsAndCertifications',
  description: 'description',

  // "prepared for dyeing"
  is_pfd: 'isPfd',
  color: 'color',
  lead_time_hours: 'leadTimeHours',
  vendor_web_url: 'vendorWebUrl'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

// A ProductDesignOption is either a fabric or a trim in a user's "option
// library". When chosen for a specific garment, a record is created in the
// product_design_selected_options xref table tying the two together.
class ProductDesignOption {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

ProductDesignOption.dataMapper = dataMapper;

module.exports = ProductDesignOption;
