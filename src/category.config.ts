import type { DrawerField } from "./lib/category-types";

// ─────────────────────────────────────────────────────────────────────────────
// 品类配置：整个站点唯一需要按品类修改的文件（数据文件 src/data/products.json 除外）。
// 调用 product-roadmap-site skill 时，按品类改写本文件后整站即完成品类切换。
// 完整字段说明见 skill 的 references/category-config.md。
// ─────────────────────────────────────────────────────────────────────────────

export const categoryConfig = {
  // 品类标识（用于 localStorage 等作用域隔离，保持与目录名一致）
  category: "eu-bike-headlights",

  // 站点文案
  eyebrow: "AMAZON EU (DE · FR · IT · ES) · MARKET POSITIONING MAP",
  siteTitle: "Amazon 欧元站自行车前灯产品路标",
  siteLede:
    "欧元四站（德/法/意/西）单品前灯市场定位图：横轴品牌、纵轴价格。卡片亮度为 listing 原厂标注——欧洲德规产品以 Lux 计，与流明不互换。同一产品跨站合并：销量与销售额求和、评分按评分数加权、价格为在售站均价。",
  snapshotDate: "2026-08-19", // 数据快照日期（数据准备当天；销量为 2026-07 月度估算）

  // 市场与币种
  marketplace: "EU（DE·FR·IT·ES 合并）",
  currencySymbol: "€",

  // 数据口径说明（页面上方黄色提示条，措辞如实、不夸大）
  dataNote:
    "销量与销售额为卖家精灵基于 2026-07 月度商品快照的估算值，并非 Amazon 官方实销数据。四国站点各自 listing，同一产品按 ASIN/品牌型号合并；BSR 取四站最优；法/意/西市场以前后灯套装为主，本图仅收录单品前灯（不含 E-bike 前灯与套装）。",

  // 卡片关键字段：每个品类最值得看的一个规格指标。
  // 欧洲德规（StVZO）市场以 Lux 标注亮度，与流明不可换算，故按原厂标注原样展示。
  keyMetric: {
    label: "亮度标注",
    unit: "",
  },

  // 抽屉详情字段：品类专属属性表，值来自 products.json 的 attributes 对象。
  drawerFields: [
    { key: "powerType", label: "供电方式" },
    { key: "runtime", label: "最高亮度续航" },
    { key: "battery", label: "电池容量", wide: true },
  ] satisfies DrawerField[],
};

export type CategoryConfig = typeof categoryConfig;
