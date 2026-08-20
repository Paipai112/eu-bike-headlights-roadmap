"use client";

import { useEffect, useMemo, useState } from "react";
import { categoryConfig } from "./category.config";
import { Filters } from "./components/Filters";
import { ProductDrawer } from "./components/ProductDrawer";
import { Roadmap } from "./components/Roadmap";
import products from "./data/products.json";
import {
  getBrowserFocusStorage,
  loadFocusedAsins,
  saveFocusedAsins,
} from "./lib/focus-storage";
import { layoutProducts } from "./lib/layout";
import {
  filterProducts,
  orderBrands,
  seriesForBrands,
  summarizeProducts,
  type FilterState,
  type Product,
} from "./lib/products";

const catalog = products as Product[];
const catalogBrands = orderBrands(catalog);
const catalogMaxPrice = Math.max(...catalog.map((product) => product.price));
const validCatalogAsins = new Set(catalog.map((product) => product.asin));
const initialFilters: FilterState = {
  brands: catalogBrands,
  series: [],
  focus: "all",
  maxPrice: catalogMaxPrice,
  minRating: 0,
  query: "",
};

const formatInteger = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export default function HomePage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [focusedAsins, setFocusedAsins] = useState<Set<string>>(new Set());
  const [focusedAsinsLoaded, setFocusedAsinsLoaded] = useState(false);
  const [focusSelectionMode, setFocusSelectionMode] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const filteredProducts = useMemo(
    () =>
      filters.brands.length === 0
        ? []
        : filterProducts(catalog, filters, focusedAsins),
    [filters, focusedAsins],
  );
  const seriesOptions = useMemo(
    () => seriesForBrands(catalog, filters.brands),
    [filters.brands],
  );
  const roadmap = useMemo(
    () => layoutProducts(filteredProducts),
    [filteredProducts],
  );
  const summary = summarizeProducts(filteredProducts);
  const monthlyUnits = filteredProducts.reduce(
    (total, product) => total + product.monthlyUnits,
    0,
  );
  const monthlyRevenue = filteredProducts.reduce(
    (total, product) => total + product.monthlyRevenue,
    0,
  );

  useEffect(() => {
    document.title = categoryConfig.siteTitle;
  }, []);

  useEffect(() => {
    const restoreHandle = window.setTimeout(() => {
      setFocusedAsins(
        loadFocusedAsins(
          getBrowserFocusStorage(),
          validCatalogAsins,
          categoryConfig.category,
        ),
      );
      setFocusedAsinsLoaded(true);
    }, 0);

    return () => window.clearTimeout(restoreHandle);
  }, []);

  useEffect(() => {
    if (!focusedAsinsLoaded) return;
    saveFocusedAsins(
      getBrowserFocusStorage(),
      focusedAsins,
      categoryConfig.category,
    );
  }, [focusedAsins, focusedAsinsLoaded]);

  const updateFilters = (nextFilters: FilterState) => {
    const validSeries = new Set(seriesForBrands(catalog, nextFilters.brands));
    setFilters({
      ...nextFilters,
      series: nextFilters.series.filter((series) => validSeries.has(series)),
    });
  };

  const toggleFocusedAsin = (asin: string) => {
    setFocusedAsins((current) => {
      const next = new Set(current);
      if (next.has(asin)) next.delete(asin);
      else next.add(asin);
      saveFocusedAsins(
        getBrowserFocusStorage(),
        next,
        categoryConfig.category,
      );
      return next;
    });
  };

  const metrics = [
    { label: "产品数", value: `${summary.count} 款产品` },
    {
      label: "月销量估算",
      value: `${formatInteger.format(monthlyUnits)} 件`,
    },
    {
      label: "月销售额估算",
      value: `${categoryConfig.currencySymbol}${formatInteger.format(monthlyRevenue)}`,
    },
    {
      label: "价格区间",
      value: summary.priceRange
        ? `${categoryConfig.currencySymbol}${summary.priceRange.min.toFixed(2)}–${categoryConfig.currencySymbol}${summary.priceRange.max.toFixed(2)}`
        : "暂无数据",
    },
  ];

  return (
    <main className="roadmap-page">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">{categoryConfig.eyebrow}</p>
          <h1>{categoryConfig.siteTitle}</h1>
          <p className="hero__lede">{categoryConfig.siteLede}</p>
        </div>
        <div className="snapshot" aria-label="数据快照日期">
          <span className="snapshot__dot" />
          数据快照 · {categoryConfig.snapshotDate}
        </div>
      </header>

      <section className="metrics" aria-label="市场关键指标">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <p className="metric__label">{metric.label}</p>
            <p className="metric__value">{metric.value}</p>
          </article>
        ))}
      </section>

      <aside className="estimate-note">
        <span aria-hidden="true">ⓘ</span>
        {categoryConfig.dataNote}
      </aside>

      <Filters
        brands={catalogBrands}
        filters={filters}
        focusSelectionMode={focusSelectionMode}
        maxCatalogPrice={catalogMaxPrice}
        onChange={updateFilters}
        onReset={() => setFilters(initialFilters)}
        onToggleFocusMode={() => setFocusSelectionMode((current) => !current)}
        seriesOptions={seriesOptions}
        totalCount={catalog.length}
        visibleCount={filteredProducts.length}
      />

      <section className="roadmap-section" aria-labelledby="roadmap-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">BRAND × PRICE</p>
            <h2 id="roadmap-heading">品牌价格路标</h2>
          </div>
          <p>价格越高，位置越靠上 · ⌘/Ctrl + 滚轮缩放路标</p>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="roadmap-empty" role="status">
            <strong>没有符合筛选条件的产品</strong>
            <p>请放宽品牌、价格或评分条件，或重置筛选。</p>
          </div>
        ) : (
          <Roadmap
            focusedAsins={focusedAsins}
            focusSelectionMode={focusSelectionMode}
            layout={roadmap}
            onProductAction={(product) =>
              focusSelectionMode
                ? toggleFocusedAsin(product.asin)
                : setSelectedProduct(product)
            }
            products={filteredProducts}
          />
        )}
      </section>

      {selectedProduct ? (
        <ProductDrawer
          focused={focusedAsins.has(selectedProduct.asin)}
          onClose={() => setSelectedProduct(null)}
          onToggleFocused={(product) => toggleFocusedAsin(product.asin)}
          product={selectedProduct}
        />
      ) : null}
    </main>
  );
}
