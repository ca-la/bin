'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  created_at: 'createdAt',
  height: 'height',
  id: 'id',
  image_id: 'imageId',
  path_data: 'pathData',
  process_name: 'processName',
  production_height_cm: 'productionHeightCm',
  production_width_cm: 'productionWidthCm',
  rotation: 'rotation',
  section_id: 'sectionId',
  // 'IMAGE' || 'PATH' || 'TEXT'
  type: 'type',
  text_content: 'textContent',
  text_color: 'textColor',
  text_font: 'textFont',
  width: 'width',
  x: 'x',
  y: 'y',
  z_index: 'zIndex'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignFeaturePlacement {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

ProductDesignFeaturePlacement.dataMapper = dataMapper;

module.exports = ProductDesignFeaturePlacement;
