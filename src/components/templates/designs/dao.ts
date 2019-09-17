import * as Knex from 'knex';
import * as rethrow from 'pg-rethrow';
import { first } from 'lodash';

import {
  dataAdapter,
  isTemplateDesignRow,
  TemplateDesign,
  TemplateDesignRow
} from './domain-object';
import * as db from '../../../services/db';
import { validate, validateEvery } from '../../../services/validate-from-db';
import filterError = require('../../../services/filter-error');
import InvalidDataError = require('../../../errors/invalid-data');

const TABLE_NAME = 'template_designs';

function onNoDesignError(designId: string): typeof filterError {
  return filterError(
    rethrow.ERRORS.ForeignKeyViolation,
    (error: typeof rethrow.ERRORS.ForeignKeyViolation) => {
      if (error.constraint === 'template_designs_design_id_fkey') {
        throw new InvalidDataError(`Design ${designId} does not exist.`);
      }

      throw error;
    }
  );
}

function onDuplicateDesignError(designId: string): typeof filterError {
  return filterError(
    rethrow.ERRORS.UniqueViolation,
    (error: typeof rethrow.ERRORS.UniqueViolation) => {
      if (error.constraint === 'unique_design') {
        throw new InvalidDataError(`Design ${designId} is already a template.`);
      }

      throw error;
    }
  );
}

export async function create(
  data: TemplateDesign,
  trx: Knex.Transaction
): Promise<TemplateDesign> {
  const insertionData = dataAdapter.forInsertion(data);
  const created = await db(TABLE_NAME)
    .insert(insertionData, '*')
    .transacting(trx)
    .then((rows: TemplateDesignRow[]) => first<TemplateDesignRow>(rows))
    .catch(rethrow)
    .catch(onNoDesignError(data.designId))
    .catch(onDuplicateDesignError(data.designId));

  if (!created) {
    throw new Error('Failed to create a TemplateDesign.');
  }

  return validate<TemplateDesignRow, TemplateDesign>(
    TABLE_NAME,
    isTemplateDesignRow,
    dataAdapter,
    created
  );
}

export async function remove(
  designId: string,
  trx: Knex.Transaction
): Promise<void> {
  const count: number = await db(TABLE_NAME)
    .where({ design_id: designId })
    .delete()
    .transacting(trx);

  if (count === 0) {
    throw new InvalidDataError(`Template for design ${designId} not found.`);
  }
}

export async function getAll(trx: Knex.Transaction): Promise<TemplateDesign[]> {
  const rows = await db(TABLE_NAME)
    .select('*')
    .transacting(trx);

  return validateEvery<TemplateDesignRow, TemplateDesign>(
    TABLE_NAME,
    isTemplateDesignRow,
    dataAdapter,
    rows
  );
}
