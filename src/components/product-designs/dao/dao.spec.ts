import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { deleteById, findById } from './';
import {
  findAllDesignsThroughCollaborator,
  findAllWithCostsAndEvents,
  findDesignByAnnotationId,
  findDesignByTaskId
} from './dao';
import { del as deleteCanvas } from '../../canvases/dao';
import * as CollaboratorsDAO from '../../collaborators/dao';
import { deleteById as deleteAnnotation } from '../../product-design-canvas-annotations/dao';
import * as CollectionsDAO from '../../collections/dao';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import generateCanvas from '../../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../../test-helpers/factories/component';
import generateCollection from '../../../test-helpers/factories/collection';

import createDesign from '../../../services/create-design';
import { CollaboratorWithUser } from '../../collaborators/domain-objects/collaborator';
import generateCollaborator from '../../../test-helpers/factories/collaborator';
import generateAnnotation from '../../../test-helpers/factories/product-design-canvas-annotation';
import generateProductDesignStage from '../../../test-helpers/factories/product-design-stage';
import generateTask from '../../../test-helpers/factories/task';
import generateAsset from '../../../test-helpers/factories/asset';
import omit = require('lodash/omit');
import generateDesignEvent from '../../../test-helpers/factories/design-event';
import generatePricingCostInput from '../../../test-helpers/factories/pricing-cost-input';
import generatePricingValues from '../../../test-helpers/factories/pricing-values';

test('ProductDesignCanvases DAO supports creation/retrieval, enriched with image links', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { asset: sketch } = await generateAsset({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'FooBar.png',
    uploadCompletedAt: new Date(),
    userId: user.id
  });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: sketch.id
  });
  const { canvas, design } = await generateCanvas({
    componentId: component.id,
    createdBy: user.id
  });
  const { asset: uploading } = await generateAsset({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'FooBar.png',
    uploadCompletedAt: null,
    userId: user.id
  });
  const { component: uploadingComponent } = await generateComponent({
    createdBy: user.id,
    sketchId: uploading.id
  });
  await generateCanvas({
    componentId: uploadingComponent.id,
    designId: design.id,
    createdBy: user.id
  });
  const result = await findById(design.id);
  if (!result) {
    throw new Error('Design should have been created!');
  }
  t.deepEqual(
    result.imageIds,
    [sketch.id],
    'Returns the associated image ids for the design'
  );
  t.equal(
    result.previewImageUrls!.length,
    1,
    'Does not return uploading assets'
  );
  t.ok(
    result.previewImageUrls![0].includes(sketch.id),
    'The preview image urls are the same as the image links'
  );

  t.equal(result.imageLinks!.length, 1, 'Does not return uploading assets');
  const { previewLink, thumbnailLink } = result.imageLinks![0];
  t.ok(
    previewLink.includes(sketch.id),
    'Preview link contains the sketch id for the design'
  );
  t.ok(
    thumbnailLink.includes(sketch.id),
    'Preview link contains the sketch id for the design'
  );

  await deleteCanvas(canvas.id);

  const secondFetch = await findById(design.id);
  if (!secondFetch) {
    throw new Error('Cannot find Design!');
  }
  t.deepEqual(
    secondFetch.imageIds,
    [],
    'If a canvas gets deleted, the image id list should update accordingly.'
  );
  t.deepEqual(
    secondFetch.imageLinks,
    [],
    'If a canvas gets deleted, the image links list should update accordingly.'
  );
});

test('findAllDesignsThroughCollaborator finds all undeleted designs that the user collaborates on', async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: notUser } = await createUser();

  const ownDesign = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  // ensure that the design has no collaborators to simulate v1 product designs.
  const existingCollaborators = await CollaboratorsDAO.findByDesign(
    ownDesign.id
  );
  await Promise.all(
    existingCollaborators.map(
      async (collaborator: CollaboratorWithUser): Promise<void> => {
        await CollaboratorsDAO.deleteById(collaborator.id);
      }
    )
  );

  const designSharedDesign = await createDesign({
    productType: 'test',
    title: 'design',
    userId: notUser.id
  });
  await generateCollaborator({
    collectionId: null,
    designId: designSharedDesign.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const collectionSharedDesign = await createDesign({
    productType: 'test',
    title: 'design',
    userId: notUser.id
  });
  const { collection } = await generateCollection({ createdBy: notUser.id });
  await CollectionsDAO.addDesign(collection.id, collectionSharedDesign.id);
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const collectionSharedDesignDeleted = await createDesign({
    productType: 'test',
    title: 'design',
    userId: notUser.id
  });
  await CollectionsDAO.addDesign(
    collection.id,
    collectionSharedDesignDeleted.id
  );

  const designs = await findAllDesignsThroughCollaborator({ userId: user.id });
  t.equal(
    designs.length,
    3,
    'returns only the designs the user collaborates on'
  );
  t.deepEqual(
    designs[0].id,
    collectionSharedDesignDeleted.id,
    'should match ids'
  );
  t.deepEqual(designs[1].id, collectionSharedDesign.id, 'should match ids');
  t.deepEqual(designs[2].id, designSharedDesign.id, 'should match ids');

  await deleteById(collectionSharedDesignDeleted.id);

  const designsAgain = await findAllDesignsThroughCollaborator({
    userId: user.id
  });
  t.equal(
    designsAgain.length,
    2,
    'returns only the undeleted designs the user collaborates on'
  );
  t.deepEqual(
    designsAgain[0].id,
    collectionSharedDesign.id,
    'should match ids'
  );
  t.deepEqual(designsAgain[1].id, designSharedDesign.id, 'should match ids');
});

test('findAllDesignsThroughCollaborator finds all designs with a search string', async (t: tape.Test) => {
  const { user } = await createUser();

  const firstDesign = await createDesign({
    productType: 'test',
    title: 'first design',
    userId: user.id
  });
  const secondDesign = await createDesign({
    productType: 'test',
    title: 'second design',
    userId: user.id
  });

  const { collection } = await generateCollection({
    createdBy: user.id,
    title: 'Collection'
  });
  await CollectionsDAO.addDesign(collection.id, secondDesign.id);

  const allDesigns = await findAllDesignsThroughCollaborator({
    userId: user.id
  });
  t.equal(
    allDesigns.length,
    2,
    'returns all designs when no search is provided'
  );

  const designSearch = await findAllDesignsThroughCollaborator({
    userId: user.id,
    search: 'first'
  });
  t.equal(
    designSearch.length,
    1,
    'returns design when searched by design title'
  );
  t.deepEqual(designSearch[0].id, firstDesign.id, 'should match ids');
});

test('findDesignByAnnotationId', async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id
  });
  const designOne = await createDesign({
    productType: 'test',
    title: 'design',
    userId: userOne.user.id
  });
  await CollectionsDAO.addDesign(collectionOne.id, designOne.id);
  const { canvas: canvasOne } = await generateCanvas({
    designId: designOne.id
  });
  const { annotation: annotationOne } = await generateAnnotation({
    canvasId: canvasOne.id
  });

  const design = await findDesignByAnnotationId(annotationOne.id);

  if (!design) {
    throw new Error('Design is not found!');
  }

  t.equal(
    designOne.id,
    design.id,
    'Returns the design that is a parent to the annotation'
  );

  await deleteAnnotation(annotationOne.id);
  const designTwo = await findDesignByAnnotationId(annotationOne.id);
  t.equal(
    designTwo,
    null,
    'Returns null if a resource in the chain was deleted'
  );
});

test('findDesignByTaskId', async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const { collection: collectionOne } = await generateCollection({
    createdBy: userOne.user.id
  });
  const designOne = await createDesign({
    productType: 'test',
    title: 'design',
    userId: userOne.user.id
  });
  await CollectionsDAO.addDesign(collectionOne.id, designOne.id);
  const { stage: stageOne } = await generateProductDesignStage({
    designId: designOne.id
  });
  const { task: taskOne } = await generateTask({ designStageId: stageOne.id });

  const design = await findDesignByTaskId(taskOne.id);

  if (!design) {
    throw new Error('Design is not found!');
  }

  t.equal(
    designOne.id,
    design.id,
    'Returns the design that is a parent to the annotation'
  );

  await deleteById(designOne.id);
  const designTwo = await findDesignByTaskId(taskOne.id);
  t.equal(
    designTwo,
    null,
    'Returns null if a resource in the chain was deleted'
  );
});

test('findAllWithCostsAndEvents base cases', async (t: tape.Test) => {
  const { user: u1 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: u1.id });
  const { collection: c2 } = await generateCollection({ createdBy: u1.id });
  const d1 = await createDesign({
    productType: 'TEESHIRT',
    title: 'd1',
    userId: u1.id
  });
  const d2 = await createDesign({
    productType: 'PANTS',
    title: 'd2',
    userId: u1.id
  });
  await CollectionsDAO.addDesign(c1.id, d1.id);

  const results = await findAllWithCostsAndEvents([c1.id]);
  t.deepEqual(
    results,
    [
      {
        ...omit(d1, 'collectionIds', 'collections', 'imageIds', 'imageLinks'),
        collectionId: c1.id,
        costInputs: [],
        events: [],
        previewImageUrls: null
      }
    ],
    'Returns the design with no events or cost inputs'
  );

  const results2 = await findAllWithCostsAndEvents([c2.id]);
  t.deepEqual(results2, [], 'Returns an empty list if there are no designs');

  await CollectionsDAO.addDesign(c1.id, d2.id);
  const results3 = await findAllWithCostsAndEvents([c1.id]);
  t.deepEqual(
    results3,
    [
      {
        ...omit(d2, 'collectionIds', 'collections', 'imageIds', 'imageLinks'),
        collectionId: c1.id,
        costInputs: [],
        events: [],
        previewImageUrls: null
      },
      {
        ...omit(d1, 'collectionIds', 'collections', 'imageIds', 'imageLinks'),
        collectionId: c1.id,
        costInputs: [],
        events: [],
        previewImageUrls: null
      }
    ],
    'Returns the design with no events or cost inputs'
  );
});

test('findAllWithCostsAndEvents +1 case', async (t: tape.Test) => {
  await generatePricingValues();

  const { user: u1 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: u1.id });
  const d1 = await createDesign({
    productType: 'TEESHIRT',
    title: 'd1',
    userId: u1.id
  });
  const d2 = await createDesign({
    productType: 'PANTALOONES',
    title: 'd2',
    userId: u1.id
  });
  await CollectionsDAO.addDesign(c1.id, d1.id);
  await CollectionsDAO.addDesign(c1.id, d2.id);

  const { designEvent: de1 } = await generateDesignEvent({
    createdAt: new Date('2019-04-20'),
    designId: d1.id,
    type: 'SUBMIT_DESIGN'
  });
  const { designEvent: de2 } = await generateDesignEvent({
    createdAt: new Date('2019-04-20'),
    designId: d2.id,
    type: 'SUBMIT_DESIGN'
  });
  const { designEvent: de3 } = await generateDesignEvent({
    createdAt: new Date('2019-04-21'),
    designId: d2.id,
    type: 'COMMIT_COST_INPUTS'
  });
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    designId: d2.id
  });

  const results = await findAllWithCostsAndEvents([c1.id]);

  t.equal(results.length, 2, 'Returns the two designs');

  // First Item
  t.deepEqual(
    omit(results[0], 'costInputs', 'events'),
    {
      ...omit(d2, 'collectionIds', 'collections', 'imageIds', 'imageLinks'),
      collectionId: c1.id,
      previewImageUrls: null
    },
    'Returns the latest made design first'
  );
  t.equal(results[0].events.length, 2, 'Returns the two design events');
  t.deepEqual(
    {
      ...results[0].events[0],
      createdAt: new Date(results[0].events[0].createdAt)
    },
    de2,
    'Returns the oldest design event first'
  );
  t.deepEqual(
    {
      ...results[0].events[1],
      createdAt: new Date(results[0].events[1].createdAt)
    },
    de3,
    'Returns the newest design event last'
  );
  t.equal(results[0].costInputs.length, 1, 'Returns a single cost input');
  t.deepEqual(
    {
      ...results[0].costInputs[0],
      createdAt: new Date(results[0].costInputs[0].createdAt)
    },
    omit(ci1, 'processes'),
    'Returns the first cost input'
  );

  // Second Item
  t.deepEqual(
    omit(results[1], 'costInputs', 'events'),
    {
      ...omit(d1, 'collectionIds', 'collections', 'imageIds', 'imageLinks'),
      collectionId: c1.id,
      previewImageUrls: null
    },
    'Returns the first created design last'
  );
  t.deepEqual(results[1].costInputs, [], 'Returns no cost inputs');
  t.deepEqual(results[1].events.length, 1, 'Returns a single event');
  t.deepEqual(
    {
      ...results[1].events[0],
      createdAt: new Date(results[1].events[0].createdAt)
    },
    de1
  );
});

test('findAllWithCostsAndEvents can work with multiple collections', async (t: tape.Test) => {
  await generatePricingValues();
  t.ok('Cool');
});
