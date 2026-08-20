import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 数据文件校验：建站前必须通过。防止脚本生成/手工编辑 products.json 时
// 引入类型错误、重复 ASIN 或编造缺失数据（缺失一律 null，不允许占位假值）。

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataPath = path.join(root, "src", "data", "products.json");

const REQUIRED_NUMBER = [
  "price",
  "averagePrice",
  "monthlyUnits",
  "monthlyRevenue",
  "bsr",
  "variationCount",
];
const REQUIRED_STRING = [
  "brand",
  "model",
  "series",
  "asin",
  "title",
  "listingDate",
  "fulfillment",
  "sellerName",
  "amazonUrl",
];
const NULLABLE_NUMBER = ["rating", "ratingCount", "qualityScore"];
const NULLABLE_STRING = ["weight", "dimensions", "imageUrl", "keyMetricValue", "keyMetricSource"];
const MISSING_PLACEHOLDERS = new Set([
  "",
  "N/A",
  "NA",
  "unknown",
  "未知",
  "tbd",
  "xxx",
]);

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const PLACEHOLDER_ASINS = new Set(["B0AAAAA001", "B0AAAAA002", "B0BBBBB001"]);

function isMissingPlaceholder(value) {
  return (
    typeof value === "string" && MISSING_PLACEHOLDERS.has(value.trim().toLowerCase())
  );
}

function main() {
  let products;
  try {
    products = JSON.parse(readFileSync(dataPath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取或解析 ${dataPath}：${error.message}`);
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("products.json 必须是非空数组");
  }

  const errors = [];
  const asins = new Set();

  products.forEach((product, index) => {
    const label = `第 ${index + 1} 项（${product?.asin ?? "?"}）`;

    for (const field of REQUIRED_STRING) {
      if (typeof product[field] !== "string" || product[field].trim() === "") {
        errors.push(`${label}：字段 ${field} 必须是非空字符串`);
      }
    }
    for (const field of REQUIRED_NUMBER) {
      if (typeof product[field] !== "number" || !Number.isFinite(product[field])) {
        errors.push(`${label}：字段 ${field} 必须是有限数字`);
      }
    }
    for (const field of NULLABLE_NUMBER) {
      if (product[field] !== null && typeof product[field] !== "number") {
        errors.push(`${label}：字段 ${field} 必须是数字或 null`);
      }
    }
    for (const field of NULLABLE_STRING) {
      if (product[field] !== null && typeof product[field] !== "string") {
        errors.push(`${label}：字段 ${field} 必须是字符串或 null`);
      }
    }

    if (!ASIN_PATTERN.test(product.asin ?? "")) {
      errors.push(`${label}：ASIN 格式不合法`);
    }
    if (asins.has(product.asin)) {
      errors.push(`${label}：ASIN 重复`);
    }
    asins.add(product.asin);

    if (typeof product.price === "number" && product.price <= 0) {
      errors.push(`${label}：price 必须大于 0`);
    }

    if (!Array.isArray(product.badges)) {
      errors.push(`${label}：badges 必须是数组`);
    }

    if (
      product.attributes === null ||
      typeof product.attributes !== "object" ||
      Array.isArray(product.attributes)
    ) {
      errors.push(`${label}：attributes 必须是对象`);
    } else {
      for (const [key, value] of Object.entries(product.attributes)) {
        if (value !== null && typeof value !== "string") {
          errors.push(`${label}：attributes.${key} 必须是字符串或 null`);
        }
      }
    }

    for (const [field, value] of Object.entries(product)) {
      if (isMissingPlaceholder(value)) {
        errors.push(`${label}：字段 ${field} 含占位假值（缺失数据必须为 null）`);
      }
    }
  });

  const placeholderCount = [...asins].filter((asin) =>
    PLACEHOLDER_ASINS.has(asin),
  ).length;
  if (placeholderCount === products.length) {
    console.warn(
      "警告：当前仍是模板占位数据，正式建站时必须替换为真实数据（products.json）。",
    );
  }

  if (errors.length > 0) {
    console.error(`数据校验失败，共 ${errors.length} 处：`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `数据校验通过：${products.length} 款产品，${asins.size} 个唯一 ASIN。`,
  );
}

main();
