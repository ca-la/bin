import * as Knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset, yellow } from '../../services/colors';

import StageTemplate from '../../domain-objects/stage-template';
import TaskTemplate, {
  dataAdapter as taskDataAdapter
} from '../../domain-objects/task-template';

/*tslint:disable:max-line-length*/
const generateTasks = (stages: StageTemplate[]): TaskTemplate[] => [
  {
    assigneeRole: 'DESIGNER',
    description:
      "It's okay if this is a rough idea! Place your sketches under the 'Designs' tab.",
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[0].id,
    title: 'Add your sketch'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      "Let us know what you're thinking for style, fit, fabric, and trim details. Place your reference images under the 'Designs' tab.",
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[0].id,
    title: 'Add your reference images'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      "If you have specific fabric & trim preferences, let us know (type, weight, content, color, print, or wash). All materials should be placed under the 'Materials' tab.",
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[0].id,
    title: 'Add your materials'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      'Tell us any specific measurements and placement for details, trims, or artwork.',
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[1].id,
    title: 'Add your measurements'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      'Add as many comments as needed to help us understand your vision.',
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[1].id,
    title: 'Add your comments with construction details'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      "Add your files under the 'Artwork' tab for prints or patterns (vector file format preferred; but we can work with anything over 300dpi).",
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[1].id,
    title: 'Upload your artwork'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      'Add a sketch or comment detailing where you want your brand and/or care labels.',
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[1].id,
    title: 'Add your label placement details'
  },
  {
    assigneeRole: 'DESIGNER',
    description: 'This is where we will send your samples.',
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[1].id,
    title: 'Confirm your shipping address'
  },
  {
    assigneeRole: 'DESIGNER',
    description: 'The default sample size is Medium.',
    designPhase: 'POST_CREATION',
    id: uuid.v4(),
    ordering: 5,
    stageTemplateId: stages[1].id,
    title: 'What size do you want your sample to be?'
  },
  {
    assigneeRole: 'CALA',
    description: 'This is used for your reference materials.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[2].id,
    title: 'Create shipping label'
  },
  {
    assigneeRole: 'DESIGNER',
    description: 'Send over your references for fit, fabric, color, wash, etc.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[2].id,
    title: 'Send your reference samples'
  },
  {
    assigneeRole: 'PARTNER',
    description: 'Let us know you recieved the samples for this design.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[2].id,
    title: 'Confirm receipt of reference samples'
  },
  {
    assigneeRole: 'PARTNER',
    description: "Source all components on the 'Materials' tab.",
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[2].id,
    title: 'Send requested materials to designer for approval'
  },
  {
    assigneeRole: 'DESIGNER',
    description: 'Approve materials, processes, and artwork options.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[2].id,
    title: 'Approve sourced materials'
  },
  {
    assigneeRole: 'PARTNER',
    description: 'Communicate when the pattern sample will be done.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[3].id,
    title: 'Create pattern'
  },
  {
    assigneeRole: 'PARTNER',
    description: 'Communicate when the sample will be done.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[3].id,
    title: 'Create sample'
  },
  {
    assigneeRole: 'PARTNER',
    description:
      'Capture and upload the front, back, and details on dress form or mannequin.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[3].id,
    title: 'Add photo of completed sample'
  },
  {
    assigneeRole: 'PARTNER',
    description: 'Confirm the sample was sent.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[3].id,
    title: 'Send the sample'
  },
  {
    assigneeRole: 'DESIGNER',
    description:
      'Approve fit, material, and artwork. Have suggestions? Add some comments.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[3].id,
    title: 'Approve your sample'
  },
  {
    assigneeRole: 'PARTNER',
    description:
      "Confirm that you've completed the grading process – if necessary.",
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[4].id,
    title: 'Grading complete'
  },
  {
    assigneeRole: 'PARTNER',
    description:
      'Add the date you expect the materials to arrive and be ready for production.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[4].id,
    title: 'Purchase raw materials for production'
  },
  {
    assigneeRole: 'PARTNER',
    description:
      'Make sure you account for all fabric, trims, labels, and packaging.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[4].id,
    title: 'Confirm receipt of all production materials'
  },
  {
    assigneeRole: 'PARTNER',
    description: "Send back the designer's reference items.",
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[4].id,
    title: 'Return reference items'
  },
  {
    assigneeRole: 'PARTNER',
    description:
      'Confirm that garment is properly inspected and meets quality criteria.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 0,
    stageTemplateId: stages[5].id,
    title: 'Complete QA inspection'
  },
  {
    assigneeRole: 'PARTNER',
    description: "Upload flat front and back photography to 'Design' tab.",
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 1,
    stageTemplateId: stages[5].id,
    title: 'Upload ecom photography photos'
  },
  {
    assigneeRole: 'PARTNER',
    description:
      'Put garment in garment bags and place barcode stickers on the outside.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 2,
    stageTemplateId: stages[5].id,
    title: 'Complete product packing'
  },
  {
    assigneeRole: 'PARTNER',
    description: 'Advise tracking number and estimated delivery date.',
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 3,
    stageTemplateId: stages[5].id,
    title: 'Confirm order has shipped'
  },
  {
    assigneeRole: 'DESIGNER',
    description: "Let us know that you've successfully received your order 🎉.",
    designPhase: 'POST_APPROVAL',
    id: uuid.v4(),
    ordering: 4,
    stageTemplateId: stages[5].id,
    title: 'Confirm receipt of products'
  }
];
/*tslint:enable:max-line-length*/

insertTaskAndStageTemplates()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      log(`${red}ERROR:\n${reset}`, err);
      process.exit(1);
    }
  );

async function insertTaskAndStageTemplates(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const stages = await trx('stage_templates')
      .select('*')
      .orderBy('ordering');
    if (stages.length !== 7 || stages.length !== 6) {
      return trx.rollback(`
${red}Unexpected number of stages!
${reset}Expected ${yellow}${7}${reset}, but got ${red}${stages.length}${reset}.

Dump of returned rows:

${JSON.stringify(stages, null, 4)}
`);
    }
    const tasks = generateTasks(stages);
    const expectedCount = tasks.length;

    await trx('task_templates').del();
    const taskTemplatesDeleted = await trx('task_templates').select('*');

    if (taskTemplatesDeleted.length !== 0) {
      return trx.rollback(`
${red}Not all rows were deleted!
`);
    }
    const tasksInserted = await trx
      .insert(tasks.map(taskDataAdapter.forInsertion.bind(taskDataAdapter)))
      .into('task_templates');
    const rowCount = tasksInserted.rowCount;

    if (rowCount !== expectedCount) {
      return trx.rollback(`
${red}Not all rows were inserted!
${reset}Expected ${yellow}${expectedCount}${reset}, but got ${red}${rowCount}${reset}.

Dump of returned rows:

${JSON.stringify(tasksInserted, null, 4)}
`);
    }
  });
}
