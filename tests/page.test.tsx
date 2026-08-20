import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { categoryConfig } from "../src/category.config";
import HomePage from "../src/page";
import products from "../src/data/products.json";

// 品类抽象冒烟测试：换品类只改 category.config.ts 与数据文件，
// 本测试断言配置正确驱动界面（关键字段、币种、抽屉字段）。
describe("HomePage 品类配置驱动", () => {
  beforeAll(() => {
    render(<HomePage />);
  });

  it("renders a card for every product in the data file", () => {
    expect(screen.getAllByTestId("product-card")).toHaveLength(products.length);
  });

  it("renders the configured key metric label on cards", () => {
    const withValue = products.find(
      (product) => product.keyMetricValue !== null,
    );
    expect(withValue).toBeDefined();
    expect(
      screen.getAllByText(
        `${categoryConfig.keyMetric.label}：${withValue.keyMetricValue}`,
        { exact: false },
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows 暂无数据 when the key metric is missing instead of a fake value", () => {
    expect(
      screen.getAllByText(
        `${categoryConfig.keyMetric.label}：暂无数据`,
        { exact: false },
      ).length,
    ).toBeGreaterThan(0);
  });

  it("opens the drawer with configured category fields on card click", async () => {
    fireEvent.click(screen.getAllByTestId("product-card")[0]);

    const drawer = await screen.findByRole("dialog");
    expect(drawer).toBeInTheDocument();
    for (const field of categoryConfig.drawerFields) {
      expect(screen.getByText(field.label)).toBeInTheDocument();
    }
    expect(screen.getByText("查看 Amazon 商品页")).toBeInTheDocument();
  });

  it("steps zoom via the zoom controls", async () => {
    fireEvent.click(screen.getByTestId("roadmap-zoom-in"));
    await waitFor(() =>
      expect(screen.getByTestId("roadmap-zoom-level")).toHaveTextContent("120%"),
    );
    fireEvent.click(screen.getByTestId("roadmap-zoom-reset"));
    await waitFor(() =>
      expect(screen.getByTestId("roadmap-zoom-level")).toHaveTextContent("100%"),
    );
  });
});
