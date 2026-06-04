// Live food search via USDA FoodData Central (public domain).
// https://fdc.nal.usda.gov/api-guide.html — server-side only. Reads
// FDC_API_KEY; falls back to the shared DEMO_KEY (heavily rate-limited, fine
// for trying it out). Results are normalised to the app's `Food` shape so the
// estimator UI treats them identically to the bundled foods.

import type { Food } from "./food-db";

const ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";

type FdcNutrient = { nutrientNumber?: string; value?: number };
type FdcFood = {
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: FdcNutrient[];
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function searchUsda(query: string, limit = 8): Promise<Food[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = process.env.FDC_API_KEY?.trim() || "DEMO_KEY";
  const url =
    `${ENDPOINT}?api_key=${encodeURIComponent(key)}` +
    `&query=${encodeURIComponent(q)}` +
    `&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Branded`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let data: { foods?: FdcFood[] };
  try {
    data = (await res.json()) as { foods?: FdcFood[] };
  } catch {
    return [];
  }

  const out: Food[] = [];
  for (const f of data.foods ?? []) {
    const fn = f.foodNutrients ?? [];
    const get = (nums: string[]): number => {
      for (const n of fn) {
        if (n.nutrientNumber && nums.includes(n.nutrientNumber)) {
          return Number(n.value) || 0;
        }
      }
      return 0;
    };

    let kcal = get(["208", "957"]);
    if (!kcal) {
      const kj = get(["268"]);
      if (kj) kcal = Math.round(kj / 4.184);
    }
    const protein = get(["203"]);
    const carbs = get(["205"]);
    const fat = get(["204"]);
    if (!kcal && !protein && !carbs && !fat) continue;

    const brand = (f.brandOwner || f.brandName || "").trim();
    let name = titleCase((f.description || "").trim());
    if (brand && f.dataType === "Branded") name = `${name} (${titleCase(brand)})`;
    name = name.slice(0, 80);

    const portions: { label: string; grams: number }[] = [];
    const serving = Number(f.servingSize);
    const unit = (f.servingSizeUnit || "").toLowerCase();
    if (serving > 0 && (unit === "g" || unit === "grm" || unit === "")) {
      const grams = Math.round(serving);
      portions.push({ label: `1 serving (${grams} g)`, grams });
    }
    portions.push({ label: "100 g", grams: 100 });

    out.push({
      name,
      per100: {
        kcal: Math.round(kcal),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
      },
      portions,
      source: "usda",
    });
  }
  return out;
}
