# 订阅卡片信息架构与视觉整合方案

## 1. 目标与背景
- **拆分结构**：卡片统一分为三个核心区域——状态区（Header）、内容区（Body）、操作区（Footer），提升信息层级感。
- **状态聚合**：将状态标签与截止/剩余时间集中显示，减少视线跳跃，并强化紧迫性提示。
- **内容对比**：保留课程主体信息的清晰可读性，同时规范订阅条件等次级信息的呈现方式。
- **视觉一致**：确保演示订阅与真实订阅在同一布局下保持一致，兼顾沙箱提示与操作按钮现有交互。

## 2. 拟议结构
```
subscription-card
 ├─ card-header           // 状态与时效
 │   ├─ card-status       // 状态标签、来源标记（例如沙箱）
 │   └─ card-deadline     // 截止日期、剩余天数（含紧急提醒）
 ├─ card-body             // 课程信息 + 订阅条件
 │   ├─ course-primary    // 课程代码、名称、学校
 │   └─ course-secondary  // 订阅条件、提醒信息
 └─ card-footer           // 操作按钮 (跳转、查看、编辑、续期、取消等)
```

## 3. 实施步骤
### 3.1 DOM 结构重构
1. 修改 `renderSubscriptionSection` / `renderSubscriptionCards` 中的卡片生成逻辑：
   - 创建 `.card-header`、`.card-body`、`.card-footer` 容器。
   - 将状态标签、沙箱提示、截止/剩余时间放入 header。
   - 将课程代码、名称、学校保持在 body 主区域；在其下添加订阅条件文案（summary/提醒）。
   - 保留原有按钮逻辑，但将按钮区域统一置于 footer。
2. 对紧急提醒（如 `warning` 或 `剩7天`）保留原文案，同时在 header 中以醒目颜色显示。

### 3.2 样式调整
1. 新增或更新 CSS：
   - `.card-header`：使用 flex 布局（`justify-content: space-between; align-items: center;`）。
   - `.card-status-badge`：定义状态标签基础色与文字；针对 `waiting`、`matched`、`expired` 等状态调色。
   - `.card-deadline`：统一字体、对齐方式；为紧急文案增加 `.deadline-warning`（红/橙色）、`.deadline-safe`（常规色）。
   - `.card-body`：增加内边距；`.course-primary` 维持现有字体层级；`.course-secondary` 采用较小字号/浅灰色。
   - `.card-footer`：保持现有按钮间距，可在顶部添加细分隔线增强结构感。
2. 针对沙箱提示（如“演示模式：…”），决定放置在 header 状态旁或 body 末尾，以标签形式呈现。

### 3.3 数据与逻辑
1. 统一构建展示数据：
   - `statusLabel`: 使用 `resolveSubscriptionStatusLabel`；配合状态 class 应用不同颜色。
   - `deadlineText`: 优先使用 `subscription.deadline`，若存在 `warning`（如剩余天数）则组合显示。
   - `summaryText`: 引用 `subscription.summary` 或默认文案，并作为次级信息渲染。
2. 保持现有事件与操作逻辑不变，确保点击行为、沙箱提示、按钮状态等仍可复用。

### 3.4 验证与优化
- 使用多种状态的订阅数据（等待中、已匹配、有紧急提醒、已取消）检查布局效果。
- 验证演示订阅与真实订阅在视觉层面一致，沙箱提示清晰可见。
- 确认在移动端或窄屏下，header 与 body 可折行但保持信息优先级。

## 4. 注意事项
- **无障碍性**：状态标签与紧急提醒颜色需搭配对应的文本提示；避免仅靠颜色传达信息。
- **扩展兼容**：若未来增加告警、备注等信息，可于 body 的 secondary 区域扩展，不影响整体结构。
- **渐进增强**：若当前页面样式以纯 CSS file 管理，建议集中在同一段落，便于后续复用或拆分到样式表。

## 5. 时间评估
| 任务 | 预估 | 备注 |
| --- | --- | --- |
| DOM 与数据结构调整 | 0.5 天 | 需梳理卡片渲染逻辑，封装新容器 |
| CSS 与响应式调试 | 0.5 天 | 包含状态/提醒颜色、分隔线、间距调整 |
| 手动测试与修正 | 0.5 天 | 使用演示/真实订阅数据覆盖主流程 |
| **合计** | **1.5 天** | 根据设计反馈可能滚动调整 |
