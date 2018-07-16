'use strict';

const createUser = require('../../test-helpers/create-user');
const DesignsDAO = require('../product-designs');
const ProductDesignCommentsDAO = require('./index');
const SectionsDAO = require('../product-design-sections');
const { test } = require('../../test-helpers/fresh');

const designFactory = userId => ({
  title: 'My Design',
  productType: 'TEESHIRT',
  userId
});

const sectionFactory = (designId, position) => ({
  title: 'My Section',
  templateName: 'okok',
  position,
  designId
});

const commentFactory = (userId, sectionId) => ({
  text: 'A comment',
  userId,
  sectionId
});

test('ProductDesignComments.findByDesign only returns relevant comments', async (t) => {
  const { user } = await createUser({ withSession: false });

  const design1 = await DesignsDAO.create(designFactory(user.id));
  const design2 = await DesignsDAO.create(designFactory(user.id));

  const section1a = await SectionsDAO.create(sectionFactory(design1.id, 1));
  const section1b = await SectionsDAO.create(sectionFactory(design1.id, 2));
  const section2a = await SectionsDAO.create(sectionFactory(design2.id, 1));
  const section2b = await SectionsDAO.create(sectionFactory(design2.id, 2));

  await ProductDesignCommentsDAO.create(commentFactory(user.id, section1a.id));
  await ProductDesignCommentsDAO.create(commentFactory(user.id, section1b.id));
  await ProductDesignCommentsDAO.create(commentFactory(user.id, section2a.id));
  await ProductDesignCommentsDAO.create(commentFactory(user.id, section2b.id));

  const comments = await ProductDesignCommentsDAO.findByDesign(design1.id);

  t.equal(comments.length, 2);
  t.equal(comments[0].sectionId, section1a.id);
  t.equal(comments[1].sectionId, section1b.id);
});
