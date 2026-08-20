// 抽屉字段配置类型。放在独立文件避免 config ↔ 组件循环依赖。
export interface DrawerField {
  /** products.json 里 attributes 对象的键 */
  key: string;
  /** 抽屉里显示的中文标签 */
  label: string;
  /** 是否占据整行（长文本字段用） */
  wide?: boolean;
}
