'use strict';

// TODO: Long term, we probably want to move these into the database. The shape
// of the data we want here is pretty in flux though.

const FEATURED_PRODUCT_IDS_DEV = [
  8564586765,
  8564595021,
  8564584909,
  8564587597
];

const FEATURED_PRODUCT_IDS_PROD = [
  7413370755, // Pierce Bomber
  8645330115, // Wanda Leather Jacket
  8645370051, // Pitch Mens Jacket
  8645323203, // Veda Dress
  7413088067, // Morgan Blouse (blue)
  8645286275 // Kat Cami
];

const FEATURED_COLLECTION_LISTS_DEV = [
  {
    sectionTitle: 'Featured Collections',
    collections: [
      {
        id: 273845633,
        title: 'Collection 01'
      },
      {
        id: 291239617,
        title: 'Odyssey'
      }
    ]
  },
  {
    sectionTitle: 'More Collections',
    collections: [
      {
        id: 411296525,
        title: 'Preorders',
        description: 'Coming soon'
      },
      {
        id: 411296781,
        title: 'Not-yet-orders',
        description: 'Coming a little later'
      }
    ]
  }
];

const FEATURED_COLLECTION_LISTS_PROD = [
  {
    sectionTitle: 'Featured Collections',
    collections: [
      {
        id: 294394947,
        title: 'Odyssey Collection'
      },
      {
        id: 259658627,
        title: 'Collection 01'
      }
    ]
  }
];

module.exports = {
  FEATURED_COLLECTION_LISTS_DEV,
  FEATURED_COLLECTION_LISTS_PROD,
  FEATURED_PRODUCT_IDS_DEV,
  FEATURED_PRODUCT_IDS_PROD
};
