import * as Knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';

import * as config from '../../config';
import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset, yellow } from '../../services/colors';

import Process, { dataAdapter } from '../../components/processes/domain-object';
import { ComponentType } from '../../domain-objects/component';

const processes: Process[] = [
  {
    componentType: ComponentType.Sketch,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Wash',
    ordering: 0
  },
  {
    componentType: ComponentType.Sketch,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Distress',
    ordering: 1
  },
  {
    componentType: ComponentType.Sketch,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Over-Dye',
    ordering: 2
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Placed Print',
    ordering: 0
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Embroidery',
    ordering: 1
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Heat Transfer',
    ordering: 2
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Vinyl',
    ordering: 3
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Emboss',
    ordering: 4
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Deboss',
    ordering: 5
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Beading',
    ordering: 6
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Applique',
    ordering: 7
  },
  {
    componentType: ComponentType.Artwork,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Sequins',
    ordering: 8
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Wash',
    ordering: 0
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Dye',
    ordering: 1
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Repeating Print',
    ordering: 2
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Distress',
    ordering: 3
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Embroidery',
    ordering: 4
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Beading',
    ordering: 5
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Applique',
    ordering: 6
  },
  {
    componentType: ComponentType.Material,
    createdAt: new Date(),
    createdBy: config.CALA_OPS_USER_ID,
    deletedAt: null,
    id: uuid.v4(),
    name: 'Sequins',
    ordering: 7
  }
];

insertProcesses()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch((err: any): void => {
    log(`${red}ERROR:\n${reset}`, err);
    process.exit(1);
  });

async function insertProcesses(): Promise<void> {
  const expectedCount = processes.length;

  return db.transaction(async (trx: Knex.Transaction) => {
    const processesInserted = await trx.insert(
      processes.map(dataAdapter.forInsertion.bind(dataAdapter))
    ).into('processes');
    const rowCount = processesInserted.rowCount;

    if (rowCount !== expectedCount) {
      return trx.rollback(`
${red}Not all rows were inserted!
${reset}Expected ${yellow}${expectedCount}${reset}, but got ${red}${rowCount}${reset}.

Dump of returned rows:

${JSON.stringify(processesInserted, null, 4)}
`);
    }
  });
}
