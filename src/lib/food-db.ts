/**
 * Built-in food library for estimating calories + macros.
 * Values are per 100 g (approximate, good enough for estimates). Each food
 * lists common portions; the first is the default. A free API can expand this
 * later without changing the UI.
 */
export type Food = {
  name: string;
  aliases?: string[];
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  portions: { label: string; grams: number }[];
};

const g = (label: string, grams: number) => ({ label, grams });
const per = (kcal: number, protein: number, carbs: number, fat: number) => ({
  kcal,
  protein,
  carbs,
  fat,
});

export const FOODS: Food[] = [
  // Proteins
  { name: "Chicken breast", aliases: ["chicken"], per100: per(165, 31, 0, 3.6), portions: [g("1 breast (174 g)", 174), g("100 g", 100)] },
  { name: "Chicken thigh", per100: per(209, 26, 0, 11), portions: [g("1 thigh (110 g)", 110), g("100 g", 100)] },
  { name: "Egg", aliases: ["eggs"], per100: per(155, 13, 1.1, 11), portions: [g("1 large (50 g)", 50), g("2 large (100 g)", 100)] },
  { name: "Beef mince (80/20)", aliases: ["ground beef", "beef"], per100: per(250, 26, 0, 17), portions: [g("100 g", 100), g("1 patty (113 g)", 113)] },
  { name: "Steak (sirloin)", aliases: ["steak"], per100: per(271, 25, 0, 19), portions: [g("1 steak (200 g)", 200), g("100 g", 100)] },
  { name: "Pork chop", aliases: ["pork"], per100: per(231, 25, 0, 14), portions: [g("1 chop (145 g)", 145), g("100 g", 100)] },
  { name: "Bacon", per100: per(541, 37, 1.4, 42), portions: [g("1 slice (12 g)", 12), g("3 slices (36 g)", 36)] },
  { name: "Turkey breast", aliases: ["turkey"], per100: per(135, 30, 0, 1), portions: [g("100 g", 100), g("3 slices (84 g)", 84)] },
  { name: "Salmon", per100: per(208, 20, 0, 13), portions: [g("1 fillet (170 g)", 170), g("100 g", 100)] },
  { name: "Tuna (canned)", aliases: ["tuna"], per100: per(116, 26, 0, 1), portions: [g("1 can (142 g)", 142), g("100 g", 100)] },
  { name: "Cod", per100: per(82, 18, 0, 0.7), portions: [g("1 fillet (180 g)", 180), g("100 g", 100)] },
  { name: "Shrimp", aliases: ["prawns"], per100: per(99, 24, 0.2, 0.3), portions: [g("100 g", 100), g("6 large (50 g)", 50)] },
  { name: "Tofu", per100: per(76, 8, 1.9, 4.8), portions: [g("1/2 block (126 g)", 126), g("100 g", 100)] },
  { name: "Greek yogurt (nonfat)", aliases: ["yogurt", "greek yoghurt"], per100: per(59, 10, 3.6, 0.4), portions: [g("1 cup (245 g)", 245), g("100 g", 100)] },
  { name: "Cottage cheese", per100: per(98, 11, 3.4, 4.3), portions: [g("1 cup (226 g)", 226), g("100 g", 100)] },
  { name: "Whey protein", aliases: ["protein shake", "protein powder"], per100: per(400, 80, 8, 7), portions: [g("1 scoop (30 g)", 30), g("2 scoops (60 g)", 60)] },
  { name: "Protein bar", per100: per(350, 30, 40, 12), portions: [g("1 bar (60 g)", 60)] },
  { name: "Lentils (cooked)", aliases: ["lentils"], per100: per(116, 9, 20, 0.4), portions: [g("1 cup (198 g)", 198), g("100 g", 100)] },
  { name: "Black beans (cooked)", aliases: ["beans"], per100: per(132, 8.9, 24, 0.5), portions: [g("1 cup (172 g)", 172), g("100 g", 100)] },
  { name: "Chickpeas", per100: per(164, 8.9, 27, 2.6), portions: [g("1 cup (164 g)", 164), g("100 g", 100)] },

  // Carbs / grains
  { name: "White rice (cooked)", aliases: ["rice"], per100: per(130, 2.7, 28, 0.3), portions: [g("1 cup (158 g)", 158), g("100 g", 100)] },
  { name: "Brown rice (cooked)", per100: per(123, 2.7, 26, 1), portions: [g("1 cup (195 g)", 195), g("100 g", 100)] },
  { name: "Pasta (cooked)", aliases: ["spaghetti", "noodles"], per100: per(158, 5.8, 31, 0.9), portions: [g("1 cup (140 g)", 140), g("100 g", 100)] },
  { name: "Oats (dry)", aliases: ["oatmeal", "porridge"], per100: per(389, 17, 66, 7), portions: [g("1/2 cup (40 g)", 40), g("1 cup (80 g)", 80)] },
  { name: "Bread (white)", aliases: ["bread", "toast"], per100: per(265, 9, 49, 3.2), portions: [g("1 slice (28 g)", 28), g("2 slices (56 g)", 56)] },
  { name: "Tortilla (flour)", aliases: ["wrap"], per100: per(304, 8, 49, 8), portions: [g("1 tortilla (49 g)", 49)] },
  { name: "Potato (baked)", aliases: ["potato"], per100: per(93, 2.5, 21, 0.1), portions: [g("1 medium (173 g)", 173), g("100 g", 100)] },
  { name: "Sweet potato", per100: per(90, 2, 21, 0.1), portions: [g("1 medium (130 g)", 130), g("100 g", 100)] },
  { name: "Quinoa (cooked)", per100: per(120, 4.4, 21, 1.9), portions: [g("1 cup (185 g)", 185), g("100 g", 100)] },
  { name: "Cereal", per100: per(379, 7, 84, 3), portions: [g("1 cup (40 g)", 40)] },
  { name: "Granola", per100: per(471, 10, 64, 20), portions: [g("1/2 cup (61 g)", 61)] },
  { name: "Pancakes", per100: per(227, 6.4, 28, 9.7), portions: [g("1 pancake (77 g)", 77), g("3 pancakes (231 g)", 231)] },

  // Fruit / veg
  { name: "Banana", per100: per(89, 1.1, 23, 0.3), portions: [g("1 medium (118 g)", 118)] },
  { name: "Apple", per100: per(52, 0.3, 14, 0.2), portions: [g("1 medium (182 g)", 182)] },
  { name: "Strawberries", per100: per(32, 0.7, 7.7, 0.3), portions: [g("1 cup (152 g)", 152)] },
  { name: "Blueberries", per100: per(57, 0.7, 14, 0.3), portions: [g("1 cup (148 g)", 148)] },
  { name: "Broccoli", per100: per(34, 2.8, 7, 0.4), portions: [g("1 cup (91 g)", 91)] },
  { name: "Spinach", per100: per(23, 2.9, 3.6, 0.4), portions: [g("1 cup (30 g)", 30)] },
  { name: "Carrot", per100: per(41, 0.9, 10, 0.2), portions: [g("1 medium (61 g)", 61)] },
  { name: "Mixed salad", aliases: ["salad"], per100: per(20, 1.5, 3.5, 0.2), portions: [g("1 bowl (100 g)", 100)] },
  { name: "Avocado", per100: per(160, 2, 9, 15), portions: [g("1/2 avocado (100 g)", 100), g("1 whole (200 g)", 200)] },

  // Fats / extras
  { name: "Peanut butter", per100: per(588, 25, 20, 50), portions: [g("1 tbsp (16 g)", 16), g("2 tbsp (32 g)", 32)] },
  { name: "Almonds", aliases: ["nuts"], per100: per(579, 21, 22, 49), portions: [g("1 oz (28 g)", 28)] },
  { name: "Cheddar cheese", aliases: ["cheese"], per100: per(403, 25, 1.3, 33), portions: [g("1 slice (28 g)", 28)] },
  { name: "Olive oil", aliases: ["oil"], per100: per(884, 0, 0, 100), portions: [g("1 tbsp (14 g)", 14)] },
  { name: "Butter", per100: per(717, 0.9, 0.1, 81), portions: [g("1 tbsp (14 g)", 14)] },
  { name: "Honey", per100: per(304, 0.3, 82, 0), portions: [g("1 tbsp (21 g)", 21)] },

  // Meals / fast food
  { name: "Pizza (cheese)", aliases: ["pizza"], per100: per(266, 11, 33, 10), portions: [g("1 slice (107 g)", 107), g("2 slices (214 g)", 214)] },
  { name: "Cheeseburger", aliases: ["burger", "hamburger"], per100: per(263, 13, 29, 12), portions: [g("1 burger (115 g)", 115)] },
  { name: "French fries", aliases: ["fries", "chips"], per100: per(312, 3.4, 41, 15), portions: [g("1 medium (117 g)", 117)] },
  { name: "Burrito", per100: per(206, 8, 24, 8), portions: [g("1 burrito (240 g)", 240)] },
  { name: "Sushi roll", aliases: ["sushi"], per100: per(145, 5, 30, 1), portions: [g("1 roll (100 g)", 100)] },
  { name: "Ramen (instant)", aliases: ["ramen"], per100: per(436, 9, 63, 16), portions: [g("1 pack (81 g)", 81)] },
  { name: "Ice cream", per100: per(207, 3.5, 24, 11), portions: [g("1 scoop (66 g)", 66)] },
  { name: "Chocolate", per100: per(546, 4.9, 61, 31), portions: [g("1 bar (43 g)", 43)] },

  // Drinks
  { name: "Milk (2%)", aliases: ["milk"], per100: per(50, 3.4, 4.8, 2), portions: [g("1 cup (244 g)", 244)] },
  { name: "Orange juice", aliases: ["juice"], per100: per(45, 0.7, 10, 0.2), portions: [g("1 cup (248 g)", 248)] },
  { name: "Coffee (black)", aliases: ["coffee"], per100: per(1, 0.1, 0, 0), portions: [g("1 cup (240 g)", 240)] },
  { name: "Cola", aliases: ["soda", "soft drink"], per100: per(41, 0, 11, 0), portions: [g("1 can (355 g)", 355)] },
  { name: "Beer", per100: per(43, 0.5, 3.6, 0), portions: [g("1 can (355 g)", 355)] },
];

export function searchFoods(query: string, limit = 6): Food[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored: { f: Food; score: number }[] = [];
  for (const f of FOODS) {
    const hay = [f.name.toLowerCase(), ...(f.aliases ?? []).map((a) => a.toLowerCase())];
    let score = 0;
    for (const h of hay) {
      if (h === q) score = Math.max(score, 100);
      else if (h.startsWith(q)) score = Math.max(score, 80);
      else if (h.includes(q)) score = Math.max(score, 50);
    }
    if (score > 0) scored.push({ f, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.f);
}

export function estimate(food: Food, grams: number) {
  const k = grams / 100;
  return {
    calories: Math.round(food.per100.kcal * k),
    protein: Math.round(food.per100.protein * k),
    carbs: Math.round(food.per100.carbs * k),
    fat: Math.round(food.per100.fat * k),
  };
}
