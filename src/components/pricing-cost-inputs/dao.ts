import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import { omit } from 'lodash';

import * as db from '../../services/db';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { Process } from '../../domain-objects/pricing';
import PricingCostInput, {
  dataAdapter,
  dataAdapterWithoutVersions,
  isPricingCostInputRow,
  PricingCostInputRow,
  PricingCostInputWithoutVersions
} from './domain-object';

const TABLE_NAME = 'pricing_cost_inputs';

type WithoutProcesses = Omit<PricingCostInputRow, 'processes'>;

export async function create(
  inputs: PricingCostInputWithoutVersions
): Promise<PricingCostInput> {
  const { rows } = await db.raw(`
SELECT (
  SELECT MAX(version) FROM pricing_process_timelines
) as process_timelines_version, (
  SELECT MAX(version) FROM pricing_care_labels
) as care_labels_version, (
  SELECT MAX(version) FROM pricing_product_materials
) as product_materials_version, (
  SELECT MAX(version) FROM pricing_product_types
) as product_type_version, (
  SELECT MAX(version) FROM pricing_margins
) as margin_version, (
  SELECT MAX(version) FROM pricing_constants
) as constants_version, (
  SELECT MAX(version) FROM pricing_processes
) as processes_version

FROM pricing_product_types
LIMIT 1;
  `);

  if (!rows[0]) {
    throw new Error('No pricing inputs found!');
  }

  const [
    {
      process_timelines_version,
      care_labels_version,
      product_materials_version,
      product_type_version,
      margin_version,
      constants_version,
      processes_version
    }
  ] = rows;
  const rowData = omit(
    {
      id: uuid.v4(),
      ...dataAdapterWithoutVersions.forInsertion(inputs),
      process_timelines_version,
      processes_version,
      care_labels_version,
      product_materials_version,
      product_type_version,
      margin_version,
      constants_version
    },
    ['processes']
  );
  const inputsCreated: WithoutProcesses | undefined = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((maybeInputs: WithoutProcesses[]) => first(maybeInputs));

  if (!inputsCreated) {
    throw new Error('Failed to create rows');
  }

  const processRowData = inputs.processes.map((process: Process) => {
    return {
      id: uuid.v4(),
      pricing_cost_input_id: inputsCreated.id,
      ...process
    };
  });
  const processesCreated: Process[] = await db('pricing_cost_input_processes')
    .insert(processRowData)
    .returning(['name', 'complexity']);

  const created = {
    ...inputsCreated,
    processes: processesCreated
  };

  return validate(TABLE_NAME, isPricingCostInputRow, dataAdapter, created);
}

async function attachProcesses(
  inputs: WithoutProcesses
): Promise<PricingCostInputRow> {
  const processes: Process[] = await db('pricing_cost_input_processes')
    .select(['name', 'complexity'])
    .where({ pricing_cost_input_id: inputs.id })
    .orderBy('name', 'desc');

  return {
    ...inputs,
    processes
  };
}

export async function findById(id: string): Promise<PricingCostInput | null> {
  const withoutProcesses: WithoutProcesses | null = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .andWhereRaw('(expires_at IS null OR expires_at > now())')
    .first();

  if (!withoutProcesses) {
    return null;
  }

  const inputs = await attachProcesses(withoutProcesses);

  return validate(TABLE_NAME, isPricingCostInputRow, dataAdapter, inputs);
}

export async function findByDesignId(options: {
  designId: string;
  showExpired?: boolean;
  trx?: Knex.Transaction;
}): Promise<PricingCostInput[]> {
  const { designId, showExpired, trx } = options;

  const withoutProcesses: WithoutProcesses[] = await db(TABLE_NAME)
    .select('*')
    .where({ design_id: designId, deleted_at: null })
    .orderBy('created_at', 'DESC')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
      if (!showExpired) {
        query.andWhereRaw('(expires_at IS null OR expires_at > now())');
      }
    });
  const inputs: PricingCostInputRow[] = [];

  for (const costInput of withoutProcesses) {
    const input = await attachProcesses(costInput);
    inputs.push(input);
  }

  return validateEvery(TABLE_NAME, isPricingCostInputRow, dataAdapter, inputs);
}

/**
 * Sets the expiration date for all cost inputs with the given design ids.
 */
export async function expireCostInputs(
  designIds: string[],
  expiresAt: Date,
  trx: Knex.Transaction
): Promise<PricingCostInput[]> {
  const costInputs: WithoutProcesses[] = await db(TABLE_NAME)
    .where({ deleted_at: null, expires_at: null })
    .whereIn('design_id', designIds)
    .update({ expires_at: expiresAt }, '*')
    .transacting(trx);

  const inputs: PricingCostInputRow[] = [];

  for (const costInput of costInputs) {
    const input = await attachProcesses(costInput);
    inputs.push(input);
  }

  return validateEvery<PricingCostInputRow, PricingCostInput>(
    TABLE_NAME,
    isPricingCostInputRow,
    dataAdapter,
    inputs
  );
}
