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
  /** Where this came from — used for a small badge in the picker. */
  source?: "usda" | "fastfood";
};

const g = (label: string, grams: number) => ({ label, grams });
const per = (kcal: number, protein: number, carbs: number, fat: number) => ({
  kcal,
  protein,
  carbs,
  fat,
});

/** Build a fast-food entry from *per-item* macros + the item's weight. The
 * default portion is one item; per-100g is derived so the estimator math works
 * unchanged. */
const ff = (
  name: string,
  grams: number,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  aliases?: string[],
): Food => ({
  name,
  aliases,
  source: "fastfood",
  per100: {
    kcal: Math.round((kcal / grams) * 100),
    protein: Math.round((protein / grams) * 100 * 10) / 10,
    carbs: Math.round((carbs / grams) * 100 * 10) / 10,
    fat: Math.round((fat / grams) * 100 * 10) / 10,
  },
  portions: [g(`1 serving (${grams} g)`, grams), g("100 g", 100)],
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

  // More proteins
  { name: "Ground turkey", per100: per(170, 22, 0, 9), portions: [g("100 g", 100), g("1 patty (113 g)", 113)] },
  { name: "Ham (deli)", aliases: ["ham"], per100: per(145, 21, 1.5, 6), portions: [g("3 slices (84 g)", 84), g("100 g", 100)] },
  { name: "Sausage", per100: per(301, 14, 2, 27), portions: [g("1 link (75 g)", 75)] },
  { name: "Tilapia", per100: per(96, 20, 0, 1.7), portions: [g("1 fillet (140 g)", 140), g("100 g", 100)] },
  { name: "Edamame", per100: per(121, 12, 9, 5), portions: [g("1 cup (155 g)", 155), g("100 g", 100)] },
  { name: "Peanuts", per100: per(567, 26, 16, 49), portions: [g("1 oz (28 g)", 28)] },
  { name: "Hummus", per100: per(166, 8, 14, 10), portions: [g("2 tbsp (30 g)", 30)] },

  // More dairy
  { name: "Milk (whole)", per100: per(61, 3.2, 4.8, 3.3), portions: [g("1 cup (244 g)", 244)] },
  { name: "Mozzarella", per100: per(280, 28, 3.1, 17), portions: [g("1 oz (28 g)", 28)] },
  { name: "Cream cheese", per100: per(342, 6, 4, 34), portions: [g("1 tbsp (15 g)", 15)] },
  { name: "Parmesan", per100: per(431, 38, 4.1, 29), portions: [g("1 tbsp (5 g)", 5)] },
  { name: "Sour cream", per100: per(198, 2.4, 4.6, 19), portions: [g("2 tbsp (30 g)", 30)] },
  { name: "Almond milk (unsweetened)", aliases: ["almond milk"], per100: per(15, 0.6, 0.6, 1.2), portions: [g("1 cup (244 g)", 244)] },
  { name: "Oat milk", per100: per(47, 1, 7, 1.5), portions: [g("1 cup (240 g)", 240)] },

  // More carbs / grains
  { name: "Bagel", per100: per(257, 10, 50, 1.5), portions: [g("1 bagel (98 g)", 98)] },
  { name: "English muffin", per100: per(227, 8, 44, 1.7), portions: [g("1 muffin (57 g)", 57)] },
  { name: "Pita bread", aliases: ["pita"], per100: per(275, 9, 56, 1.2), portions: [g("1 pita (60 g)", 60)] },
  { name: "Naan", per100: per(310, 9, 50, 9), portions: [g("1 naan (90 g)", 90)] },
  { name: "Couscous (cooked)", per100: per(112, 3.8, 23, 0.2), portions: [g("1 cup (157 g)", 157), g("100 g", 100)] },
  { name: "Rice cake", per100: per(387, 8, 82, 2.8), portions: [g("1 cake (9 g)", 9)] },
  { name: "Croissant", per100: per(406, 8, 46, 21), portions: [g("1 croissant (57 g)", 57)] },
  { name: "Whole wheat bread", per100: per(247, 13, 41, 3.4), portions: [g("1 slice (32 g)", 32), g("2 slices (64 g)", 64)] },
  { name: "Mac and cheese", per100: per(164, 6, 20, 6.6), portions: [g("1 cup (200 g)", 200)] },

  // More fruit
  { name: "Orange", per100: per(47, 0.9, 12, 0.1), portions: [g("1 medium (131 g)", 131)] },
  { name: "Grapes", per100: per(69, 0.7, 18, 0.2), portions: [g("1 cup (151 g)", 151)] },
  { name: "Pineapple", per100: per(50, 0.5, 13, 0.1), portions: [g("1 cup (165 g)", 165)] },
  { name: "Mango", per100: per(60, 0.8, 15, 0.4), portions: [g("1 cup (165 g)", 165)] },
  { name: "Watermelon", per100: per(30, 0.6, 7.6, 0.2), portions: [g("1 cup (152 g)", 152)] },
  { name: "Pear", per100: per(57, 0.4, 15, 0.1), portions: [g("1 medium (178 g)", 178)] },
  { name: "Peach", per100: per(39, 0.9, 10, 0.3), portions: [g("1 medium (150 g)", 150)] },
  { name: "Grapefruit", per100: per(42, 0.8, 11, 0.1), portions: [g("1/2 fruit (123 g)", 123)] },
  { name: "Raspberries", per100: per(52, 1.2, 12, 0.7), portions: [g("1 cup (123 g)", 123)] },
  { name: "Dates", per100: per(282, 2.5, 75, 0.4), portions: [g("1 date (24 g)", 24)] },

  // More veg
  { name: "Tomato", per100: per(18, 0.9, 3.9, 0.2), portions: [g("1 medium (123 g)", 123)] },
  { name: "Cucumber", per100: per(15, 0.7, 3.6, 0.1), portions: [g("1 cup (104 g)", 104)] },
  { name: "Bell pepper", aliases: ["pepper"], per100: per(31, 1, 6, 0.3), portions: [g("1 medium (119 g)", 119)] },
  { name: "Corn", per100: per(96, 3.4, 21, 1.5), portions: [g("1 cup (154 g)", 154)] },
  { name: "Green beans", per100: per(31, 1.8, 7, 0.2), portions: [g("1 cup (100 g)", 100)] },
  { name: "Mushrooms", per100: per(22, 3.1, 3.3, 0.3), portions: [g("1 cup (70 g)", 70)] },
  { name: "Peas", per100: per(81, 5.4, 14, 0.4), portions: [g("1 cup (145 g)", 145)] },
  { name: "Zucchini", per100: per(17, 1.2, 3.1, 0.3), portions: [g("1 cup (124 g)", 124)] },
  { name: "Kale", per100: per(49, 4.3, 9, 0.9), portions: [g("1 cup (67 g)", 67)] },
  { name: "Onion", per100: per(40, 1.1, 9.3, 0.1), portions: [g("1/2 cup (80 g)", 80)] },

  // More fats / extras
  { name: "Cashews", per100: per(553, 18, 30, 44), portions: [g("1 oz (28 g)", 28)] },
  { name: "Walnuts", per100: per(654, 15, 14, 65), portions: [g("1 oz (28 g)", 28)] },
  { name: "Chia seeds", per100: per(486, 17, 42, 31), portions: [g("1 tbsp (12 g)", 12)] },
  { name: "Mayonnaise", aliases: ["mayo"], per100: per(680, 1, 0.6, 75), portions: [g("1 tbsp (14 g)", 14)] },
  { name: "Ketchup", per100: per(101, 1.1, 26, 0.1), portions: [g("1 tbsp (17 g)", 17)] },
  { name: "Dark chocolate", per100: per(598, 7.8, 46, 43), portions: [g("1 oz (28 g)", 28)] },

  // More meals / fast food / snacks
  { name: "Chicken nuggets", aliases: ["nuggets"], per100: per(296, 15, 18, 19), portions: [g("6 pieces (96 g)", 96)] },
  { name: "Hot dog", per100: per(290, 10, 4, 26), portions: [g("1 hot dog (98 g)", 98)] },
  { name: "Taco", per100: per(226, 9, 20, 12), portions: [g("1 taco (102 g)", 102)] },
  { name: "Fried chicken", per100: per(320, 22, 8, 22), portions: [g("1 piece (140 g)", 140)] },
  { name: "Sandwich (turkey)", aliases: ["sandwich"], per100: per(230, 12, 26, 8), portions: [g("1 sandwich (200 g)", 200)] },
  { name: "Curry (chicken)", aliases: ["curry"], per100: per(150, 9, 7, 9), portions: [g("1 cup (240 g)", 240)] },
  { name: "Pad thai", per100: per(170, 7, 22, 6), portions: [g("1 plate (300 g)", 300)] },
  { name: "Donut", per100: per(452, 4.9, 51, 25), portions: [g("1 donut (60 g)", 60)] },
  { name: "Cookie", per100: per(488, 5.7, 64, 24), portions: [g("1 cookie (30 g)", 30)] },
  { name: "Muffin", per100: per(377, 5.6, 55, 15), portions: [g("1 muffin (113 g)", 113)] },
  { name: "Popcorn", per100: per(387, 13, 78, 4.5), portions: [g("1 cup popped (8 g)", 8)] },
  { name: "Potato chips", aliases: ["crisps"], per100: per(536, 7, 53, 35), portions: [g("1 oz (28 g)", 28)] },
  { name: "Tortilla chips", per100: per(490, 7, 64, 23), portions: [g("1 oz (28 g)", 28)] },

  // More drinks
  { name: "Energy drink", per100: per(45, 0, 11, 0), portions: [g("1 can (250 g)", 250)] },
  { name: "Sports drink", aliases: ["gatorade"], per100: per(24, 0, 6, 0), portions: [g("1 bottle (591 g)", 591)] },
  { name: "Latte", per100: per(63, 3.4, 5, 3.3), portions: [g("1 grande (473 g)", 473)] },
  { name: "Smoothie (fruit)", aliases: ["smoothie"], per100: per(60, 1, 14, 0.4), portions: [g("1 cup (240 g)", 240)] },
  { name: "Tea (unsweetened)", aliases: ["tea"], per100: per(1, 0, 0.3, 0), portions: [g("1 cup (240 g)", 240)] },
  { name: "Wine (red)", aliases: ["wine"], per100: per(85, 0.1, 2.6, 0), portions: [g("1 glass (147 g)", 147)] },

  // --- Fast food (per-item published values; grams, kcal, P, C, F) ---------
  // McDonald's
  ff("Big Mac (McDonald's)", 219, 563, 26, 45, 33, ["mcdonalds", "big mac"]),
  ff("Quarter Pounder w/ Cheese (McDonald's)", 199, 520, 30, 42, 26, ["mcdonalds", "quarter pounder"]),
  ff("McDouble (McDonald's)", 151, 400, 22, 33, 20, ["mcdonalds"]),
  ff("Cheeseburger (McDonald's)", 113, 300, 15, 32, 13, ["mcdonalds"]),
  ff("McChicken (McDonald's)", 143, 400, 14, 39, 21, ["mcdonalds", "mcchicken"]),
  ff("Filet-O-Fish (McDonald's)", 142, 390, 16, 39, 19, ["mcdonalds"]),
  ff("Chicken McNuggets (10 pc, McDonald's)", 162, 420, 23, 26, 25, ["mcdonalds", "mcnuggets", "nuggets"]),
  ff("Medium Fries (McDonald's)", 111, 320, 5, 43, 15, ["mcdonalds", "fries"]),
  ff("Egg McMuffin (McDonald's)", 136, 310, 17, 30, 13, ["mcdonalds"]),
  // Burger King
  ff("Whopper (Burger King)", 270, 657, 28, 49, 40, ["burger king", "bk", "whopper"]),
  ff("Bacon King (Burger King)", 397, 1150, 61, 49, 79, ["burger king", "bk"]),
  ff("Chicken Fries (9 pc, Burger King)", 150, 430, 19, 30, 25, ["burger king", "bk"]),
  // Wendy's
  ff("Dave's Single (Wendy's)", 218, 580, 30, 39, 34, ["wendys"]),
  ff("Baconator (Wendy's)", 330, 950, 56, 38, 62, ["wendys", "baconator"]),
  ff("Spicy Chicken Sandwich (Wendy's)", 225, 500, 28, 49, 21, ["wendys"]),
  ff("Chicken Nuggets (10 pc, Wendy's)", 150, 420, 22, 24, 26, ["wendys", "nuggets"]),
  ff("Small Frosty (Wendy's)", 113, 200, 5, 35, 5, ["wendys", "frosty"]),
  // KFC
  ff("Original Recipe Chicken Breast (KFC)", 161, 390, 39, 11, 21, ["kfc"]),
  ff("Original Recipe Drumstick (KFC)", 59, 130, 12, 4, 8, ["kfc"]),
  ff("Chicken Sandwich (KFC)", 200, 650, 30, 47, 35, ["kfc"]),
  // Chick-fil-A
  ff("Chicken Sandwich (Chick-fil-A)", 183, 420, 28, 41, 18, ["chick-fil-a", "chick fil a"]),
  ff("Spicy Chicken Sandwich (Chick-fil-A)", 185, 450, 28, 42, 20, ["chick-fil-a", "chick fil a"]),
  ff("Nuggets (8 pc, Chick-fil-A)", 113, 250, 27, 11, 11, ["chick-fil-a", "chick fil a", "nuggets"]),
  ff("Waffle Fries (medium, Chick-fil-A)", 125, 420, 5, 45, 24, ["chick-fil-a", "fries"]),
  // Taco Bell
  ff("Crunchy Taco (Taco Bell)", 78, 170, 8, 13, 10, ["taco bell"]),
  ff("Beefy 5-Layer Burrito (Taco Bell)", 248, 490, 18, 65, 18, ["taco bell", "burrito"]),
  ff("Chicken Quesadilla (Taco Bell)", 184, 510, 26, 38, 28, ["taco bell", "quesadilla"]),
  ff("Crunchwrap Supreme (Taco Bell)", 254, 530, 16, 71, 21, ["taco bell", "crunchwrap"]),
  // Subway (6")
  ff("6\" Turkey Breast (Subway)", 219, 280, 18, 46, 4, ["subway"]),
  ff("6\" Italian B.M.T. (Subway)", 232, 410, 20, 45, 17, ["subway", "bmt"]),
  ff("6\" Meatball Marinara (Subway)", 264, 480, 22, 59, 18, ["subway", "meatball"]),
  // Pizza
  ff("Pepperoni Pizza (1 slice, Domino's)", 79, 210, 9, 24, 9, ["dominos", "pizza"]),
  ff("Pepperoni Pan Pizza (1 slice, Pizza Hut)", 113, 290, 12, 28, 14, ["pizza hut", "pizza"]),
  // Others
  ff("Double-Double (In-N-Out)", 330, 670, 37, 39, 41, ["in-n-out", "in n out"]),
  ff("Hamburger (Five Guys)", 303, 700, 39, 39, 43, ["five guys"]),
  ff("Little Fries (Five Guys)", 227, 530, 8, 72, 23, ["five guys", "fries"]),
  ff("Spicy Chicken Sandwich (Popeyes)", 219, 700, 28, 50, 42, ["popeyes"]),
  ff("Chicken Burrito (Chipotle)", 625, 1075, 56, 113, 41, ["chipotle", "burrito"]),
  ff("Chicken Bowl (Chipotle)", 510, 700, 54, 70, 22, ["chipotle", "bowl"]),
  ff("Glazed Donut (Dunkin')", 60, 240, 4, 29, 11, ["dunkin", "donut"]),
  ff("Caffè Latte (grande, Starbucks)", 473, 190, 13, 18, 7, ["starbucks", "latte"]),
  ff("Caramel Frappuccino (grande, Starbucks)", 473, 380, 5, 64, 15, ["starbucks", "frappuccino"]),
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
