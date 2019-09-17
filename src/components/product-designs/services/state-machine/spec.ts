import { test, Test } from '../../../../test-helpers/fresh';
import createDesign from '../../../../services/create-design';
import createUser = require('../../../../test-helpers/create-user');
import { ProductDesignDataWithMeta } from '../../domain-objects/with-meta';
import { ProductDesignData } from '../../domain-objects/product-designs-new';
import generateDesignEvent from '../../../../test-helpers/factories/design-event';
import { DesignState, determineState } from './index';
import generatePricingCostInput from '../../../../test-helpers/factories/pricing-cost-input';
import generatePricingValues from '../../../../test-helpers/factories/pricing-values';

test('determineState works for designs with no events or cost inputs', async (t: Test) => {
  const { user: u1 } = await createUser({ withSession: false });
  const design = (await createDesign({
    productType: 'TEESHIRT',
    title: 'My cool tee',
    userId: u1.id
  })) as ProductDesignData;
  const designWithData: ProductDesignDataWithMeta = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [],
    events: []
  };
  const state = determineState(designWithData);
  t.deepEqual(state, DesignState.INITIAL, 'Sits at pre-submission state');
});

test('determineState works for a design with events', async (t: Test) => {
  await generatePricingValues();

  const { user: u1 } = await createUser({ withSession: false });
  const design = (await createDesign({
    productType: 'TEESHIRT',
    title: 'My cool tee',
    userId: u1.id
  })) as ProductDesignData;
  const { designEvent: e1 } = await generateDesignEvent({
    createdAt: new Date('2019-04-20'),
    type: 'SUBMIT_DESIGN'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date('2019-04-21'),
    type: 'COMMIT_COST_INPUTS'
  });
  const { designEvent: e3 } = await generateDesignEvent({
    createdAt: new Date('2019-04-22'),
    type: 'COMMIT_QUOTE'
  });
  const { designEvent: e4 } = await generateDesignEvent({
    createdAt: new Date('2019-04-24'),
    type: 'COMMIT_PARTNER_PAIRING'
  });
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    designId: design.id,
    expiresAt: null
  });
  const { pricingCostInput: ci2 } = await generatePricingCostInput({
    designId: design.id,
    expiresAt: new Date('2019-04-23')
  });

  // FLOW 1: Submitting and paying once all the way through.

  // With a submission event
  let designWithData: ProductDesignDataWithMeta = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [],
    events: [e1]
  };
  const state = determineState(designWithData);
  t.deepEqual(state, DesignState.SUBMITTED, 'Sits at pending pricing state');

  // With costing event
  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci1],
    events: [e1, e2]
  };
  const state2 = determineState(designWithData);
  t.deepEqual(state2, DesignState.COSTED, 'Sits at costed state');

  // With an expired cost input
  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci2],
    events: [e1, e2]
  };
  const state3 = determineState(designWithData);
  t.deepEqual(
    state3,
    DesignState.INITIAL,
    'Rolls back to pre-submission state'
  );

  // With an expired cost input but committed quote
  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci2],
    events: [e1, e2, e3]
  };
  const state4 = determineState(designWithData);
  t.deepEqual(state4, DesignState.CHECKED_OUT, 'Continues to checkout state');

  // With an expired cost input but committed quote and committed pairing
  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci2],
    events: [e1, e2, e3, e4]
  };
  const state5 = determineState(designWithData);
  t.deepEqual(state5, DesignState.PAIRED, 'Sits at paired state (final)');

  // FLOW 2: Submitting, getting priced, expiring, and re-submitting.

  const { designEvent: e5 } = await generateDesignEvent({
    createdAt: new Date('2019-04-25'),
    type: 'SUBMIT_DESIGN'
  });
  const { designEvent: e6 } = await generateDesignEvent({
    createdAt: new Date('2019-04-26'),
    type: 'COMMIT_COST_INPUTS'
  });

  // With an expired cost input
  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci2],
    events: [e1, e2, e5]
  };
  const state6 = determineState(designWithData);
  t.deepEqual(state6, DesignState.SUBMITTED, 'Sits at pending pricing state');

  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci2, ci1],
    events: [e1, e2, e5, e6]
  };
  const state7 = determineState(designWithData);
  t.deepEqual(
    state7,
    DesignState.COSTED,
    'Sits at checkout state when committed with new cost inputs'
  );

  // With costing and submitting "out of normal order"
  designWithData = {
    ...design,
    collectionId: 'collection-one',
    costInputs: [ci2],
    events: [e2, e1, e3]
  };
  const state8 = determineState(designWithData);
  t.deepEqual(state8, DesignState.CHECKED_OUT, 'Continues to checkout state');
});
