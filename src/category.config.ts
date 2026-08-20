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
    "欧元四站（德/法/意/西）单车前灯市场定位图：横轴品牌、纵轴价格。仅收录品牌白名单 6 家——用户指定 MagicShine/RAVEMEN/LEZYNE + 补充品牌 SIGMA/Trelock/OLIGHT——中自带电池、可 USB 充电的单品前灯；E-bike 前灯、摩电机/干电池供电、前后灯套装与头盔灯均不在图内。卡片亮度为 listing 原厂标注——欧洲德规产品以 Lux 计，与流明不互换。同一产品跨站合并：销量与销售额求和、评分按评分数加权、价格为在售站均价，抽屉内标注各站在售情况。",
  snapshotDate: "2026-08-19", // 数据快照日期（数据准备当天；销量为 2026-07 月度估算）

  // 市场与币种
  marketplace: "EU（DE·FR·IT·ES 合并）",
  currencySymbol: "€",

  // 数据口径说明（页面上方黄色提示条，措辞如实、不夸大）
  dataNote:
    "销量与销售额为卖家精灵基于 2026-07 月度商品快照的估算值，并非 Amazon 官方实销数据。四国站点各自 listing，同一产品按 ASIN/品牌型号合并；BSR 取四站最优。补充品牌依据：SIGMA/Trelock/OLIGHT 为欧洲亚马逊渠道实际在售、前灯品类较全的知名品牌；CatEye 经查证基本不在亚马逊欧洲渠道铺货（德/法站以车铃、码表与零星旧款为主），未收录。已按规则排除：SIGMA Aura 30（干电池）、SIGMA Buster 全系（头盔灯）、SIGMA Aura 100（仅随套装销售，无单品 listing）、Trelock Lighthammer E-Bike 系、AXA/Büchel/nean 等摩电机（Dynamo）供电款。",

  // 卡片关键字段：每个品类最值得看的一个规格指标。
  // 欧洲德规（StVZO）市场以 Lux 标注亮度，与流明不可换算，故按原厂标注原样展示。
  keyMetric: {
    label: "亮度标注",
    unit: "",
  },

  // 抽屉详情字段：品类专属属性表，值来自 products.json 的 attributes 对象。
  drawerFields: [
    { key: "marketsSold", label: "在售站点", wide: true },
    { key: "powerType", label: "供电方式" },
    { key: "runtime", label: "最高亮度续航" },
    { key: "battery", label: "电池容量", wide: true },
  ] satisfies DrawerField[],
};

export type CategoryConfig = typeof categoryConfig;
