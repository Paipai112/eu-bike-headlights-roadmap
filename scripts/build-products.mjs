import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 欧元四站(DE/FR/IT/ES)自行车单品前灯 products.json 生成器。
// 数据来源：卖家精灵 MCP product_research / competitor_lookup，2026-07 月度估算（EUR）。
//
// 关于"真实销量"（2026-08-19 实测查证）：
//   - 卖家精灵所有销量/销售额均为模型估算口径（亚马逊不公开真实销量，第三方无从获得）
//   - month=202608（当月）查询实测返回与 202607 完全相同的快照 → 2026-07 为最近可用月份
//   - amzBadge 取自亚马逊商品页官方"近一月购买 X+"徽章抓取（amzUnit，滚动 30 天下限值，
//     抓取时点 2026-06-30 至 07-31 不等）——最接近真实的公开口径，作为抽屉第二参考
//
// 收录范围（用户确认，2026-08-19 第三轮调整）：
//   - 品牌白名单 6 家：用户指定 MagicShine / RAVEMEN / LEZYNE
//     + 补充品牌 SIGMA / Trelock / OLIGHT（欧洲亚马逊渠道实际在售、前灯品类全的知名品牌；
//       CatEye 经查证基本不在亚马逊欧洲渠道铺货，未收录）
//   - 仅收自带电池、可 USB 充电的单品前灯
//   - 排除：E-bike 前灯、摩电机（Dynamo）/干电池供电、前后灯套装、纯尾灯、
//     头盔灯（SIGMA Buster 全系为 Helmlicht）、配件；0 销量的长尾型号不入图
//
// 合并口径（用户确认）：
//   - 四国各自 listing，同一产品按 ASIN/品牌型号合并为一条
//   - monthlyUnits / monthlyRevenue：各站求和
//   - rating：按各站评分数加权平均；ratingCount：各站求和
//   - price：在售各站代表价的算术平均
//   - bsr：四站最优（各站 BSR 不可比，取最小值）
//   - fulfillment "NA" 规范化为 "FBM"（非 FBA 非自营的第三方自发货）
// 亮度 keyMetric 为 listing 原厂标注（"80 Lux" / "2600 Lumen"），Lux 与流明不互换，缺失为 null。

const IMG = (id) => `https://images-na.ssl-images-amazon.com/images/I/${id}._AC_US200_.jpg`;

// markets: 每站 [units, revenue, price, rating, ratingsCount]（null = 未在该站上架）
// amzBadge: 亚马逊商品页"近一月购买 X+"徽章（amzUnit 抓取），按站拼接；null = 无徽章数据
const rows = [
  // ── MagicShine（10 款）：德站 StVZO 线 + 法站官方店非德规线 ──────
  {
    asin: "B0FR3MV6GR", brand: "MagicShine", model: "ZX150", series: "ZX",
    title: "Magicshine ZX150 | LED Fahrradlicht 150 Lux | StVZO zugelassenes, akkubetriebenes Vorderlicht mit 2 Leuchtmodi | 230 m Leuchtweite, IPX6 Wasserdichtes Fahrradlichter für Kinder und Erwachsene Schwarz",
    markets: { DE: [168, 11758.32, 69.99, 4.4, 84] },
    bsr: 9364, listingDate: "2025-10", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61e-pRBSXDL", domain: "de",
    keyMetricValue: "150 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: "DE 50+",
  },
  {
    asin: "B0BJKBKWMV", brand: "MagicShine", model: "ZX Pro", series: "ZX",
    title: "MagicShine ZX Pro Fahrradlicht 100 Lux, StVZO Zugelassen mit 3 Leuchtmodi LED Fahrradbeleuchtung, IPX6 Wasserdicht Fahrradlicht USB Aufladbar Fahrradlampe Frontlicht, Gut für Fahrrad Pendeln",
    markets: { DE: [74, 3270.06, 43.99, 4.4, 110] },
    bsr: 23246, listingDate: "2023-01", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61WcenSxT5L", domain: "de",
    keyMetricValue: "100 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0FCF72VJ3", brand: "MagicShine", model: "Hori1300s", series: "HORI",
    title: "Magicshine Hori1300s Feux de Vélo pour la Nuit, Faisceau Haut et Bas, Phare de Vélo Rechargeable USB-C, Éclairage Avant de Vélo Étanche IPX6 pour Cyclistes Urbains et Routiers",
    markets: { FR: [60, 3244.8, 54.08, 4.6, 550], ES: [5, 380.35, 75.73, 5.0, 1] },
    bsr: 3969, listingDate: "2025-07", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 2, qualityScore: 87, weight: null, dimensions: null, badges: [],
    image: "61Tv1nwCMwL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0FJLK5YQ7", brand: "MagicShine", model: "RN1500 V2.0", series: "RN",
    title: "Magicshine RN1500 V2.0 Lampe de vélo Intelligente 1500 lumens, Rechargeable par USB-C IPX7, étanche, éclairage Avant de Cyclisme pour Route, vélo de Montagne Urbain, Conduite de Nuit",
    markets: { FR: [3, 208.44, 69.48, 4.4, 119] },
    bsr: 14604, listingDate: "2025-10", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71D4u5TkSBL", domain: "fr",
    keyMetricValue: "1500 lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0FC6Y6X3M", brand: "MagicShine", model: "Allty 800 V2.0", series: "Allty",
    title: "Magicshine Allty 800 V2.0 Lampe Frontale LED Blanche",
    markets: { FR: [2, 130.46, 65.23, 5.0, 1] },
    bsr: 14980, listingDate: "2025-07", fulfillment: "FBA", sellerName: "KM Sport",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "51sXIBeyhEL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0GZN3NM7L", brand: "MagicShine", model: "URBO FL", series: "URBO",
    title: "Magicshine Éclairage vélo ultraléger URBO FL 48g, Phare Avant Ultra-Lumineux pour Les trajets urbains et Le Cyclisme sur Route, étanche IPX6, Fixation Rapide, Batterie 900 mAh, autonomie de 14,5 h",
    markets: { FR: [21, 656.46, 30.39, 4.7, 50] },
    bsr: 28106, listingDate: "2026-06", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71EWfL3xMRL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: "14.5 h", battery: "900 mAh" },
    amzBadge: null,
  },
  {
    asin: "B09PHDT7DM", brand: "MagicShine", model: "RN 1200", series: "RN",
    title: "Magicshine RN 1200 - Phare avant de vélo - 1200 lumens - Puissant LED de type C - Rechargeable - Étanchéité IPX 7 - 7 modes d'éclairage - Compatible avec tous les vélos",
    markets: { FR: [13, 528.06, 37.71, 4.5, 357] },
    bsr: 27240, listingDate: "2025-03", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61Oz8jjCefL", domain: "fr",
    keyMetricValue: "1200 lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0FBWHT2TP", brand: "MagicShine", model: "Hori900", series: "HORI",
    title: "Magicshine Hori900 Phare de vélo à Double Montage 900 lumens Super Lumineux Indépendant DRL Fast USB-C Charge IPX6 étanche",
    markets: { FR: [6, 252.0, 36.0, 4.2, 270], IT: [26, 1258.4, 47.99, 3.9, 10] },
    bsr: 7441, listingDate: "2025-07", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61uWQXd31XL", domain: "fr",
    keyMetricValue: "900 lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0CNDDDMFX", brand: "MagicShine", model: "Evo 1700", series: "EVO",
    title: "Magicshine Luz Delantera LED Blanca EVO 1700 Negro USB-C con Mando a Distancia",
    markets: { FR: [3, 219.21, 74.0, 4.1, 65], ES: [27, 1696.95, 68.95, 4.1, 62] },
    bsr: 2302, listingDate: "2024-02", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 91, weight: null, dimensions: null, badges: [],
    image: "61ZjeKZVW8L", domain: "es",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0H2HNW5L9", brand: "MagicShine", model: "EVO 1700 Pro", series: "EVO",
    title: "Magicshine EVO 1700 Pro Luz Delantera LED para Bicicleta 1700 lúmenes, USB-C, IPX6, Mando a Distancia inalámbrico y Casquillo MagicLock Tipo GoPro",
    markets: { FR: [2, 116.66, 58.35, null, null], ES: [7, 436.94, 86.88, 5.0, 2] },
    bsr: 11875, listingDate: "2026-06", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "71hZAjyJiCL", domain: "es",
    keyMetricValue: "1700 lúmenes", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },

  // ── RAVEMEN（8 款）：官方店同一 ASIN 覆盖 FR/IT/ES；FR500 另有德站独立 ASIN ──
  {
    asin: "B0GHND3DCV", brand: "RAVEMEN", model: "FR500", series: "FR",
    title: "RAVEMEN FR500 500 Lumens Phare avant pour vélo, compatible avec Garmin/Wahoo Cycloordinateur, jour et nuit visible, 6 modes pour vélo sur route et urbain IPX6",
    markets: { DE: [793, 45954.35, 57.95, 4.8, 78], FR: [72, 3934.8, 49.46, 4.7, 461], IT: [140, 7693.0, 54.95, 4.6, 463], ES: [89, 4890.55, 54.95, 4.6, 457] },
    bsr: 752, listingDate: "2025-06", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61FjQhsccFL", domain: "de",
    keyMetricValue: "500 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: "DE 400+ · FR 50+ · IT 100+ · ES 50+",
  },
  {
    asin: "B0GSVY7723", brand: "RAVEMEN", model: "FR1100 SE", series: "FR",
    title: "RAVEMEN FR1100 SE Faro Anteriore per Bicicletta Compatibile con Garmin/Wahoo/Bryton Ciclocomputer, 1100 Lumen Grandangolare a 270° per la Guida Notturna in Città e Come Diurna Strada 6 Modalità",
    markets: { FR: [132, 8432.16, 58.46, 4.6, 124], IT: [348, 22602.6, 64.95, 4.4, 129], ES: [188, 11958.68, 58.46, 4.6, 124] },
    bsr: 542, listingDate: "2026-04", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71+HrpjnavL", domain: "it",
    keyMetricValue: "1100 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: "FR 50+ · IT 200+ · ES 100+",
  },
  {
    asin: "B0BXCKBVVP", brand: "RAVEMEN", model: "FR160", series: "FR",
    title: "RAVEMEN FR160 Compatibile con Garmin Ciclocomputer, 6 modalità di illuminazione Ciclismo Accessori per Luce Lampeggiante di avvertimento, Type-C IPX6 Impermeabile (Brevetto Protetto)",
    markets: { FR: [65, 2143.7, 32.98, 4.4, 2752], IT: [211, 6528.34, 31.98, 4.5, 2845], ES: [132, 3921.72, 30.95, 4.4, 2766] },
    bsr: 1026, listingDate: "2023-03", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61x+IhMr-gL", domain: "it",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: "FR 50+ · IT 100+ · ES 50+",
  },
  {
    asin: "B0D1C9N4W5", brand: "RAVEMEN", model: "FR300", series: "FR",
    title: "RAVEMEN FR300 Luce Diurna per Bici 300 Lumen Fanalini Anteriori per Bicicletta Compatibile con Garmin/Wahoo Ciclocomputer, 6 Modalità USB C IPX6 Impermeabile (Brevetto Protetto)",
    markets: { FR: [48, 2159.04, 44.98, 4.2, 1035], IT: [107, 4809.65, 44.95, 4.5, 1074], ES: [46, 1931.08, 41.98, 4.5, 1031] },
    bsr: 2372, listingDate: "2024-04", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61b3fxzkw-L", domain: "it",
    keyMetricValue: "300 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0FPQ918GK", brand: "RAVEMEN", model: "FR1000", series: "FR",
    title: "RAVEMEN FR1000 1000 Lumens Phare Avant pour Un éclairage Nocturne et Une Visibilité Diurne Compatible avec Garmin/Wahoo/Bryton Compteurs Vélo, éclairage et Support intégrés, Marche/Arrêt Automatique",
    markets: { FR: [16, 1199.2, 74.95, 4.6, 75] },
    bsr: 42806, listingDate: "2025-10", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61wQFBOjGWL", domain: "fr",
    keyMetricValue: "1000 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0BZVGW6RK", brand: "RAVEMEN", model: "CR1000", series: "CR",
    title: "RAVEMEN CR1000 Phare Avant pour Vélo, 1000 Lumens Lentille Anti-éblouissement avec Faisceau en T Éclairage Avant Vélo, Conduite de Nuit, Bouton à Distance Filaire, Résistance à l'eau IPX6 USB-C",
    markets: { FR: [2, 139.98, 69.99, 4.3, 56] },
    bsr: 30920, listingDate: "2023-06", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61rjO5ItVHL", domain: "fr",
    keyMetricValue: "1000 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0D5B5DW48", brand: "RAVEMEN", model: "K1800", series: "K",
    title: "RAVEMEN 1800 Lumens Intelligente Phare Avant pour Vélo, K1800 Mode de Conduite Intelligent de Nuit et de Jour, Chargement et Déchargement USB-C IPX7",
    markets: { FR: [9, 728.91, 80.99, 4.4, 50] },
    bsr: 38047, listingDate: "2024-07", fulfillment: "FBA", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61lWE7OOntL", domain: "fr",
    keyMetricValue: "1800 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0CF1WTCKF", brand: "RAVEMEN", model: "PR2400", series: "PR",
    title: "RAVEMEN 2400 Lumen Feu Avant de vélo, PR 2400 Faisceau Anti-éblouissement avec télécommande sans Fil, Affichage de l'autonomie OLED Type-C IPX8 étanche pour Le vélo de Route/VTT",
    markets: { FR: [7, 1259.93, 179.99, 4.3, 56] },
    bsr: 36773, listingDate: "2023-09", fulfillment: "FBM", sellerName: "RAVEMEN Official",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "618UxDK8mdL", domain: "fr",
    keyMetricValue: "2400 Lumen", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },

  // ── LEZYNE（10 款）：德/意/西站无前灯在售（仅泵/工具），法站为亚马逊自营铺货线 ──
  {
    asin: "B0C7SGPNY8", brand: "LEZYNE", model: "Micro Drive 800+", series: "Drive",
    title: "Lezyne Micro Drive 800+ Front Light 800 Lumens",
    markets: { FR: [4, 235.32, 58.88, 4.4, 47] },
    bsr: 57418, listingDate: "2024-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 62, weight: null, dimensions: null, badges: [],
    image: "61qHz2s5O7L", domain: "fr",
    keyMetricValue: "800 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0C7SF7979", brand: "LEZYNE", model: "Classic Drive XL 700+", series: "Drive",
    title: "Lezyne Classic Drive Xl 700+ Front Light 700 Lumens",
    markets: { FR: [4, 203.96, 50.99, 4.2, 10] },
    bsr: 156215, listingDate: "2024-02", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "51VLrawh8VL", domain: "fr",
    keyMetricValue: "700 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B07QNLJB6Z", brand: "LEZYNE", model: "Hecto Drive 500 XL", series: "Drive",
    title: "LEZYNE Luce hecto Drive 500 XL anteriore Nero",
    markets: { FR: [3, 111.0, 37.0, 4.3, 187] },
    bsr: 11320, listingDate: "2019-07", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 2, qualityScore: 76, weight: null, dimensions: null, badges: [],
    image: "51ujQzplpzL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0CJ5C4WCC", brand: "LEZYNE", model: "Super Drive 1800+", series: "Drive",
    title: "Lezyne Super Drive 1800+ Phare avant intelligent pour vélo de route, montagne, vélo de gravier, rechargeable USB-C",
    markets: { FR: [3, 404.97, 134.99, 3.9, 8] },
    bsr: 15200, listingDate: "2024-02", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 59, weight: null, dimensions: null, badges: [],
    image: "61CWIb0phtL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0C7RTTSH1", brand: "LEZYNE", model: "Zecto Drive 250+", series: "Drive",
    title: "Lezyne Zecto Drive 250+ Front Light 250 Lumens",
    markets: { FR: [2, 69.98, 34.99, 4.8, 42] },
    bsr: 80734, listingDate: "2024-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "61VB2orbm-L", domain: "fr",
    keyMetricValue: "250 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B07QRYSVPB", brand: "LEZYNE", model: "Mini Drive 400", series: "Drive",
    title: "LEZYNE Mini Drive 400 Eclairage vélo/VTT LED Rechargeable USB Mixte Adulte",
    markets: { FR: [1, 25.99, 25.99, 4.3, 193] },
    bsr: 18225, listingDate: "2019-12", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 76, weight: null, dimensions: null, badges: [],
    image: "617AfsmKWEL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0C7RSL4BH", brand: "LEZYNE", model: "Fusion Drive 600+", series: "Drive",
    title: "Lezyne Fusion Drive 600+ Front Light 600 Lumens",
    markets: { FR: [1, 48.99, 48.99, 4.3, 16] },
    bsr: 90842, listingDate: "2024-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "616Wp6BQ9sL", domain: "fr",
    keyMetricValue: "600 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0C7S55N13", brand: "LEZYNE", model: "Lite Drive", series: "Drive",
    title: "Lezyne Lite Drive Feu avant de vélo LED blanche pour route, montagne, gravier, rechargeable par USB",
    markets: { FR: [1, 78.3, 78.3, 4.0, 24] },
    bsr: 75892, listingDate: "2023-09", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "61LRI7G33oL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0C7SBXNQR", brand: "LEZYNE", model: "Classic Drive 500/+", series: "Drive",
    title: "Lezyne Classic Drive 500/+ Feu avant de vélo 500 lumens rechargeable par USB",
    markets: { FR: [1, 54.99, 54.99, 5.0, 1] },
    bsr: 62677, listingDate: "2023-10", fulfillment: "FBM", sellerName: "Shopping Factory",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "61BS5a0BQSL", domain: "fr",
    keyMetricValue: "500 lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B07QQTN1TW", brand: "LEZYNE", model: "Femto USB", series: "Femto",
    title: "LEZYNE Femto Clé USB avant de vélo rechargeable IPX7 LED Lumière avant avec plusieurs modes solide et flash | Sangle de montage polyvalente en caoutchouc de silicone incluse",
    markets: { FR: [1, 27.44, 27.44, 3.8, 34] },
    bsr: 80089, listingDate: "2019-09", fulfillment: "FBM", sellerName: "RAREWAVES-FR",
    variationCount: 4, qualityScore: 68, weight: null, dimensions: null, badges: [],
    image: "51sFw-TiNAL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },

  // ── SIGMA（5 款）：德站 StVZO 头部品牌，自带电池 Aura 线；法/意/西无前灯单品 ──
  //（Buster 全系为头盔灯、Aura 30 为干电池、Aura 100 仅随套装销售，均已排除）
  {
    asin: "B07YLXZ4FY", brand: "SIGMA", model: "Aura 80", series: "Aura",
    title: "Sigma Aura 80 | LED Fahrradlicht 80 Lux | StVZO zugelassenes, akkubetriebenes Vorderlicht mit 4 Leuchtmodi | 90 m Leuchtweite",
    markets: { DE: [956, 34329.96, 32.99, 4.6, 2701], FR: [1, 43.95, 43.95, 4.6, 2507] },
    bsr: 1260, listingDate: "2019-10", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 99, weight: "115 g", dimensions: "17.5 x 14.5 x 4.5 cm",
    badges: ["bestSeller", "amazonChoice"],
    image: "61D3Dfop9RL", domain: "de",
    keyMetricValue: "80 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: "DE 400+",
  },
  {
    asin: "B07GTN4YNG", brand: "SIGMA", model: "Aura 60 USB", series: "Aura",
    title: "SIGMA Aura 60 USB | Fahrrad Frontleuchte mit 60 LUX | StVZO zugelassenes, akkubetriebenes Vorderlicht | 3 Leuchtmodi | wetterfestes & wiederaufladbares Frontlicht",
    markets: { DE: [369, 11601.36, 34.95, 4.5, 3233] },
    bsr: 7877, listingDate: "2018-09", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "510iUtiM1DL", domain: "de",
    keyMetricValue: "60 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: "DE 100+",
  },
  {
    asin: "B0FMY4VQKF", brand: "SIGMA", model: "Aura 50", series: "Aura",
    title: "SIGMA Aura 50 | LED Fahrradlicht mit 50 LUX und USB-C | StVZO zugelassenes Vorderlicht mit 2 Leuchtmodi & Automatische Lichtanpassung | Lange Akkulaufzeit",
    markets: { DE: [17, 675.24, 38.99, 4.4, 5] },
    bsr: 84796, listingDate: "2026-01", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 96, weight: null, dimensions: null, badges: [],
    image: "71tNJTv+T7L", domain: "de",
    keyMetricValue: "50 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0FMY2JNRZ", brand: "SIGMA", model: "Aura 40", series: "Aura",
    title: "SIGMA Aura 40 | StVZO konformes LED Fahrradlicht mit 40 LUX | Vorderlicht mit 2 Leuchtmodi | lange Akkulaufzeit | USB-C",
    markets: { DE: [34, 987.7, 24.95, null, null] },
    bsr: 26649, listingDate: "2025-12", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "71nzHcExggL", domain: "de",
    keyMetricValue: "40 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0017H98GW", brand: "SIGMA", model: "Aura 35", series: "Aura",
    title: "SIGMA Aura 35 | LED Fahrradlicht mit 35 LUX | StVZO zugelassenes, akkubetriebenes Vorderlicht | 2 Leuchtmodi | wetterfestes & wiederaufladbares Frontlicht",
    markets: { DE: [21, 661.71, 33.31, 4.4, 542] },
    bsr: 56311, listingDate: "2019-09", fulfillment: "FBM", sellerName: "MSZweirad",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "71LQmBfYseL", domain: "de",
    keyMetricValue: "35 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },

  // ── Trelock（2 款）：德系老牌，亚马逊渠道灯只剩两款；E-Bike 系/套装/摩电机款排除 ──
  {
    asin: "B07CYZ4ZLB", brand: "Trelock", model: "LS 760 I-Go Vision", series: "LS",
    title: "TRELOCK LS 760 I-Go Vision – Fahrradlicht 100 Lux – USB Aufladbar – LED Fahrradlampe mit 5 Lichtmodi – 120 m Sichtweite",
    markets: { DE: [125, 9243.75, 75.99, 4.2, 443] },
    bsr: 15203, listingDate: "2019-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "719uwDGFJRL", domain: "de",
    keyMetricValue: "100 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: "DE 50+",
  },
  {
    asin: "B0DZ2BT2ST", brand: "Trelock", model: "LS 480 Lighthammer", series: "LS",
    title: "TRELOCK Fahrradlicht LS 480 LIGHTHAMMER 80 LUX – USB Ladefunktion – 100 m Sichtweite – 20 Stunden Leuchtdauer – LED Batterieindikator – StVZO zugelassen",
    markets: { DE: [24, 910.8, 37.95, 3.8, 12] },
    bsr: 72990, listingDate: "2025-03", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 94, weight: null, dimensions: null, badges: [],
    image: "61mLEQU1PcL", domain: "de",
    keyMetricValue: "80 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: "20 h", battery: null },
    amzBadge: null,
  },

  // ── OLIGHT（6 款）：RN 线法/意/西同 ASIN 跨国销售；德站仅第三方在售的 ZX Pro ──
  {
    asin: "B0C8MQF56P", brand: "OLIGHT", model: "RN 2000", series: "RN",
    title: "OLIGHT RN 2000 Luce Anteriore Bici Led Ricaricabili Usb 2000 Lumen 170 m | Fanale Anteriore Bicicletta Telecomandato Senza Fili, IPX6 Impermeabile, Sensore di Luce Intelligente, per Mountain Road",
    markets: { IT: [46, 4965.7, 107.95, 4.4, 240], FR: [9, 971.55, 107.95, 4.2, 233], ES: [12, 1295.4, 107.95, 4.4, 229] },
    bsr: 8601, listingDate: "2023-09", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61WcyWjJSLL", domain: "it",
    keyMetricValue: "2000 Lumen", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B08FDHF928", brand: "OLIGHT", model: "RN1500", series: "RN",
    title: "OLIGHT RN1500 Lampada Anteriore per Bici, Potenza Massima 1500 Lumen, Batteria con 3 Modalità Fisse e 2 Flash, per Aumentare la Sicurezza di Guida, Antiriflesso USB Ricaricabile per Bici",
    markets: { IT: [35, 3437.7, 117.26, 4.6, 868], ES: [7, 671.65, 95.95, 4.6, 849] },
    bsr: 4456, listingDate: "2020-08", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "51SoT2yajSL", domain: "it",
    keyMetricValue: "1500 Lumen", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B08GKH9NYV", brand: "OLIGHT", model: "RN 800", series: "RN",
    title: "OLIGHT RN 800 Éclairage Vélo Puissante 800 Lumens 137 Mètres Étanche IPX6 | Éclairage Vélo Rechargeable avec Batterie, Lampe Vélo Avant Antichoc et Antireflet, pour VTT Route et Cyclisme Nocturne",
    markets: { FR: [7, 489.65, 69.95, 4.5, 447], IT: [27, 2302.83, 86.84, 4.5, 463] },
    bsr: 15235, listingDate: "2020-09", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61pzo18y5AL", domain: "fr",
    keyMetricValue: "800 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B08HGJ9LQX", brand: "OLIGHT", model: "RN 400", series: "RN",
    title: "OLIGHT RN 400 Lumière de Bicyclette 400 Lumens L'Autonomie 7H Étanche IPX7 | Éclairage de Vélo Projecteur Avant, Puissant 89 m, pour Déverrouiller Phare, Rechargeable Rapide",
    markets: { FR: [4, 143.8, 35.95, 4.1, 1758], IT: [5, 221.65, 44.33, 4.4, 1791], ES: [11, 395.45, 35.95, 4.4, 1756] },
    bsr: 10258, listingDate: "2020-11", fulfillment: "FBA", sellerName: "Olight GmbH",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61TAoYBuC-L", domain: "fr",
    keyMetricValue: "400 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: "7 h", battery: null },
    amzBadge: null,
  },
  {
    asin: "B0B9G8NTR5", brand: "OLIGHT", model: "ZX Pro", series: "ZX",
    title: "OLIGHT ZX Pro Fahrradlicht Vorne 100 Lux 208M Leuchtkraft, StVZO Zugelassen mit 3 Leuchtmodi LED Fahrradbeleuchtung, IPX6 Wasserdicht USB Aufladbare Fahrradlampe Frontlicht, Gut für Radsport Pendeln",
    markets: { DE: [0, 0.0, 59.95, 4.1, 229] },
    bsr: 122255, listingDate: "2022-10", fulfillment: "FBA", sellerName: "Guangdi Digital",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61v1FGh3GqL", domain: "de",
    keyMetricValue: "100 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
    amzBadge: null,
  },
  {
    asin: "B0DZWY1TRF", brand: "OLIGHT", model: "Goshawk 1600", series: "Goshawk",
    title: "OLIGHT Goshawk 1600 Luz Bicicleta Delantera 1600 lúmenes Alta Potencia IPX6 | Luces Bicicleta LED con Control Remoto Inalámbrico y Recargables USB-C Para Ciclismo de Montaña y Carretera Nocturna",
    markets: { ES: [2, 115.14, 57.57, 4.6, 6] },
    bsr: 78759, listingDate: "2025-09", fulfillment: "FBM", sellerName: "Guangdi Digital",
    variationCount: 1, qualityScore: 98, weight: null, dimensions: null, badges: [],
    image: "61Q6T3pdLmL", domain: "es",
    keyMetricValue: "1600 lúmenes", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
    amzBadge: null,
  },
];

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function mergeMarkets(markets) {
  const entries = Object.values(markets);
  const totalUnits = entries.reduce((sum, [units]) => sum + units, 0);
  const totalRevenue = entries.reduce((sum, [, revenue]) => sum + revenue, 0);
  const avgPrice = entries.reduce((sum, [, , price]) => sum + price, 0) / entries.length;
  const ratingTotal = entries.reduce(
    (sum, [, , , rating, count]) => (rating === null ? sum : sum + rating * (count ?? 0)),
    0,
  );
  const ratingCountTotal = entries.reduce((sum, [, , , , count]) => sum + (count ?? 0), 0);
  const rating =
    ratingCountTotal > 0 ? round(ratingTotal / ratingCountTotal, 1) : null;
  return {
    monthlyUnits: totalUnits,
    monthlyRevenue: round(totalRevenue, 2),
    price: round(avgPrice, 2),
    averagePrice: round(avgPrice, 2),
    rating,
    ratingCount: ratingCountTotal > 0 ? ratingCountTotal : null,
  };
}

const products = rows.map((row) => ({
  brand: row.brand,
  model: row.model,
  series: row.series,
  asin: row.asin,
  title: row.title,
  ...mergeMarkets(row.markets),
  bsr: row.bsr,
  listingDate: row.listingDate,
  fulfillment: row.fulfillment,
  sellerName: row.sellerName,
  variationCount: row.variationCount,
  qualityScore: row.qualityScore,
  weight: row.weight,
  dimensions: row.dimensions,
  badges: row.badges,
  amazonUrl: `https://www.amazon.${row.domain}/dp/${row.asin}`,
  imageUrl: IMG(row.image),
  keyMetricValue: row.keyMetricValue,
  keyMetricSource: row.keyMetricSource,
  attributes: {
    marketsSold: Object.keys(row.markets).join(" · "),
    amzBadge: row.amzBadge,
    ...row.attributes,
  },
}));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "products.json"), `${JSON.stringify(products, null, 2)}\n`, "utf8");

const withMetric = products.filter((p) => p.keyMetricValue !== null).length;
const multiMarket = rows.filter((r) => Object.keys(r.markets).length > 1).length;
const brandCount = new Set(products.map((p) => p.brand)).size;
console.log(
  `已生成 ${products.length} 款产品（${brandCount} 个品牌）→ src/data/products.json` +
    `（亮度标注 ${withMetric} 款有数据 / ${products.length - withMetric} 款缺失；跨站合并 ${multiMarket} 款）`,
);
