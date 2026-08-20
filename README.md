# Amazon 欧元站自行车前灯产品路标

德/法/意/西四站（EUR）单车前灯市场定位图：横轴品牌、纵轴价格（€）。品牌 × 价格市场定位路标网站（product-roadmap-site 模板工程）。

- 数据快照：2026-08-19（销量/销售额为 2026-07 月度估算）
- 线上地址：https://paipai112.github.io/eu-bike-headlights-roadmap/

## 收录范围（2026-08-19 第三轮调整）

- **品牌白名单 6 家**：
  - 用户指定：MagicShine、RAVEMEN、LEZYNE
  - 补充品牌（欧洲亚马逊渠道实际在售、前灯品类较全的知名品牌，最多 3 家）：**SIGMA、Trelock、OLIGHT**
  - CatEye 经查证基本不在亚马逊欧洲渠道铺货（德/法站以车铃、码表与零星 2011–2018 年旧款为主，Volt/AMPP 主力线缺席），未收录
- **仅收自带电池、可 USB 充电的单品前灯**。按此规则排除：
  - E-bike 专用前灯（Trelock Lighthammer E-Bike 系等）
  - 摩电机（Dynamo）供电：AXA、Büchel、nean Dynamo 版、Fischer、Addview 等
  - 干电池供电：SIGMA Aura 30、nean 30 LUX 电池版
  - 头盔灯：SIGMA Buster 全系（Buster 400/800/1100/1600/2000 HL 均为 Helmlicht）
  - 前后灯套装（Set）：SIGMA Aura 系列套装、Trelock、RAVEMEN 套装等
  - 附注：SIGMA Aura 100 在亚马逊无单品 listing，仅随"Aura 100/Blaze Link"套装销售

## 数据口径（重要）

- 数据来源：卖家精灵 MCP（product_research / competitor_lookup，`includeBrands` + 品牌词过滤），销量与销售额为估算值，**并非 Amazon 官方实销数据**。
- **关于"真实销量"（2026-08-19 实测查证）**：亚马逊不公开真实销量，卖家精灵也没有真实销量口径（`asin_detail` 的销量字段为空，全部销量数字均为其模型估算）。实测查询 2026-08 当月返回与 2026-07 **完全相同**的快照，因此 **2026-07 已是卖家精灵当前能提供的最近月份**。
- 抽屉新增**"亚马逊近一月购买（页面口径）"**字段：亚马逊商品页官方 "X+ bought in past month" 徽章的抓取值（`amzUnit`，滚动 30 天下限值，抓取于 2026 年 6 月底至 7 月底）——最接近真实销量的公开口径，与模型估算互为参照（如 RAVEMEN FR500：模型估算 1,094 件/月 vs 亚马逊徽章 DE 400+/IT 100+）。
- 四国站点各自 listing（德系产品与他站普遍不同 ASIN），同一产品按 ASIN/品牌型号合并为一条：
  - 月销量 / 月销售额：各站求和
  - 评分：按各站评分数加权平均；评分数：各站求和
  - 价格：在售各站代表价的算术平均
  - BSR：四站最优（各站 BSR 不可直接比较）
  - 抽屉"在售站点"字段标注该产品在四站中的实际上架情况
- 卡片"亮度标注"为 listing 原厂标注：欧洲德规（StVZO）产品以 **Lux** 计，与流明**不可换算**；缺失如实显示"暂无数据"。
- 市场结构性事实（41 款白名单格局）：
  - **SIGMA / Trelock 的灯只在德站**（法/意/西仅尾灯、头盔灯或 E-Bike 款）
  - **RAVEMEN / OLIGHT 的主力在法/意/西**：RAVEMEN 官方店同一 ASIN 三国联卖（意站销量最大），OLIGHT RN 线亦为法/意/西同 ASIN；RAVEMEN FR500 另有德站独立 listing（793 件/月，德站徽章 400+）
  - **MagicShine 双线**：德站 StVZO 线（ZX）+ 法站官方店非德规线（HORI/URBO/RN/EVO/Allty）
  - **LEZYNE 不在亚马逊欧元区主推灯**：德/意/西仅泵与工具；法站亚马逊自营铺货 10 款 Drive 系（各 1–4 件/月）

## 品类定制

换品类只改两个文件：

1. `src/category.config.ts` — 站点文案、市场/币种、卡片关键字段、抽屉详情字段
2. `src/data/products.json` — 产品数据（由 `scripts/build-products.mjs` 生成，含合并口径）

## 本地运行

```bash
npm install
npm run validate   # 数据校验（缺失数据必须为 null，不允许占位假值）
npm test           # 单元测试 + 品类配置冒烟测试
npm run dev        # 本地预览
npm run package:offline  # 离线单文件 HTML（双击即开）
```

## 构建部署

```bash
npm run build      # 产物在 dist/，纯静态文件
npm run preview    # 本地预览构建产物
```

推送到 GitHub main 分支后 `.github/workflows/deploy.yml` 自动部署到 GitHub Pages。
