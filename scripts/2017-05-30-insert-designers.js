'use strict';

const DesignersDAO = require('../dao/designers');
const Logger = require('../services/logger');

const data = [
  {
    name: 'Anthony Cucculelli',
    bioHtml: `Growing up with a nomadic childhood, Anthony Cucculelli ended up in New York City in the early 2000s studying at Parsons School of Design before embarking on his career at Diane von Furstenberg and Yigal Azrouel, among others. In 2012, he relocated to Florence, Italy to work at Roberto Cavalli, and spent the next few years learning the art of Italian craftsmanship. He is also a photographer and head of his creative studio, Cucculelli Shaheen, based in New York City.`,
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
        photoUrl: 'https://cdn.shopify.com/s/files/1/1373/8933/products/L_2.jpg?v=1474925784<F37>',
        position: 4
      }
    ]
  },
  {
    name: 'Peter Vu',
    bioHtml: `Whether it's painting, drawing, or sculpting, Peter Vu dabbles in many disciplines when it comes to art and design. With a background in architecture and illustration, Peter has been utilizing both work and life experiences to propel his artwork. In the past, he has worked on architectural projects for Frank Gehry associates and Morphosis and has done illustrations for Apple, Alfa Romeo, and Nike. In pursuit of his next chapter, Peter is now emerging into the art scene with painted murals in Los Angeles, New York, and Miami.`,
    position: 2
  },
  {
    name: 'Lyn Paolo',
    bioHtml: `Lyn Paolo is one of the most iconic and sought-after Costume Designers in Hollywood today, with credits in hit TV series to major films. An Emmy® Award winning Costume Designer, Lyn Paolo is the force behind the impeccably dressed Olivia Pope on the ABC-TV hit television series "Scandal", created by Shonda Rhimes and starring Kerry Washington. She's also the designer of "How to Get Away With Murder", "Shameless", and "Animal Kingdom". Prior, Lyn spent 15 years as costume designer of "ER" and also designed "The West Wing" and "Homefront", among countless others.`,
    position: 3
  },
  {
    name: 'Wiz Khalifa',
    bioHtml: `American rapper, songwriter and actor Wiz Khalifa is now adding fashion designer to his résumé, creating his first unisex capsule collection in collaboration with Los Angeles-based labels 424 and Pleasures.`,
    position: 4
  }
];

return Promise.all(
  data.map((designer) => {
  });
  DesignersDA
)
  .then(() => {
    Logger.log('Complete, exiting);
    process.exit(0);
  });
