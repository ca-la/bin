import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import StageTemplate, {
  dataAdapter,
  isStageTemplateRow,
  StageTemplateRow
} from '../../domain-objects/stage-template';

const TABLE_NAME = 'stage_templates';

export async function create(data: Unsaved<StageTemplate>): Promise<StageTemplate> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((rows: StageTemplateRow[]) => first(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<StageTemplateRow, StageTemplate>(
    TABLE_NAME,
    isStageTemplateRow,
    dataAdapter,
    created
  );
}

export async function findAll(): Promise<StageTemplate[]> {
  const templates = await db(TABLE_NAME).select('*');

  return validateEvery<StageTemplateRow, StageTemplate>(
    TABLE_NAME,
    isStageTemplateRow,
    dataAdapter,
    templates
  );
}
