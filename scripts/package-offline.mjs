import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 离线单文件打包：构建为 IIFE 后把 JS/CSS/favicon 全部内联进
// offline/index.html 模板，产出双击即开的单个 HTML。
// 商品缩略图仍指向源站 CDN，查看图片需联网（README 有说明）。

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_NAME = "product-roadmap-offline.html";

const README = `产品定位路标（离线版）
================================================

使用方法
--------
双击 ${OUT_NAME} 即可在浏览器打开，无需安装任何软件。
建议使用 Chrome / Edge / Safari 较新版本。

数据口径
--------
销量与销售额为卖家精灵估算值，非 Amazon 官方数据，仅用于内部竞品定位分析。
缺失数据如实显示"暂无数据"，未做推测。

联网说明
--------
商品缩略图直接引用源站图片服务器，查看图片需联网；
不联网时布局与交互不受影响，仅缩略图无法显示。
`;

function main() {
  const build = spawnSync(
    path.join(root, "node_modules", ".bin", "vite"),
    ["build", "--config", "vite.offline.config.ts"],
    { cwd: root, stdio: "inherit" },
  );
  if (build.status !== 0) {
    throw new Error(`vite build 失败，退出码 ${build.status}`);
  }

  const distDir = path.join(root, "offline-dist");
  const js = readFileSync(path.join(distDir, "app.js"), "utf8");
  const css = readFileSync(path.join(distDir, "app.css"), "utf8");
  const template = readFileSync(
    path.join(root, "offline", "index.html"),
    "utf8",
  );
  const favicon = readFileSync(
    path.join(root, "public", "favicon.svg"),
    "utf8",
  );

  // </script 会提前终止内联脚本，转义为 <\/script（在 JS 字符串里语义不变）
  const safeJs = js.replaceAll("</script", "<\\/script");
  const faviconUri = `data:image/svg+xml,${encodeURIComponent(favicon)}`;

  for (const marker of [
    "<!-- INLINE_FAVICON -->",
    "<!-- INLINE_CSS -->",
    "<!-- INLINE_JS -->",
  ]) {
    if (!template.includes(marker)) {
      throw new Error(`offline/index.html 模板缺少占位符 ${marker}`);
    }
  }

  // 必须用函数替换：内容里出现的 $&/$` 等不能被当作特殊替换模式（会损坏内联代码）
  const html = template
    .replace("<!-- INLINE_FAVICON -->", () => `<link rel="icon" href="${faviconUri}" />`)
    .replace("<!-- INLINE_CSS -->", () => `<style>\n${css}\n</style>`)
    .replace("<!-- INLINE_JS -->", () => `<script>\n${safeJs}\n</script>`);

  const leakedLocalRefs = html.match(/(?:src|href)="\//g) ?? [];
  if (leakedLocalRefs.length > 0) {
    throw new Error(`离线包仍包含站内绝对路径引用（${leakedLocalRefs.length} 处）`);
  }

  const outDir = path.join(root, "offline-package");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, OUT_NAME);
  writeFileSync(outFile, html);
  writeFileSync(path.join(outDir, "README.txt"), README);

  const sizeKb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(0);
  console.log(`离线包已生成：${outFile}（${sizeKb} KB）`);
}

main();
