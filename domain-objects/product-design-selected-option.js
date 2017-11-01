'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  design_id: 'designId',

  // As of 2017-10-03, panel IDs are still created client-side and stored in
  // freeform JSON, so there's not yet DB-level enforcement of foreign keys.
  panel_id: 'panelId',
  option_id: 'optionId',
  units_required_per_garment: 'unitsRequiredPerGarment',
  fabric_dye_process_name: 'fabricDyeProcessName',
  fabric_dye_process_color: 'fabricDyeProcessColor',
  fabric_wash_process_name: 'fabricWashProcessName',
  fabric_custom_process_names: 'fabricCustomProcessNames',
  garment_component_name: 'garmentComponentName'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignSelectedOption {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }

  setOption(option) {
    this.option = option;
  }
}

ProductDesignSelectedOption.dataMapper = dataMapper;

module.exports = ProductDesignSelectedOption;
