'use strict';

const pick = require('lodash/pick');
const { create } = require('./index');

const createDesign = require('../product-designs').create;
const createOption = require('../product-design-options').create;
const createSection = require('../product-design-sections').create;
const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

function createPrerequisites() {
  let option;
  let design;

  return createUser({ withSession: false })
    .then(({ user }) => {
      return Promise.all([
        createOption({
          userId: user.id,
          title: 'No Image',
          type: 'FABRIC'
        }),
        createDesign({
          title: 'Plain White Tee',
          productType: 'TEESHIRT',
          userId: user.id
        })
      ]);
    })
    .then(([_option, _design]) => {
      option = _option;
      design = _design;
      return createSection({
        templateName: 'gfoobar',
        designId: design.id
      });
    })
    .then((section) => {
      return { option, design, section };
    });
}
test('ProductDesignSelectedOptionsDAO.create creates and returns a selected option', (t) => {
  let data;

  return createPrerequisites()
    .then(({ option, design, section }) => {
      data = {
        designId: design.id,
        optionId: option.id,
        sectionId: section.id,
        panelId: 'panel123',
        unitsRequiredPerGarment: 123,
        fabricDyeProcessName: 'dipdye',
        fabricDyeProcessColor: 'red',
        fabricWashProcessName: 'distressed',
        fabricCustomProcessNames: ['put it in a box', 'a big box'],
        garmentComponentName: 'self'
      };

      return create(data);
    })
    .then((selectedOption) => {
      t.deepEqual(
        pick(selectedOption, Object.keys(data)),
        data
      );
    });
});
