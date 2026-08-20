import { describe, expect, it } from "vitest";
import {
  layoutProducts,
  ROADMAP_CARD_HEIGHT,
  ROADMAP_CARD_WIDTH,
  ROADMAP_STACK_GAP,
} from "../src/lib/layout";
import type { Product } from "../src/lib/products";

function makeProduct(overrides: Partial<Product>): Product {
  return {
    brand: "Alpha",
    model: "A100",
    series: "A",
    asin: "B0TEST00001",
    title: "Alpha A100",
    price: 49.99,
    averagePrice: 49.99,
    monthlyUnits: 10,
    monthlyRevenue: 499.9,
    rating: 4.5,
    ratingCount: 10,
    bsr: 100,
    listingDate: "2025-01",
    fulfillment: "FBA",
    sellerName: "Alpha",
    variationCount: 1,
    qualityScore: null,
    weight: null,
    dimensions: null,
    badges: [],
    amazonUrl: "https://www.amazon.com/dp/B0TEST00001",
    imageUrl: null,
    keyMetricValue: "1,000",
    keyMetricSource: null,
    attributes: {},
    ...overrides,
  };
}

describe("layoutProducts", () => {
  it("stacks near-price same-series products in one column without sub-columns", () => {
    const products = [
      makeProduct({ asin: "B0TEST00001", price: 100 }),
      makeProduct({ asin: "B0TEST00002", price: 95 }),
      makeProduct({ asin: "B0TEST00003", price: 90 }),
    ];
    const layout = layoutProducts(products);

    expect(layout.cards).toHaveLength(3);
    for (const card of layout.cards) {
      expect(card.subLaneIndex).toBe(0);
    }
    expect(layout.width).toBe(ROADMAP_CARD_WIDTH + 36); // 18px 品牌左右留白

    const sorted = [...layout.cards].sort((first, second) => first.y - second.y);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const gap = sorted[index + 1].y - (sorted[index].y + ROADMAP_CARD_HEIGHT);
      expect(gap).toBeGreaterThanOrEqual(ROADMAP_STACK_GAP - 0.01);
    }
  });

  it("places exact price ties into internal sub-lanes", () => {
    const products = [
      makeProduct({ asin: "B0TEST00001", price: 79.99 }),
      makeProduct({ asin: "B0TEST00002", price: 79.99 }),
    ];
    const layout = layoutProducts(products);

    const subLanes = new Set(layout.cards.map((card) => card.subLaneIndex));
    expect(subLanes).toEqual(new Set([0, 1]));
    expect(layout.cards.every((card) => card.y === layout.cards[0].y)).toBe(true);
  });

  it("never overlaps cards and renders every ASIN exactly once", () => {
    const products = [
      makeProduct({ asin: "B0TEST00001", brand: "Alpha", series: "A", price: 30 }),
      makeProduct({ asin: "B0TEST00002", brand: "Alpha", series: "A", price: 31 }),
      makeProduct({ asin: "B0TEST00003", brand: "Beta", series: "B", price: 30 }),
      makeProduct({ asin: "B0TEST00004", brand: "Beta", series: "C", price: 30 }),
      makeProduct({ asin: "B0TEST00005", brand: "Beta", series: "C", price: 30 }),
    ];

    expect(() => layoutProducts(products)).not.toThrow();
    const layout = layoutProducts(products);
    expect(layout.cards).toHaveLength(products.length);
    expect(new Set(layout.cards.map((card) => card.product.asin)).size).toBe(
      products.length,
    );
  });
});
