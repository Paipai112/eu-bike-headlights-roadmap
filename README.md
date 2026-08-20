# Amazon 欧元站自行车前灯产品路标

德/法/意/西四站（EUR）单车前灯市场定位图：横轴品牌、纵轴价格（€）。品牌 × 价格市场定位路标网站（product-roadmap-site 模板工程）。

- 数据快照：2026-08-19（销量/销售额为 2026-07 月度估算）
- 线上地址：https://paipai112.github.io/eu-bike-headlights-roadmap/

## 数据口径（重要）

- 数据来源：卖家精灵 MCP（product_research / competitor_lookup），销量与销售额为估算值，**并非 Amazon 官方实销数据**。
- 收录范围：**单品前灯**；排除前后灯套装（Set）、纯尾灯、E-bike 专用前灯、配件（与美国站口径一致）。
- 四国站点各自 listing（德系产品与他站普遍不同 ASIN），同一产品按 ASIN/品牌型号合并为一条：
  - 月销量 / 月销售额：各站求和
  - 评分：按各站评分数加权平均；评分数：各站求和
  - 价格：在售各站代表价的算术平均
  - BSR：四站最优（各站 BSR 不可直接比较）
- 卡片"亮度标注"为 listing 原厂标注：欧洲德规（StVZO）产品以 **Lux** 计，与流明**不可换算**；缺失如实显示"暂无数据"。
- 市场 结构性事实：法/意/西三站前灯市场以前后灯套装为主，单品前灯极少，因此本图以德站产品为主体。

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
