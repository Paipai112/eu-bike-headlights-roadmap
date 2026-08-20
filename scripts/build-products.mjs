import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 欧元四站(DE/FR/IT/ES)自行车单品前灯 products.json 生成器。
// 数据来源：卖家精灵 MCP product_research / competitor_lookup，2026-07 月度估算（EUR）。
// 合并口径（用户确认）：
//   - 四国各自 listing，同一产品按 ASIN/品牌型号合并为一条
//   - monthlyUnits / monthlyRevenue：各站求和
//   - rating：按各站评分数加权平均；ratingCount：各站求和
//   - price：在售各站代表价的算术平均
//   - bsr：四站最优（各站 BSR 不可比，取最小值）
//   - fulfillment "NA" 规范化为 "FBM"（非 FBA 非自营的第三方自发货）
// 范围（用户确认）：单品前灯；排除前后灯套装、纯尾灯、E-bike 专用前灯、配件。
// 亮度 keyMetric 为 listing 原厂标注（"80 Lux" / "2600 Lumen"），Lux 与流明不互换，缺失为 null。

const IMG = (id) => `https://images-na.ssl-images-amazon.com/images/I/${id}._AC_US200_.jpg`;

// markets: 每站 [units, revenue, price, rating, ratingsCount]（null = 未在该站上架）
const rows = [
  // ── 跨站合并（5 款）────────────────────────────────────────────
  {
    asin: "B07K26W457", brand: "nean", model: "LED 30 LUX（电池版）", series: "其他",
    title: "nean LED Fahrradlicht, Fahrradlampe, Fahrrad Frontlicht, Fahrradleuchte vorne, Scheinwerfer hell mit StVZO Zulassung, inkl. 4X Batterie, 30 LUX, schwarz",
    markets: { DE: [333, 4295.7, 12.9, 4.2, 3173], FR: [41, 642.88, 15.68, 4.3, 3033], IT: [83, 1211.8, 14.6, 4.4, 3041], ES: [14, 180.6, 12.9, 4.2, 3] },
    bsr: 5588, listingDate: "2018-11", fulfillment: "FBA", sellerName: "NEANversand GmbH - DE",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "61zFYRynKWL", domain: "de",
    keyMetricValue: "30 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "干电池（含 4 节电池）", runtime: null, battery: null },
  },
  {
    asin: "B08P3LYZXZ", brand: "nean", model: "LED 70 LUX Dynamo", series: "其他",
    title: "nean LED 70 LUX Dynamo Fahrradlicht mit Lichtautomatik Standlicht und StVZO, Fahrradlampe, Fahrrad Frontlicht, Fahrradleuchte vorne, Scheinwerfer mit Aluminium-Kühlplatte, schwarz",
    markets: { DE: [703, 10474.7, 14.9, 4.5, 2252], FR: [18, 303.84, 16.88, 4.5, 2101] },
    bsr: 1737, listingDate: "2020-12", fulfillment: "FBA", sellerName: "NEANversand GmbH - DE",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "61GVCg8ztdL", domain: "de",
    keyMetricValue: "70 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B0FYHMMCNK", brand: "AXA", model: "Echo 15 Switch", series: "其他",
    title: "AXA Echo 15 Switch – Dynamo Fahrradlicht – 15 Lux – mit Reflektor – Sichtbar von der Seite – StVZO zugelassen",
    markets: { DE: [200, 2284.0, 11.49, 4.9, 17], FR: [9, 174.69, 21.0, 4.8, 12] },
    bsr: 7061, listingDate: "2025-11", fulfillment: "FBM", sellerName: "2Wheelshop B.V.",
    variationCount: 1, qualityScore: 83, weight: null, dimensions: null, badges: [],
    image: "51poUIH-UjL", domain: "de",
    keyMetricValue: "15 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B07XPBJZ21", brand: "Fischer", model: "Dynamo LED-Scheinwerfer 70 LUX", series: "其他",
    title: "FISCHER Fahrrad Dynamo LED-Scheinwerfer 70 LUX | Fahrradlampe mit Standlichtfunktion | LED-Fahrradlicht mit Dämmerungsautomatik",
    markets: { DE: [177, 3347.07, 19.99, 4.5, 1003], FR: [4, 91.36, 20.58, 4.6, 940], ES: [2, 45.34, 21.03, 4.6, 937] },
    bsr: 10616, listingDate: "2020-02", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61Wzn3cmYnL", domain: "de",
    keyMetricValue: "70 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
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
  },

  // ── 德站单品（26 款）──────────────────────────────────────────
  {
    asin: "B0CYT3B6MG", brand: "OnMeto", model: "Fahrradlicht Vorne", series: "其他",
    title: "OnMeto Fahrradlicht vorne, IPX5 Wasserdicht Frontfahrrad Lampe Fahrrad licht，USB Type-C Wiederaufladbares Fahrradleuchten für Fahrrad",
    markets: { DE: [1718, 25993.34, 14.93, 4.3, 765] },
    bsr: 434, listingDate: "2024-06", fulfillment: "FBA", sellerName: "Enledic Limited",
    variationCount: 3, qualityScore: 97, weight: "40 g", dimensions: "9.2 x 8 x 5.2 cm",
    badges: ["bestSeller", "amazonChoice"],
    image: "61aIS47DYGL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
  },
  {
    asin: "B0C2YW5JR6", brand: "Ventvinal", model: "LED Fahrradlicht Vorne 100 LUX", series: "其他",
    title: "LED Fahrradlicht Vorne 100 LUX, Fahrradbeleuchtung stvzo zugelassen, Fahrradlampe USB Aufladbar mit Batterie Aufforderung schwach und 3 Leuchtmodi, IPX5 Blendfreies Design, Schwarz",
    markets: { DE: [931, 22455.72, 24.99, 4.4, 778] },
    bsr: 1538, listingDate: "2023-04", fulfillment: "FBA", sellerName: "QYEU",
    variationCount: 1, qualityScore: 80, weight: "160 g", dimensions: "11.6 x 9.9 x 5.9 cm",
    badges: ["amazonChoice"],
    image: "71JhtJETxoL", domain: "de",
    keyMetricValue: "100 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
  },
  {
    asin: "B06WWK1772", brand: "Büchel", model: "Tour Dynamo Lampe 45 LUX", series: "其他",
    title: "BÜCHEL Tour Dynamo Lampe mit Standlicht und StVZO Zulassung I 45 LUX Fahrradlampe vorne, LED Standlicht, Fahrrad Scheinwerfer, LED Fahrradlicht vorne",
    markets: { DE: [602, 10228.0, 16.99, 4.6, 2711] },
    bsr: 1721, listingDate: "2021-09", fulfillment: "FBA", sellerName: "KLB Trade GmbH",
    variationCount: 2, qualityScore: null, weight: null, dimensions: null, badges: [],
    image: "615D0pgjGgL", domain: "de",
    keyMetricValue: "45 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B0FM7FTYPR", brand: "toptrek", model: "Fahrradlicht Vorne", series: "其他",
    title: "toptrek Fahrradlicht Vorne 5-8h Akkulaufzeit StVZO Fahrradlampe Vorne | USB-C Aufladbar Vorderlicht, Batterie Aufforderung Schwach, IPX5 Fahrrad Frontlicht für Rennrad E-Bike MTB Citybike",
    markets: { DE: [596, 8451.28, 13.67, 4.4, 213] },
    bsr: 1634, listingDate: "2025-09", fulfillment: "FBA", sellerName: "DrotenDirect DE",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61wWjuOuFRL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: "5–8 h", battery: null },
  },
  {
    asin: "B0DJXYB24R", brand: "Realky", model: "LED Fahrrad Licht Vorne", series: "其他",
    title: "LED Fahrrad Licht Vorne Fahrradlicht USB C Aufladbar Fahrradlampe mit 1000mAh Akku, StVZO Zugelassen Fahrradbeleuchtung Vorne IPX5 Wasserdicht Fahrrad Frontlichter für Fahrrad Rennrad MTB Ebike",
    markets: { DE: [425, 6970.0, 16.89, 4.3, 424] },
    bsr: 2854, listingDate: "2024-11", fulfillment: "FBA", sellerName: "Fenyes Napkereskedes Kft.",
    variationCount: 2, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61Xl3Ox42PL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: "1,000 mAh" },
  },
  {
    asin: "B0FM6T8H53", brand: "Tavaler", model: "Fahrradlicht Vorne", series: "其他",
    title: "Tavaler Fahrradlicht Vorne USB C Aufladbar StVZO Zugelassen Fahrrad Licht | Fahrradlampe Vorne Akku IPX5 Wasserdicht Fahrradbeleuchtung Vorne LED Fahrrad Frontlicht für Rennrad E-Bike MTB Citybike",
    markets: { DE: [400, 5520.0, 13.57, 4.2, 156] },
    bsr: 3674, listingDate: "2025-09", fulfillment: "FBA", sellerName: "FasteeDirect DE",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "51FS0ePklBL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
  },
  {
    asin: "B08GPV3QGK", brand: "SIGMA", model: "Aura 30", series: "Aura",
    title: "SIGMA AURA 30 | LED Fahrradlicht 30 Lux | StVZO zugelassenes, batteriebetriebenes Vorderlicht | 2 Leuchtmodi | Farbe: Schwarz",
    markets: { DE: [324, 4040.28, 11.99, 4.3, 1199] },
    bsr: 7809, listingDate: "2020-08", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "61GZQlNHehL", domain: "de",
    keyMetricValue: "30 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "干电池", runtime: null, battery: null },
  },
  {
    asin: "B0F3V1YJN3", brand: "Addview", model: "Nova M40", series: "Nova",
    title: "ADDVIEW Dynamo Fahrradlicht 40 Lux Nova M40 – StVZO Frontscheinwerfer mit Tagfahrlicht, Standlichtfunktion, 6V AC, IP65, K-Reflektor, für Nabendynamo oder Seitenläufer geeignet",
    markets: { DE: [255, 3312.45, 12.99, 4.5, 45] },
    bsr: 7477, listingDate: "2025-04", fulfillment: "FBA", sellerName: "Grena Electronics",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71H+kBJv1lL", domain: "de",
    keyMetricValue: "40 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B0G529663G", brand: "OnWEG", model: "Fahrradlicht Vorne（Auto-Sensor）", series: "其他",
    title: "Fahrradlicht Vorne StVZO, Osram LED mit Auto-Sensor 4 Leuchtmodi, IPX4 Spritzwassergeschützt, USB-C Aufladbar, Batterieanzeige, Fahrradlampe vorne mit Schnellspanner für Citybike, E-Bike & MTB",
    markets: { DE: [243, 4704.48, 19.99, 4.6, 43] },
    bsr: 5680, listingDate: "2026-04", fulfillment: "FBA", sellerName: "Cambivo-DE",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71+idDeL4RL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
  },
  {
    asin: "B0FR3MV6GR", brand: "MagicShine", model: "ZX150", series: "ZX",
    title: "Magicshine ZX150 | LED Fahrradlicht 150 Lux | StVZO zugelassenes, akkubetriebenes Vorderlicht mit 2 Leuchtmodi | 230 m Leuchtweite, IPX6 Wasserdichtes Fahrradlichter für Kinder und Erwachsene Schwarz",
    markets: { DE: [168, 11758.32, 69.99, 4.4, 84] },
    bsr: 9364, listingDate: "2025-10", fulfillment: "FBA", sellerName: "magicshineEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61e-pRBSXDL", domain: "de",
    keyMetricValue: "150 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
  },
  {
    asin: "B0FXG6NDZG", brand: "UPPEL", model: "Fahrradlicht Vorne 2600", series: "其他",
    title: "UPPEL Fahrradlicht Vorne 2600 Lumens USB C Ladeanschluss 5 LEDs 8000mah 4-Lichtmodi Einfache Installation Beste Aluminium Fahrradlampe Vorne für Nacht Reiten",
    markets: { DE: [151, 6795.0, 45.0, 4.0, 19] },
    bsr: 5050, listingDate: "2026-05", fulfillment: "FBA", sellerName: "Richwe",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71HDVFTwZPL", domain: "de",
    keyMetricValue: "2600 Lumens", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: "8,000 mAh" },
  },
  {
    asin: "B014ODD49W", brand: "AXA", model: "Blueline 30-T Steady Auto", series: "其他",
    title: "AXA Blueline 30-T Steady Auto – Dynamo Fahrradlicht 30 Lux – Steady-Light-Funktion – StVZO Zulassung",
    markets: { DE: [144, 4429.44, 30.03, 4.4, 190] },
    bsr: 19858, listingDate: "2021-09", fulfillment: "FBM", sellerName: "SAM'S SportsAndMoreShop GmbH",
    variationCount: 1, qualityScore: 98, weight: null, dimensions: null, badges: [],
    image: "81WlhXNaOXL", domain: "de",
    keyMetricValue: "30 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B0DG51ZNV5", brand: "Glückpa", model: "LED Fahrradlicht Vorne 1400", series: "其他",
    title: "LED Fahrradlicht Vorne, 1400 Lumen, 4500mAh Super Akku-Kapazität Fahrradbeleuchtung，Fahrradlampe Extrem Hell, StVZO Standard, Fahrrad Licht Vorne mit 5 Lichtmodi, Fahrradlampe Vorne mit USB C",
    markets: { DE: [144, 3598.56, 24.99, 4.3, 104] },
    bsr: 14108, listingDate: "2024-09", fulfillment: "FBM", sellerName: "Glückpa Spielzeugwelt",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71RZGYPkFAL", domain: "de",
    keyMetricValue: "1400 Lumen", keyMetricSource: "商品标题",
    attributes: { powerType: "USB-C 充电", runtime: null, battery: "4,500 mAh" },
  },
  {
    asin: "B0CNPPGB9T", brand: "HENMI", model: "LED Fahrradlicht Vorne 100 Lux", series: "其他",
    title: "HENMI LED Fahrradlicht Vorne,100 Lux USB Aufladbar Fahrradbeleuchtung mit 3 Beleuchtungsmodi, StVZO Zugelassen Fahrradlampe mit Batterieindikator, IPX5 Wasserdicht und Keine Blendung",
    markets: { DE: [142, 3122.58, 21.99, 4.3, 190] },
    bsr: 9333, listingDate: "2023-11", fulfillment: "FBA", sellerName: "DECEU",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71oW6+yXpZL", domain: "de",
    keyMetricValue: "100 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
  },
  {
    asin: "B07CYZ4ZLB", brand: "Trelock", model: "LS 760 I-Go Vision", series: "其他",
    title: "TRELOCK LS 760 I-Go Vision – Fahrradlicht 100 Lux – USB Aufladbar – LED Fahrradlampe mit 5 Lichtmodi – 120 m Sichtweite",
    markets: { DE: [125, 9243.75, 75.99, 4.2, 443] },
    bsr: 15203, listingDate: "2019-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "719uwDGFJRL", domain: "de",
    keyMetricValue: "100 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
  },
  {
    asin: "B015DK23Q0", brand: "Busch & Müller", model: "Lumotec IQ Eyro", series: "其他",
    title: "Busch & Müller Scheinwerfer Lumotec IQ Eyro Fahrradlicht, Schwarz, 10 x 4 x 3 cm",
    markets: { DE: [120, 3598.8, 29.99, 4.4, 330] },
    bsr: 38160, listingDate: "2019-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 88, weight: null, dimensions: "10 x 4 x 3 cm", badges: [],
    image: "81QqOQyBWUL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: null, runtime: null, battery: null },
  },
  {
    asin: "B0F83Z2CWZ", brand: "OnWEG", model: "Fahrradlicht Vorne（快拆）", series: "其他",
    title: "Fahrradlicht Vorne, USB-C wiederaufladbare Fahrradlampe vorne mit Auto-Sensor, 4 Leuchtmodi, 100m Sichtweite, IPX4 Wasserdicht, Batterieanzeige, schnell abnehmbar für Citybike E-Bike MTB",
    markets: { DE: [117, 2091.96, 14.99, 4.3, 50] },
    bsr: 6488, listingDate: "2025-05", fulfillment: "FBA", sellerName: "Cambivo-DE",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71LyR-OZRaL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB-C 充电", runtime: null, battery: null },
  },
  {
    asin: "B078XGQ29S", brand: "nean", model: "Dynamo 30 LUX", series: "其他",
    title: "nean LED Dynamo Fahrradlicht 30 LUX mit Lichtautomatik, Standlicht und StVZO Zulassung, Fahrradlampe, Fahrrad Frontlicht, Fahrradleuchte vorne, Scheinwerfer, schwarz",
    markets: { DE: [114, 1470.6, 12.9, 4.6, 1549] },
    bsr: 12102, listingDate: "2018-11", fulfillment: "FBA", sellerName: "NEANversand GmbH - DE",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "61EiMqAVsLL", domain: "de",
    keyMetricValue: "30 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B0F3V4BDHK", brand: "Addview", model: "Nova M80", series: "Nova",
    title: "ADDVIEW Fahrradlicht 80 Lux Nova M80 – Dynamo Frontlicht mit Tagfahrlicht, Standlicht, Aluminium-Gehäuse, StVZO zugelassen, IP65 wasserdicht – für sicheres Radfahren bei Tag & Nacht",
    markets: { DE: [112, 2794.4, 24.95, 4.3, 65] },
    bsr: 12190, listingDate: "2025-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71DqTb7M9sL", domain: "de",
    keyMetricValue: "80 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B009NAFK12", brand: "AXA", model: "Pico 30 Switch", series: "其他",
    title: "AXA Pico 30 Switch, Fahrradlicht Vorne Dynamo, 30 Lux Fahrrad Scheinwerfer, LED Frontlicht, 50 m Sichtweite, 3.000 m gesehen Werden, Integrierter Reflektor, Schwarz",
    markets: { DE: [103, 2251.58, 21.14, 4.5, 417] },
    bsr: 9152, listingDate: "2012-11", fulfillment: "FBM", sellerName: "2Wheelshop B.V.",
    variationCount: 1, qualityScore: 93, weight: null, dimensions: null, badges: [],
    image: "5138ojxD7zL", domain: "de",
    keyMetricValue: "30 Lux", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B00CJ9UGIQ", brand: "Büchel", model: "Fahrradlicht Vorne 25 LUX", series: "其他",
    title: "BÜCHEL Fahrradlicht Vorne mit Schalter I Dynamo Betrieb möglich I 25 LUX I StVZO Zulassung I - Fahrradlampe vorne, Fahrrad Scheinwerfer, Fahrradlicht vorne",
    markets: { DE: [103, 1118.58, 12.48, 4.5, 2018] },
    bsr: 8324, listingDate: "2020-04", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 97, weight: null, dimensions: null, badges: [],
    image: "71peSGZkIkL", domain: "de",
    keyMetricValue: "25 LUX", keyMetricSource: "商品标题",
    attributes: { powerType: "摩电机（Dynamo）", runtime: null, battery: null },
  },
  {
    asin: "B0DD6H6G67", brand: "Akdomart", model: "LED Fahrradlicht Vorne", series: "其他",
    title: "Akdomart LED Fahrradlicht Vorne, Fahrradlicht USB Aufladbar mit 600mAh Akku, Fahrradbeleuchtung StVzo zugelassen, Fahrradlampe Vorne IPX5 Wasserdicht Fahrradlicht Kinderfahrrad",
    markets: { DE: [94, 1409.06, 12.99, 4.2, 571] },
    bsr: 15800, listingDate: "2024-10", fulfillment: "FBA", sellerName: "NITA STORE S.R.L.",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "618ELelxkyL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: "600 mAh" },
  },
  {
    asin: "B0G3X3YVJW", brand: "LINISME", model: "Superhelle Fahrradlampe 4800", series: "其他",
    title: "4800 Lumen Superhelle Fahrradlampe mit 17 LED, 10000mAh Mobile Leistung, USB Wiederaufladbare Fahrradlicht mit Digitaler Leistungsanzeige, IP65 Wasserdicht für Straße, MTB Off-Road Radfahren Pendeln",
    markets: { DE: [93, 2975.07, 31.99, 4.5, 14] },
    bsr: 14986, listingDate: "2025-12", fulfillment: "FBM", sellerName: "LINISME-EU",
    variationCount: 2, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "71XpfJJGGIL", domain: "de",
    keyMetricValue: "4800 Lumen", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: "10,000 mAh" },
  },
  {
    asin: "B085PWX7QB", brand: "Opard", model: "Fahrradlicht USB", series: "其他",
    title: "Fahrradlicht, Fahrradlicht USB Aufladbar, StVZO Zulassung Fahrradbeleuchtung, Fahrradlampe 2 Licht-Modi IPX4 Wasserdicht Fahrrad für Kinder und Erwachsene",
    markets: { DE: [86, 1117.14, 12.99, 4.4, 547] },
    bsr: 13000, listingDate: "2020-06", fulfillment: "FBA", sellerName: "Kinsment",
    variationCount: 1, qualityScore: 99, weight: null, dimensions: null, badges: [],
    image: "51VUqrmdJdL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
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
  },
  {
    asin: "B0CTMPKXKY", brand: "Antimi", model: "Fahrradlicht Vorne", series: "其他",
    title: "Antimi Fahrradlicht vorne,IPX5 Fahrrad Frontlicht StVZO-zugelassen Ahead Led Fahrrad licht fahrradlampe wasserdicht Black…",
    markets: { DE: [70, 1104.6, 15.19, 4.3, 146] },
    bsr: 15226, listingDate: "2024-02", fulfillment: "FBA", sellerName: "COIISOVD LIMITED",
    variationCount: 1, qualityScore: 75, weight: null, dimensions: null, badges: [],
    image: "61Aoxq1SJmL", domain: "de",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: null, runtime: null, battery: null },
  },

  // ── 法/意站单品（2 款）─────────────────────────────────────────
  {
    asin: "B0C8MQF56P", brand: "OLIGHT", model: "RN 2000", series: "其他",
    title: "OLIGHT RN 2000 Luce Anteriore Bici Led Ricaricabili Usb 2000 Lumen 170 m | Fanale Anteriore Bicicletta Telecomandato Senza Fili, IPX6 Impermeabile, Sensore di Luce Intelligente, per Mountain Road",
    markets: { IT: [46, 4965.7, 107.95, 4.4, 240] },
    bsr: 8601, listingDate: "2023-09", fulfillment: "AMZ", sellerName: "Amazon",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "61WcyWjJSLL", domain: "it",
    keyMetricValue: "2000 Lumen", keyMetricSource: "商品标题",
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
  },
  {
    asin: "B0CYBWSN1G", brand: "EBUYFIRE", model: "Phare Avant Vélo", series: "其他",
    title: "Lumiere Velo Rechargeables USB, Phare Avant pour Vélo a LED Puissant,Balade de Nuit Lampe de Poche,de vélo Avant Phare,4 Mode,imperméable Facile à Installer,Lampe Velo pour VTT Course Cycliste",
    markets: { FR: [28, 363.16, 12.63, 4.4, 32] },
    bsr: 7286, listingDate: "2026-04", fulfillment: "FBM", sellerName: "KANG1",
    variationCount: 1, qualityScore: 100, weight: null, dimensions: null, badges: [],
    image: "71v4gmxTkSL", domain: "fr",
    keyMetricValue: null, keyMetricSource: null,
    attributes: { powerType: "USB 充电", runtime: null, battery: null },
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
  attributes: row.attributes,
}));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "products.json"), `${JSON.stringify(products, null, 2)}\n`, "utf8");

const withMetric = products.filter((p) => p.keyMetricValue !== null).length;
const multiMarket = rows.filter((r) => Object.keys(r.markets).length > 1).length;
console.log(
  `已生成 ${products.length} 款产品 → src/data/products.json` +
    `（亮度标注 ${withMetric} 款有数据 / ${products.length - withMetric} 款缺失；跨站合并 ${multiMarket} 款）`,
);
