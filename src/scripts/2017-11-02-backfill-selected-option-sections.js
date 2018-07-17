'use strict';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

/* eslint-disable no-console */
function green(message) {
  console.log(COLORS.green, message, COLORS.reset);
}

function red(message) {
  console.log(COLORS.red, message, COLORS.reset);
}

function yellow(message) {
  console.log(COLORS.yellow, message, COLORS.reset);
}

/**
 * NB: This script should never need run again, as it'll be enforced in the DB
 * going forward
 */

const db = require('../services/db');
const Logger = require('../services/logger');

// Duplicated from DAO to make sure we catch all deleted sections etc
function findSectionsByDesignId(designId) {
  return db('product_design_sections')
    .where({ design_id: designId })
    .orderBy('created_at', 'asc');
}

function setSection(selectedOptionId, sectionId) {
  return db('product_design_selected_options')
    .where({ id: selectedOptionId })
    .update({
      section_id: sectionId
    }, '*');
}

async function attachSection(selectedOption) {
  const sections = await findSectionsByDesignId(selectedOption.design_id);
  green(`Found ${sections.length} potential sections for selectedOption:${selectedOption.id}`);

  const ownerSection = sections.find(
    (section) => {
      if (!section.panel_data) {
        yellow(`No panel data for section:${section.id}`);
        return false;
      }

      const panelData = section.panel_data;

      const ownerPanel = panelData.panels.find(panel =>
        panel.id === selectedOption.panel_id);
      return Boolean(ownerPanel);
    }
  );

  if (!ownerSection) {
    red('Did not find a matching section!');
    return;
  }

  green(`Found owner section:${ownerSection.id}`);
  const updatedRows = await setSection(selectedOption.id, ownerSection.id);
  const updated = updatedRows[0];
  if (updated.section_id) {
    green(`Successfully updated: ${updated.id}:${updated.section_id}`);
  } else {
    red('Did not update!');
    red(updated);
  }
}

return db('product_design_selected_options').where({ section_id: null })
  .then((selectedOptions) => {
    Logger.log(`Found ${selectedOptions.length} selected options without sections`);
    let attaching = Promise.resolve();

    selectedOptions.forEach((option) => {
      attaching = attaching.then(() =>
        attachSection(option));
    });

    return attaching;
  })
  .then(() => {
    green('fin.');
    process.exit(0);
  });
