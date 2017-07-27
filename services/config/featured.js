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
  9726862339, // Gemma coat
  9726876995, // Linda white
  9726887555, // Linda Black
  9707319235, // Flow Tee
  9735618435, // Flow V-Neck
  8645330115, // Wanda Leather Jacket
  8645296067, // Kat Cami Sunrise
  8645323203 // Veda Dress
];

const FEATURED_COLLECTION_LISTS_DEV = [
  {
    sectionTitle: 'Featured Collections',
    collections: [
      {
        id: 419709965,
        title: 'VU-DO'
      },
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
        id: 389467843,
        title: 'Wiz Khalifa × 424 + Pleasures',
        url: 'https://wiz.ca.la'
      },
      {
        id: 373114435,
        title: 'Lyn Paolo',
        url: 'https://cala.app.link/lyncollection'
      },
      {
        id: 374045635,
        title: 'Peter Vu',
        url: 'https://cala.app.link/vucollection'

      },
      {
        id: 294394947,
        title: 'Odyssey Collection',
        url: 'https://cala.app.link/odysseycollection'
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
