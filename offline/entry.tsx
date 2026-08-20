import { createRoot } from "react-dom/client";
import "../src/globals.css";
import HomePage from "../src/page";

// 离线单文件包入口：与主站共用同一套组件，
// 由 scripts/package-offline.mjs 构建后内联进单个 HTML。
const container = document.getElementById("root");
if (!container) {
  throw new Error("离线包缺少 #root 挂载节点");
}

createRoot(container).render(<HomePage />);
