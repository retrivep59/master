import { FoodItem, NutritionInfo } from '@/types/food';

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

/**
 * Fetches nutritional data for a barcode from Open Food Facts API.
 * Returns null if the product is not found or data is incomplete.
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'CalorieAI/1.0 (https://calorieai.app)' },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as OpenFoodFactsResponse;

  if (data.status !== 1 || !data.product) return null;

  const { product } = data;
  const n = product.nutriments ?? {};

  // Per 100g values
  const kcalPer100 = n['energy-kcal_100g'] ?? 0;
  const proteinPer100 = n.proteins_100g ?? 0;
  const carbsPer100 = n.carbohydrates_100g ?? 0;
  const fatPer100 = n.fat_100g ?? 0;

  // Serving size (default to 100g if not provided)
  const servingQty = product.serving_quantity ?? 100;

  const multiplier = servingQty / 100;

  const nutrition: NutritionInfo = {
    calories: Math.round(kcalPer100 * multiplier),
    protein: Math.round(proteinPer100 * multiplier * 10) / 10,
    carbs: Math.round(carbsPer100 * multiplier * 10) / 10,
    fat: Math.round(fatPer100 * multiplier * 10) / 10,
    fiber: n.fiber_100g ? Math.round(n.fiber_100g * multiplier * 10) / 10 : undefined,
    sugar: n.sugars_100g ? Math.round(n.sugars_100g * multiplier * 10) / 10 : undefined,
    sodium: n.sodium_100g ? Math.round(n.sodium_100g * multiplier * 1000) : undefined, // mg
  };

  const servingSizeStr = product.serving_size ?? `${servingQty}g`;

  return {
    id: `barcode-${barcode}-${Date.now()}`,
    name: product.product_name ?? 'Unknown Product',
    brand: product.brands,
    nutrition,
    servingSize: servingSizeStr,
    source: 'barcode',
  };
}
