import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as db from '../../services/db';
import first from '../../services/first';
import {
  validate,
  validateEvery
} from '../../services/validate-from-db';
import { Process } from '../../domain-objects/pricing';
import PricingCostInput, {
  dataAdapter,
  isPricingCostInputRow,
  PricingCostInputRow
} from '../../domain-objects/pricing-cost-input';

const TABLE_NAME = 'pricing_cost_inputs';

type WithoutProcesses = Omit<PricingCostInputRow, 'processes'>;

export async function create(inputs: PricingCostInput): Promise<PricingCostInput> {
  const rowData = omit({
    id: uuid.v4(),
    ...dataAdapter.forInsertion(inputs)
  }, ['processes']);
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

  return validate(
    TABLE_NAME,
    isPricingCostInputRow,
    dataAdapter,
    created
  );
}

async function attachProcesses(inputs: WithoutProcesses): Promise<any> {
  const processes: Process[] = await db('pricing_cost_input_processes')
    .select(['name', 'complexity'])
    .where({ pricing_cost_input_id: inputs.id });

  return {
    ...inputs,
    processes
  };

}

export async function findById(id: string): Promise<PricingCostInput | null> {
  const withoutProcesses: WithoutProcesses | null = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .first();

  if (!withoutProcesses) {
    return null;
  }

  const inputs = await attachProcesses(withoutProcesses);

  return validate(
    TABLE_NAME,
    isPricingCostInputRow,
    dataAdapter,
    inputs
  );
}

export async function findByDesignId(designId: string): Promise<PricingCostInput[]> {
  const withoutProcesses: WithoutProcesses[] = await db(TABLE_NAME)
    .select('*')
    .where({ design_id: designId, deleted_at: null })
    .orderBy('created_at');

  const inputs = await Promise.all(withoutProcesses.map(attachProcesses));

  return validateEvery(
    TABLE_NAME,
    isPricingCostInputRow,
    dataAdapter,
    inputs
  );
}
