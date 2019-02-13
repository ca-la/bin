import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { deleteById, findById } from './index';
import { findAllDesignsThroughCollaborator } from './dao';
import { create as createImage } from '../../components/images/dao';
import { del as deleteCanvas } from '../../dao/product-design-canvases';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as CollectionsDAO from '../../dao/collections';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../test-helpers/factories/component';
import generateCollection from '../../test-helpers/factories/collection';

import createDesign from '../../services/create-design';
import { CollaboratorWithUser } from '../../components/collaborators/domain-objects/collaborator';

test(
  'ProductDesignCanvases DAO supports creation/retrieval, enriched with image links',
  async (t: tape.Test) => {
    const { user } = await createUser({ withSession: false });

    const sketch = await createImage({
      description: '',
      id: uuid.v4(),
      mimeType: 'image/png',
      originalHeightPx: 0,
      originalWidthPx: 0,
      title: 'FooBar.png',
      userId: user.id
    });
    const { component } = await generateComponent({ createdBy: user.id, sketchId: sketch.id });
    const { canvas, design } = await generateCanvas({
      componentId: component.id,
      createdBy: user.id
    });
    const result = await findById(design.id);
    if (!result) { throw new Error('Design should have been created!'); }
    t.deepEqual(result.imageIds, [sketch.id], 'Returns the associated image ids for the design');
    t.ok(
      result.previewImageUrls && result.previewImageUrls[0].includes(sketch.id),
      'The preview image urls are the same as the image links'
    );

    if (!result.imageLinks) { throw new Error('Design should have image links!'); }
    const { previewLink, thumbnailLink } = result.imageLinks[0];
    t.ok(previewLink.includes(sketch.id), 'Preview link contains the sketch id for the design');
    t.ok(thumbnailLink.includes(sketch.id), 'Preview link contains the sketch id for the design');

    await deleteCanvas(canvas.id);

    const secondFetch = await findById(design.id);
    if (!secondFetch) { throw new Error('Cannot find Design!'); }
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
  }
);

test(
  'findAllDesignsThroughCollaborator finds all undeleted designs that the user collaborates on',
  async (t: tape.Test) => {
    const { user } = await createUser();
    const { user: notUser } = await createUser();

    const ownDesign = await createDesign({ productType: 'test', title: 'design', userId: user.id });
    // ensure that the design has no collaborators to simulate v1 product designs.
    const existingCollaborators = await CollaboratorsDAO.findByDesign(ownDesign.id);
    await Promise.all(existingCollaborators.map(
      async (collaborator: CollaboratorWithUser): Promise<void> => {
        await CollaboratorsDAO.deleteById(collaborator.id);
      })
    );

    const designSharedDesign = await createDesign(
      { productType: 'test', title: 'design', userId: notUser.id });
    await CollaboratorsDAO.create({
      collectionId: null,
      designId: designSharedDesign.id,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: user.id
    });

    const collectionSharedDesign = await createDesign(
      { productType: 'test', title: 'design', userId: notUser.id });
    const { collection } = await generateCollection({ createdBy: notUser.id });
    await CollectionsDAO.addDesign(collection.id, collectionSharedDesign.id);
    await CollaboratorsDAO.create({
      collectionId: collection.id,
      designId: null,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: user.id
    });

    const collectionSharedDesignDeleted = await createDesign(
      { productType: 'test', title: 'design', userId: notUser.id }
    );
    await CollectionsDAO.addDesign(collection.id, collectionSharedDesignDeleted.id);

    const designs = await findAllDesignsThroughCollaborator(user.id);
    t.equal(designs.length, 3, 'returns only the designs the user collaborates on');
    t.deepEqual(designs[0].id, collectionSharedDesignDeleted.id, 'should match ids');
    t.deepEqual(designs[1].id, collectionSharedDesign.id, 'should match ids');
    t.deepEqual(designs[2].id, designSharedDesign.id, 'should match ids');

    await deleteById(collectionSharedDesignDeleted.id);

    const designsAgain = await findAllDesignsThroughCollaborator(user.id);
    t.equal(designsAgain.length, 2, 'returns only the undeleted designs the user collaborates on');
    t.deepEqual(designsAgain[0].id, collectionSharedDesign.id, 'should match ids');
    t.deepEqual(designsAgain[1].id, designSharedDesign.id, 'should match ids');
  }
);
