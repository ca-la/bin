import * as ProductDesignCanvasesDAO from '../../dao/product-design-canvases';
import * as ProductDesignImagesDAO from '../../dao/product-design-images';
import * as ProductDesignOptionsDAO from '../../dao/product-design-options';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as ComponentsDAO from '../../dao/components';
import { ComponentType } from '../../domain-objects/component';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('GET /product-design-canvases/:canvasId returns Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    components: [],
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'findById').resolves(data);
  sandbox().stub(ComponentsDAO, 'findById').returns(Promise.resolve([]));

  const [response, body] = await get(`/product-design-canvases/${id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('GET /product-design-canvases/?designId=:designId returns a list of Canvases',
async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = [{
    components: {},
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  }];

  sandbox().stub(ProductDesignCanvasesDAO, 'findAllByDesignId').resolves(data);

  const [response, body] = await get(`/product-design-canvases?designId=${id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('POST /product-design-canvases/ returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'create').resolves(data);

  const [response, body] = await post('/product-design-canvases/', {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PUT /product-design-canvases/:id returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'create').resolves(data);

  const [response, body] = await put(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PUT /product-design-canvases/:id creates a canvas, component and image',
async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const componentId = uuid.v4();
  const imageId = uuid.v4();

  const data = [{
    componentId,
    components: [{
      artworkId: null,
      createdAt: new Date().toISOString(),
      createdBy: session.userId,
      deletedAt: new Date().toISOString(),
      id: componentId,
      image: {
        id: imageId,
        mimeType: 'image/jpg',
        originalHeightPx: 50,
        originalWidthPx: 50,
        title: 'test',
        url: '',
        userId: session.userId
      },
      materialId: null,
      parentId: null,
      sketchId: imageId,
      type: ComponentType.Sketch
    }],
    createdAt: new Date().toISOString(),
    createdBy: session.userId,
    deletedAt: null,
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  }];

  sandbox().stub(ProductDesignCanvasesDAO, 'create').resolves(data);
  sandbox().stub(ProductDesignCanvasesDAO, 'update').resolves(data);
  sandbox().stub(ComponentsDAO, 'create').resolves(data[0].components[0]);
  sandbox().stub(ComponentsDAO, 'findAllByCanvasId').resolves(data[0].components);
  sandbox().stub(ProductDesignImagesDAO, 'create').resolves(data[0].components[0].image);
  sandbox().stub(ProductDesignsDAO, 'findById').resolves({ previewImageUrls: [] });
  sandbox().stub(ProductDesignsDAO, 'update').resolves({ previewImageUrls: [] });

  const [response, body] = await put(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PUT /product-design-canvases/:id creates canvas, component, image, and option',
async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const componentId = uuid.v4();
  const imageId = uuid.v4();
  const optionId = uuid.v4();

  const data = [{
    componentId,
    components: [{
      artworkId: null,
      createdAt: new Date().toISOString(),
      createdBy: session.userId,
      deletedAt: new Date().toISOString(),
      id: componentId,
      image: {
        id: imageId,
        mimeType: 'image/jpg',
        originalHeightPx: 50,
        originalWidthPx: 50,
        title: 'test',
        url: '',
        userId: session.userId
      },
      materialId: imageId,
      option: {
        id: optionId,
        previewImageId: imageId,
        title: 'test',
        type: 'FABRIC',
        userId: session.userId
      },
      parentId: null,
      sketchId: null,
      type: ComponentType.Material
    }],
    createdAt: new Date().toISOString(),
    createdBy: session.userId,
    deletedAt: null,
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  }];

  sandbox().stub(ProductDesignCanvasesDAO, 'create').resolves(data);
  sandbox().stub(ProductDesignOptionsDAO, 'create').resolves(data[0].components[0].option);
  sandbox().stub(ProductDesignCanvasesDAO, 'update').resolves(data);
  sandbox().stub(ComponentsDAO, 'create').resolves(data[0].components[0]);
  sandbox().stub(ComponentsDAO, 'findAllByCanvasId').resolves(data[0].components);
  sandbox().stub(ProductDesignImagesDAO, 'create').resolves(data[0].components[0].image);
  sandbox().stub(ProductDesignsDAO, 'findById').resolves({ previewImageUrls: [] });
  sandbox().stub(ProductDesignsDAO, 'update').resolves({ previewImageUrls: [] });

  const [response, body] = await put(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PATCH /product-design-canvases/:canvasId returns a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'update').resolves(data);

  const [response, body] = await patch(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('DELETE /product-design-canvases/:canvasId deletes a Canvas', async (t: tape.Test) => {
  const { session } = await createUser();

  const id = uuid.v4();

  const data = {
    componentId: null,
    createdAt: '',
    designId: id,
    height: 10,
    id,
    title: 'test',
    width: 10,
    x: 0,
    y: 0
  };

  sandbox().stub(ProductDesignCanvasesDAO, 'del').resolves('');

  const [response] = await del(`/product-design-canvases/${id}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);
});

test('PUT /product-design-canvases/:canvasId/component/:componentId adds a component',
  async (t: tape.Test) => {
    const { session, user } = await createUser();
    const design = await ProductDesignsDAO.create({
      productType: 'TEESHIRT',
      title: 'Rick Tee',
      userId: user.id
    });
    const designCanvas = await ProductDesignCanvasesDAO.create({
      componentId: null,
      createdBy: user.id,
      designId: design.id,
      height: 200,
      title: 'My Rick Owens Tee',
      width: 200,
      x: 0,
      y: 0
    });
    const data = {
      artworkId: null,
      assetLink: 'https://ca.la/images/my-cool-image',
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      deletedAt: null,
      id: uuid.v4(),
      materialId: null,
      parentId: null,
      sketchId: null,
      type: 'Sketch'
    };

    const [response, body] = await put(
      `/product-design-canvases/${designCanvas.id}/component/${data.id}`,
      {
        body: data,
        headers: authHeader(session.id)
      }
    );

    t.equal(response.status, 200);
    const updatedDesign = await ProductDesignsDAO.findById(design.id);
    t.deepEqual(
      updatedDesign && updatedDesign.previewImageUrls,
      [data.assetLink],
      'Adds in the asset as the preview image'
    );
    t.deepEqual(body.components[0], omit(data, 'assetLink'), 'Creates a component');
  }
);

test(`PUT /product-design-canvases/:canvasId/component/:componentId adds a component with a
pre-existing preview image`,
  async (t: tape.Test) => {
    const { session, user } = await createUser();
    const design = await ProductDesignsDAO.create({
      previewImageUrls: ['another-image.png'],
      productType: 'TEESHIRT',
      title: 'Rick Tee',
      userId: user.id
    });
    const designCanvas = await ProductDesignCanvasesDAO.create({
      componentId: null,
      createdBy: user.id,
      designId: design.id,
      height: 200,
      title: 'My Rick Owens Tee',
      width: 200,
      x: 0,
      y: 0
    });
    const data = {
      artworkId: null,
      assetLink: 'https://ca.la/images/my-cool-image',
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      deletedAt: null,
      id: uuid.v4(),
      materialId: null,
      parentId: null,
      sketchId: null,
      type: 'Sketch'
    };

    const [response, body] = await put(
      `/product-design-canvases/${designCanvas.id}/component/${data.id}`,
      {
        body: data,
        headers: authHeader(session.id)
      }
    );

    t.equal(response.status, 200);
    const updatedDesign = await ProductDesignsDAO.findById(design.id);
    t.deepEqual(
      updatedDesign && updatedDesign.previewImageUrls,
      ['another-image.png', data.assetLink],
      'Adds in the asset as the preview image'
    );
    t.deepEqual(body.components[0], omit(data, 'assetLink'), 'Creates a component');
  }
);
