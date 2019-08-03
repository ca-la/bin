import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { deleteById, findById } from '../../dao/product-designs/index';
import {
  findAllDesignsThroughCollaborator,
  findDesignByAnnotationId,
  findDesignByTaskId
} from './dao';
import { del as deleteCanvas } from '../../components/canvases/dao';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import { deleteById as deleteAnnotation } from '../../components/product-design-canvas-annotations/dao';
import * as CollectionsDAO from '../../components/collections/dao';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../test-helpers/factories/component';
import generateCollection from '../../test-helpers/factories/collection';

import createDesign from '../../services/create-design';
import { CollaboratorWithUser } from '../../components/collaborators/domain-objects/collaborator';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateAnnotation from '../../test-helpers/factories/product-design-canvas-annotation';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';
import generateTask from '../../test-helpers/factories/task';
import generateAsset from '../../test-helpers/factories/asset';

test('ProductDesignCanvases DAO supports creation/retrieval, enriched with image links', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { asset: sketch } = await generateAsset({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'FooBar.png',
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
  const result = await findById(design.id);
  if (!result) {
    throw new Error('Design should have been created!');
  }
  t.deepEqual(
    result.imageIds,
    [sketch.id],
    'Returns the associated image ids for the design'
  );
  t.ok(
    result.previewImageUrls && result.previewImageUrls[0].includes(sketch.id),
    'The preview image urls are the same as the image links'
  );

  if (!result.imageLinks) {
    throw new Error('Design should have image links!');
  }
  const { previewLink, thumbnailLink } = result.imageLinks[0];
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

  const designs = await findAllDesignsThroughCollaborator(user.id);
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

  const designsAgain = await findAllDesignsThroughCollaborator(user.id);
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
