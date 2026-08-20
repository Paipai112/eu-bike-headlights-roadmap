import { describe, expect, it } from "vitest";
import {
  buildDistributionPriceScale,
  priceToY,
  type PriceStackConstraint,
} from "../src/lib/price-scale";

const CARD_HEIGHT = 132;
const LEVEL_GAP = 48;

describe("buildDistributionPriceScale", () => {
  it("uses one linear segment for fewer than four distinct prices", () => {
    const scale = buildDistributionPriceScale([30, 40, 50], {
      cardHeight: CARD_HEIGHT,
      levelGap: LEVEL_GAP,
    });

    expect(scale.min).toBe(30);
    expect(scale.max).toBe(50);
    expect(scale.segments).toHaveLength(1);
    expect(priceToY(40, scale)).toBeCloseTo(scale.height / 2, 5);
  });

  it("compresses void price ranges and marks them as axis breaks", () => {
    const prices = [10, 12, 14, 16, 18, 20, 300, 310, 320];
    const scale = buildDistributionPriceScale(prices, {
      cardHeight: CARD_HEIGHT,
      levelGap: LEVEL_GAP,
    });

    const breaks = scale.segments.filter(
      (segment) => segment.compressedGapAfter,
    );
    expect(breaks).toHaveLength(1);
    expect(breaks[0].maxPrice).toBe(300);
    expect(breaks[0].minPrice).toBe(20);
  });

  it("stretches constrained spans so stacked cards clear each other", () => {
    const minSpan = CARD_HEIGHT + 20;
    const constraints: PriceStackConstraint[] = [
      { highPrice: 100, lowPrice: 95, minSpan },
      { highPrice: 95, lowPrice: 90, minSpan },
    ];
    const scale = buildDistributionPriceScale(
      [100, 95, 90, 40, 35, 30],
      { cardHeight: CARD_HEIGHT, levelGap: LEVEL_GAP, stackConstraints: constraints },
    );

    const span = (high: number, low: number) =>
      priceToY(low, scale) - priceToY(high, scale);
    expect(span(100, 95)).toBeGreaterThanOrEqual(minSpan - 0.01);
    expect(span(95, 90)).toBeGreaterThanOrEqual(minSpan - 0.01);
    // 未被约束覆盖的价格段保持基础间距
    expect(span(40, 35)).toBeCloseTo(LEVEL_GAP, 5);
  });

  it("maps equal prices to exactly the same y coordinate", () => {
    const scale = buildDistributionPriceScale([20, 30, 40, 50, 60, 30], {
      cardHeight: CARD_HEIGHT,
      levelGap: LEVEL_GAP,
    });

    const candidates = scale.segments.filter(
      (segment) => segment.minPrice <= 30 && segment.maxPrice >= 30,
    );
    const y = candidates.map((segment) => priceToY(30, { ...scale, segments: [segment] }))[0];
    expect(priceToY(30, scale)).toBeCloseTo(y ?? 0, 5);
  });
});
