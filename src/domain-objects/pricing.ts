export type Complexity = "BLANK" | "SIMPLE" | "MEDIUM" | "COMPLEX";

export type MaterialCategory =
  | "SPECIFY"
  | "BASIC"
  | "STANDARD"
  | "LUXE"
  | "ULTRA_LUXE";

export type Process =
  | {
      name: "SCREEN_PRINTING";
      complexity:
        | "1_COLOR"
        | "2_COLORS"
        | "3_COLORS"
        | "4_COLORS"
        | "5_COLORS"
        | "6_COLORS"
        | "7_COLORS"
        | "8_COLORS"
        | "9_COLORS";
    }
  | {
      name: "EMBROIDERY";
      complexity: "SMALL" | "MEDIUM" | "LARGE";
    }
  | {
      name: "WASH";
      complexity: Complexity;
    }
  | {
      name: "DYE";
      complexity: Complexity;
    }
  | {
      name: "DISTRESS";
      complexity: Complexity;
    }
  | {
      name: "EMBELLISH";
      complexity: Complexity;
    };

export function isProcess(candidate: object): candidate is Process {
  const keyset = new Set(Object.keys(candidate));
  return ["name", "complexity"].every(keyset.has.bind(keyset));
}

export const validProductTypes = [
  "ACCESSORIES - BACKPACK",
  "ACCESSORIES - BANDANNA",
  "ACCESSORIES - BASEBALL CAP",
  "ACCESSORIES - BUCKET HAT",
  "ACCESSORIES - CUT + SEW SCARF",
  "ACCESSORIES - FULLY FASHIONED BEANIE",
  "ACCESSORIES - GLOVES",
  "ACCESSORIES - JACQURD KNIT SCARF",
  "ACCESSORIES - KEYCHAIN",
  "ACCESSORIES - LARGE BAG",
  "ACCESSORIES - MEDIUM BAG",
  "ACCESSORIES - PHONE CASE",
  "ACCESSORIES - PRINTED TOWEL",
  "ACCESSORIES - PURSE",
  "ACCESSORIES - SMALL BAG",
  "ACCESSORIES - SUNGLASSES",
  "ACCESSORIES - TIE",
  "ACCESSORIES - WALLET",
  "ACCESSORIES - YARN DYE TOWEL",
  "ATHLETIC SHORTS",
  "BACKPACK",
  "BATHROBE",
  "BEANIE",
  "BLAZER",
  "BLOUSE",
  "BODYSUIT",
  "BOTTOMS - ATHLETIC SHORTS",
  "BOTTOMS - BIKE SHORTS",
  "BOTTOMS - DENIM PANTS",
  "BOTTOMS - DRESS PANTS",
  "BOTTOMS - JUMPSUIT",
  "BOTTOMS - LEGGING",
  "BOTTOMS - MAXI SKIRT",
  "BOTTOMS - SHORTS",
  "BOTTOMS - SKIRT",
  "BOTTOMS - SWEATPANTS",
  "BOTTOMS - WOVEN PANTS",
  "BRA",
  "BRALETTE",
  "BUCKET HAT",
  "CASUAL JACKET",
  "COAT",
  "DENIM JACKET",
  "DRESS",
  "DRESSES - KNIT DRESS",
  "DRESSES - WOVEN DRESS",
  "DRESS SHIRT",
  "GLOVES",
  "HAT",
  "HOODED SWEATSHIRT",
  "INTIMATES - BATHROBE",
  "INTIMATES - BODYSUIT",
  "INTIMATES - BRA",
  "INTIMATES - BRALETTE",
  "INTIMATES - SOCKS",
  "INTIMATES - UNDERWEAR",
  "JACKET",
  "JEWELRY - ACRYLIC JEWELRY.",
  "JEWELRY - CAST METAL JEWELRY",
  "LARGE BAG",
  "LONG SKIRT",
  "LONGSLEEVE TEESHIRT",
  "MAXI SKIRT",
  "MEDIUM BAG",
  "ONE PIECE BATHING SUIT",
  "OTHER - HANGTAGS",
  "OTHER - NOVELTY LABELS",
  "OTHER - PACKAGING",
  "OUTERWEAR - CASUAL JACKET",
  "OUTERWEAR - COAT",
  "OUTERWEAR - DENIM JACKET",
  "OUTERWEAR - PONCHO",
  "OUTERWEAR - PUFFER JACKET",
  "OUTERWEAR - TAILORED JACKET",
  "PACKAGING",
  "PANTS",
  "POLO/RUGBY SHIRT",
  "PONCHO",
  "PURSE",
  "SCARF",
  "SHORTS",
  "SHORTSLEEVE DRESS SHIRT",
  "SKIRT",
  "SMALL BAG",
  "SOCKS",
  "SPORT COAT",
  "STRUCTURED JUMPSUIT",
  "SUNGLASSES",
  "SWEATER",
  "SWEATPANTS",
  "SWEATSHIRT",
  "SWIMWEAR - ONE PIECE BATHING SUIT",
  "SWIMWEAR - TWO PIECE BATHING SUIT",
  "TAILORED JACKET",
  "TANK TOP",
  "TEESHIRT",
  "TIE",
  "TOPCOAT",
  "TOPS - BLOUSE",
  "TOPS - DRESS SHIRT",
  "TOPS - HOODED SWEATSHIRT",
  "TOPS - LONGSLEEVE TEESHIRT",
  "TOPS - POLO/RUGBY SHIRT",
  "TOPS - SHORTSLEEVE DRESS SHIRT",
  "TOPS - SWEATER",
  "TOPS - SWEATSHIRT",
  "TOPS - TANK TOP",
  "TOPS - TEESHIRT",
  "TWO PIECE BATHING SUIT",
  "UNDERWEAR",
  "WALLET",
  "WOVEN DRESS",
] as const;

export type ProductType = typeof validProductTypes[number];
