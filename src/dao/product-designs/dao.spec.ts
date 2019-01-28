import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { test } from '../../test-helpers/fresh';
import { findById } from './index';
import createUser = require('../../test-helpers/create-user');
import { create as createSketch } from '../../dao/product-design-images';
import { del as deleteCanvas } from '../../dao/product-design-canvases';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateComponent from '../../test-helpers/factories/component';

test(
  'ProductDesignCanvases DAO supports creation/retrieval, enriched with image links',
  async (t: tape.Test) => {
    const { user } = await createUser({ withSession: false });

    const sketch = await createSketch({
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
