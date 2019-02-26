'use strict';

const DesignersDAO = require('../../dao/designers');
const DesignerPhotosDAO = require('../../dao/designer-photos');
const Logger = require('../../services/logger');

/* eslint-disable quotes */
const designers = [
  {
    name: 'Anthony Cucculelli',
    bioHtml: `Growing up with a nomadic childhood, Anthony Cucculelli ended up in New York City in the early 2000s studying at Parsons School of Design before embarking on his career at Diane von Furstenberg and Yigal Azrouel, among others. In 2012, he relocated to Florence, Italy to work at Roberto Cavalli, and spent the next few years learning the art of Italian craftsmanship. He is also a photographer and head of his creative studio, Cucculelli Shaheen, based in New York City.`,
    instagramHandle: 'anthonycucculelli',
    position: 1,
    photos: [
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/L_1.jpg?v=1474925784',
        position: 1
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/Detail_1_3608bfcf-c0de-4b37-9ac1-691d6ec0adfe.jpg?v=1474925784',
        position: 2
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/Detail_2_1cd5fb2d-5d1a-4fcd-a383-2f8d2c184dc6.jpg?v=1474925784',
        position: 3
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/L_2.jpg?v=1474925784',
        position: 4
      }
    ]
  },
  {
    name: 'Peter Vu',
    bioHtml: `Whether it's painting, drawing, or sculpting, Peter Vu dabbles in many disciplines when it comes to art and design. With a background in architecture and illustration, Peter has been utilizing both work and life experiences to propel his artwork. In the past, he has worked on architectural projects for Frank Gehry associates and Morphosis and has done illustrations for Apple, Alfa Romeo, and Nike. In pursuit of his next chapter, Peter is now emerging into the art scene with painted murals in Los Angeles, New York, and Miami.`,
    position: 2,
    instagramHandle: 'vu_do_child',
    photos: [
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/vu_bio.jpg?v=1490041059',
        position: 1
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/photo1.jpg?v=1490041060',
        position: 2
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/photo_2.jpg?v=1490041060',
        position: 3
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/photo_3.jpg?v=1490041061',
        position: 4
      }
    ]
  },
  {
    name: 'Lyn Paolo',
    bioHtml: `Lyn Paolo is one of the most iconic and sought-after Costume Designers in Hollywood today, with credits in hit TV series to major films. An Emmy® Award winning Costume Designer, Lyn Paolo is the force behind the impeccably dressed Olivia Pope on the ABC-TV hit television series "Scandal", created by Shonda Rhimes and starring Kerry Washington. She's also the designer of "How to Get Away With Murder", "Shameless", and "Animal Kingdom". Prior, Lyn spent 15 years as costume designer of "ER" and also designed "The West Wing" and "Homefront", among countless others.`,
    position: 3,
    instagramHandle: 'lynpaolo',
    twitterHandle: 'lynpaolo',
    photos: [
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/Lyn_1.jpg?v=1495553623',
        position: 1
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/unspecified.jpg?v=1495553623',
        position: 2
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/IMG_8137.jpg?v=1495553623',
        position: 3
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/Group_of_3.jpg?v=1495553623',
        position: 4
      },
      {
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/Lyn_4.jpg?v=1495553623',
        position: 5
      }
    ]
  },
  {
    name: 'Wiz Khalifa',
    bioHtml: `American rapper, songwriter and actor Wiz Khalifa is now adding fashion designer to his résumé, creating his first unisex capsule collection in collaboration with Los Angeles-based labels 424 and Pleasures.`,
    position: 4,
    twitterHandle: 'wizkhalifa',
    instagramHandle: 'wizkhalifa',
    photos: [
      {
        photoUrl: 'https://static.ca.la/WizKhalifa.jpg',
        position: 1
      }
    ]
  }
];
/* eslint-enable quotes */

function createPhotos(designerId, photos) {
  return Promise.all(
    photos.map((photoData) => {
      const data = Object.assign({}, photoData, {
        designerId
      });

      return DesignerPhotosDAO.create(data)
        .then((photo) => {
          Logger.log(`Created photo ${photo.id} for designer ${designerId}`);
        });
    })
  );
}

Promise.all(
  designers.map((designerData) => {
    return DesignersDAO.create(designerData)
      .then((designer) => {
        Logger.log(`Created designer ${designer.id}`);
        return createPhotos(designer.id, designerData.photos);
      });
  })
)
  .then(() => {
    Logger.log('Complete, exiting');
    process.exit(0);
  });
