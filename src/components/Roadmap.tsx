"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { categoryConfig } from "../category.config";
import { brandColor } from "../lib/brand-colors";
import {
  ROADMAP_CARD_HEIGHT,
  type RoadmapLayout,
} from "../lib/layout";
import { displayOptionalText } from "../lib/display";
import type { Product } from "../lib/products";

interface RoadmapProps {
  products: Product[];
  layout: RoadmapLayout;
  focusedAsins: ReadonlySet<string>;
  focusSelectionMode: boolean;
  onProductAction: (product: Product) => void;
}

const BRAND_HEADER_HEIGHT = 64;
const LANE_LABEL_HEIGHT = 18;
const HEADER_HEIGHT = BRAND_HEADER_HEIGHT + LANE_LABEL_HEIGHT;
const CANVAS_BOTTOM_PADDING = 32;
const AXIS_LINE_BOTTOM_PADDING = 28;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 1.2;
const ZOOM_WHEEL_SENSITIVITY = 0.0016;

interface ZoomAnchor {
  contentX: number;
  contentY: number;
  originX: number;
  originY: number;
}

interface AxisTick {
  key: string;
  top: number;
  label: string;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
const roundZoomPercent = (zoom: number) => Math.round(zoom * 100);

const brandClassName = (brand: string) => brand.toLowerCase();
const formatInteger = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatRevenue = (value: number) =>
  `${categoryConfig.currencySymbol}${formatInteger.format(value)}`;
const formatAxisPrice = (price: number) =>
  `${categoryConfig.currencySymbol}${price.toFixed(2)}`;
const keyMetricText = (product: Product) => {
  if (product.keyMetricValue === null) {
    return `${categoryConfig.keyMetric.label}：暂无数据`;
  }
  const unit = categoryConfig.keyMetric.unit;
  const suffix = unit ? ` ${unit}` : "";
  return `${categoryConfig.keyMetric.label}：${product.keyMetricValue}${suffix}`;
};

export function Roadmap({
  products,
  layout,
  focusedAsins,
  focusSelectionMode,
  onProductAction,
}: RoadmapProps) {
  const productDetails = new Map(products.map((product) => [product.asin, product]));
  const plotWidth = layout.width;
  const plotHeight = layout.height + ROADMAP_CARD_HEIGHT + CANVAS_BOTTOM_PADDING;
  const axisLineHeight = Math.max(0, plotHeight - AXIS_LINE_BOTTOM_PADDING);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const leftAxisRef = useRef<HTMLDivElement | null>(null);
  const rightAxisRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // 固定轴面板与滚动视口同步：顶栏跟随横向滚动，左右价格轴跟随纵向滚动。
  const syncPanes = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (topbarRef.current) topbarRef.current.scrollLeft = viewport.scrollLeft;
    if (leftAxisRef.current) leftAxisRef.current.scrollTop = viewport.scrollTop;
    if (rightAxisRef.current) rightAxisRef.current.scrollTop = viewport.scrollTop;
  }, []);

  // 以视口内锚点（光标或中心）为基准缩放，保持内容点不漂移。
  const zoomAtPoint = useCallback(
    (nextZoom: number, originX?: number, originY?: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const currentZoom = zoomRef.current;
      const clampedZoom = clampZoom(nextZoom);
      if (clampedZoom === currentZoom) return;

      const rect = viewport.getBoundingClientRect();
      const anchorX = originX ?? rect.width / 2;
      const anchorY = originY ?? rect.height / 2;

      zoomAnchorRef.current = {
        contentX: (anchorX + viewport.scrollLeft) / currentZoom,
        contentY: (anchorY + viewport.scrollTop) / currentZoom,
        originX: anchorX,
        originY: anchorY,
      };
      zoomRef.current = clampedZoom;
      setZoom(clampedZoom);
    },
    [],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY);
      zoomAtPoint(
        zoomRef.current * factor,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [zoomAtPoint]);

  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = zoomAnchorRef.current;

    if (viewport && anchor) {
      viewport.scrollLeft = Math.max(
        0,
        anchor.contentX * zoom - anchor.originX,
      );
      viewport.scrollTop = Math.max(
        0,
        anchor.contentY * zoom - anchor.originY,
      );
      zoomAnchorRef.current = null;
    }

    syncPanes();
  }, [zoom, layout, syncPanes]);

  const axisTicks: AxisTick[] = [
    ...layout.priceScale.segments.map((segment, index) => ({
      key: `tick-${segment.maxPrice}-${segment.minPrice}-${index}`,
      top: segment.top,
      label: formatAxisPrice(segment.maxPrice),
    })),
    {
      key: "tick-scale-bottom",
      top: layout.priceScale.height,
      label: formatAxisPrice(layout.priceScale.min),
    },
  ];
  const axisBreaks = layout.priceScale.segments.filter(
    (segment) => segment.compressedGapAfter,
  );
  const zoomPercent = roundZoomPercent(zoom);
  const scaledPlotWidth = Math.ceil(plotWidth * zoom);
  const scaledPlotHeight = Math.ceil(plotHeight * zoom);

  return (
    <div className="roadmap-scroll" role="region" aria-label="品牌与价格产品路标">
      <div className="roadmap-frame">
        <div aria-hidden="true" className="roadmap-corner" />
        <div
          aria-hidden="true"
          className="roadmap-topbar"
          data-testid="roadmap-topbar"
          ref={topbarRef}
        >
          <div
            className="roadmap-topbar__content"
            style={{ width: scaledPlotWidth, height: HEADER_HEIGHT * zoom }}
          >
            {layout.brandRegions.map((region) => (
              <div
                className="topbar-brand-boundary"
                key={`boundary-${region.brand}`}
                style={{ left: region.x * zoom, height: HEADER_HEIGHT * zoom }}
              />
            ))}
            {layout.brandRegions.map((region) => {
              const brandProducts = products.filter(
                (product) => product.brand === region.brand,
              );
              const brandPrices = brandProducts.map((product) => product.price);
              return (
                <div
                  className="topbar-brand"
                  data-testid={`brand-region-${region.brand}`}
                  key={region.brand}
                  style={{
                    left: region.x * zoom,
                    width: region.width * zoom,
                    height: BRAND_HEADER_HEIGHT * zoom,
                    "--brand-color": brandColor(region.brand),
                  }}
                >
                  <span className="brand-column__mark" aria-hidden="true" />
                  <div>
                    <h3>{region.brand}</h3>
                    <p>
                      {brandProducts.length} 款 · {region.laneCount} 条泳道 · {categoryConfig.currencySymbol}{Math.min(...brandPrices).toFixed(0)}–{categoryConfig.currencySymbol}{Math.max(...brandPrices).toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
            {layout.laneLabels.map((lane) => (
              <div
                className="series-lane-label"
                data-brand={lane.brand}
                data-testid="series-lane-label"
                key={`${lane.brand}-${lane.laneIndex}`}
                style={{
                  left: lane.x * zoom,
                  width: lane.width * zoom,
                  top: BRAND_HEADER_HEIGHT * zoom,
                  height: LANE_LABEL_HEIGHT * zoom,
                }}
              >
                {lane.series.join(" · ")}
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="roadmap-corner roadmap-corner--right" />

        <div
          className="roadmap-axis roadmap-axis--left"
          data-testid="price-axis-left"
          ref={leftAxisRef}
          role="presentation"
        >
          <div
            className="roadmap-axis__content"
            style={{ height: scaledPlotHeight }}
          >
            <div
              className="roadmap-axis__line"
              style={{ height: Math.ceil(axisLineHeight * zoom) }}
            />
            {axisTicks.map((tick) => (
              <div
                className="roadmap-axis__tick"
                key={tick.key}
                style={{ top: tick.top * zoom }}
              >
                <span aria-hidden="true" className="roadmap-axis__label">
                  {tick.label}
                </span>
              </div>
            ))}
            {axisBreaks.map((segment) => (
              <span
                aria-label="价格轴断点：空白价格区间已压缩"
                className="price-axis-break"
                data-axis-break
                key={`break-${segment.maxPrice}-${segment.minPrice}`}
                role="img"
                style={{ top: ((segment.top + segment.bottom) / 2) * zoom }}
              >
                <span aria-hidden="true">∕∕</span>
              </span>
            ))}
          </div>
        </div>

        <div
          className="roadmap-viewport"
          data-testid="roadmap-viewport"
          onScroll={syncPanes}
          ref={viewportRef}
        >
          <div
            className="roadmap-viewport__sizer"
            style={{ width: scaledPlotWidth, height: scaledPlotHeight }}
          >
            <div
              className="roadmap-canvas"
              style={{
                width: plotWidth,
                height: plotHeight,
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            >
              {layout.priceScale.segments.map((segment, index) => (
                <div
                  className={`price-segment ${segment.compressedGapAfter ? "price-segment--compressed" : ""}`}
                  data-max-price={segment.maxPrice}
                  data-min-price={segment.minPrice}
                  key={`${segment.maxPrice}-${segment.minPrice}-${index}`}
                  style={{
                    top: segment.top,
                    height: Math.max(1, segment.bottom - segment.top),
                  }}
                />
              ))}

              {layout.priceScale.segments.map((segment, index) => (
                <div
                  className="price-gridline"
                  key={`gridline-${segment.maxPrice}-${segment.minPrice}-${index}`}
                  style={{ top: segment.top }}
                />
              ))}
              <div
                className="price-gridline price-gridline--scale-bottom"
                style={{ top: layout.priceScale.height }}
              />

              {layout.brandRegions.map((region) => (
                <div
                  className="brand-column"
                  data-testid={`brand-divider-${region.brand}`}
                  key={`divider-${region.brand}`}
                  style={{ left: region.x, width: region.width }}
                />
              ))}

              {layout.cards.map((card) => {
                const product = productDetails.get(card.product.asin);
                if (!product) return null;
                const tooltipId = `product-tooltip-${product.asin}`;
                const isFocused = focusedAsins.has(product.asin);
                const tooltipSide = card.x + card.width / 2 > layout.width / 2 ? "left" : "right";
                const tooltipUp = card.y + card.height / 2 > layout.height / 2;

                return (
                  <button
                    aria-describedby={tooltipId}
                    aria-label={focusSelectionMode
                      ? `${isFocused ? "取消" : "设置"} ${product.brand} ${product.model} ${isFocused ? "重点关注" : "为重点关注"}`
                      : `查看 ${product.brand} ${product.model} 详情`}
                    aria-haspopup={focusSelectionMode ? undefined : "dialog"}
                    aria-pressed={focusSelectionMode ? isFocused : undefined}
                    className={`product-card product-card--tooltip-${tooltipSide} ${tooltipUp ? "product-card--tooltip-up" : ""} ${isFocused ? "product-card--focused" : ""}`}
                    data-testid="product-card"
                    data-tooltip-side={tooltipSide}
                    key={product.asin}
                    onClick={() => onProductAction(product)}
                    style={{
                      left: card.x,
                      top: card.y,
                      width: card.width,
                      height: card.height,
                      "--card-accent": brandColor(product.brand),
                    }}
                    type="button"
                  >
                    {isFocused ? <span className="product-card__focus">重点关注</span> : null}
                    <span className="product-card__image">
                      <span className="product-card__fallback">{product.brand}<small>{product.model}</small></span>
                      {product.imageUrl ? (
                        <img alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} src={product.imageUrl} />
                      ) : null}
                    </span>
                    <span className="product-card__content">
                      <span className="product-card__brand">{product.brand} · {product.series}</span>
                      <strong>{product.model}</strong>
                      <span className="product-card__price">{categoryConfig.currencySymbol}{product.price.toFixed(2)}</span>
                      <span className="product-card__key-metric">{keyMetricText(product)}</span>
                      <span className="product-card__meta">
                        <span>{product.rating === null ? "暂无数据" : `★ ${product.rating.toFixed(1)}`}</span>
                        <span>{product.monthlyUnits.toLocaleString("en-US")} 件/月估算</span>
                      </span>
                    </span>
                    <span className="product-tooltip" id={tooltipId} role="tooltip">
                      <strong>{product.title}</strong>
                      <span>{product.brand} · 系列 {product.series} · ASIN {product.asin}</span>
                      <span>当前价 {categoryConfig.currencySymbol}{product.price.toFixed(2)} · 平均价 {categoryConfig.currencySymbol}{product.averagePrice.toFixed(2)}</span>
                      <span>{keyMetricText(product)}{product.keyMetricSource ? `（来源：${product.keyMetricSource}）` : ""}</span>
                      <span>{formatInteger.format(product.monthlyUnits)} 件/月估算 · {formatRevenue(product.monthlyRevenue)}/月估算</span>
                      <span>
                        评分 {product.rating === null ? "暂无数据" : product.rating.toFixed(1)}
                        {product.ratingCount === null ? "（暂无数据）" : `（${formatInteger.format(product.ratingCount)} 条评论）`}
                      </span>
                      <span>BSR #{formatInteger.format(product.bsr)}</span>
                      <span>
                        上架 {product.listingDate} · 履约 {displayOptionalText(product.fulfillment)}
                      </span>
                      <span>{isFocused ? "已重点关注" : "未重点关注"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="roadmap-axis roadmap-axis--right"
          data-testid="price-axis-right"
          ref={rightAxisRef}
        >
          <div
            className="roadmap-axis__content"
            style={{ height: scaledPlotHeight }}
          >
            <div
              className="roadmap-axis__line"
              style={{ height: Math.ceil(axisLineHeight * zoom) }}
            />
            {axisTicks.map((tick) => (
              <div
                className="roadmap-axis__tick"
                key={tick.key}
                style={{ top: tick.top * zoom }}
              >
                <span className="roadmap-axis__label">{tick.label}</span>
              </div>
            ))}
            {axisBreaks.map((segment) => (
              <span
                className="price-axis-break"
                data-axis-break
                key={`break-${segment.maxPrice}-${segment.minPrice}`}
                style={{ top: ((segment.top + segment.bottom) / 2) * zoom }}
              >
                <span aria-hidden="true">∕∕</span>
              </span>
            ))}
          </div>
        </div>

        <div aria-label="路标缩放控制" className="roadmap-zoom" role="group">
          <button
            aria-label="缩小路标"
            data-testid="roadmap-zoom-out"
            disabled={zoomPercent <= roundZoomPercent(MIN_ZOOM)}
            onClick={() => zoomAtPoint(zoomRef.current / ZOOM_STEP)}
            type="button"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="roadmap-zoom__level"
            data-testid="roadmap-zoom-level"
          >
            {zoomPercent}%
          </span>
          <button
            aria-label="放大路标"
            data-testid="roadmap-zoom-in"
            disabled={zoomPercent >= roundZoomPercent(MAX_ZOOM)}
            onClick={() => zoomAtPoint(zoomRef.current * ZOOM_STEP)}
            type="button"
          >
            ＋
          </button>
          <button
            aria-label="重置缩放"
            className="roadmap-zoom__reset"
            data-testid="roadmap-zoom-reset"
            onClick={() => zoomAtPoint(1)}
            type="button"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
