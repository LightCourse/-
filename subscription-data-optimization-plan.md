# 课程订阅数据治理与持久化优化方案

## 目标
- 去除现有写死的订阅卡片，使订阅中心只渲染真实数据。
- 引入可持久化的数据源，保证订阅动作可保存并在刷新后恢复。
- 保持调试体验：如需 Demo 数据，能与真实数据清晰区分，且不会影响真实订阅排序。

## 总体策略
1. **数据分层**：仓库层拆分为“动态订阅数据源”和“演示用静态数据源”，通过配置控制是否加载静态数据。
2. **持久化接入**：动态订阅读写统一走持久化接口（先支持本地存储，后续可以无缝切换到后端 API）。
3. **渲染优先级**：真实订阅永远展示在最前方，静态数据（如开启）排在其后，并在 UI 上标识来源。
4. **兼容演示**：保留静态样本作为可选功能开关，便于无真实数据时快速演示。

## 实施步骤

### Step 1：仓库改造
- 新增 `DynamicSubscriptionStore`：封装本地持久化读写（例如 localStorage / IndexedDB），实现以下接口：
  - `load(studentId)`
  - `save(studentId, subscriptions)`
  - `append(studentId, subscription)`
  - `update(studentId, subscriptionId, patch)`
  - `remove(studentId, subscriptionId)`
- 新增 `DemoSubscriptionStore`：迁移原 `createSubscriptions()` 静态数据，按学生 ID 返回复用数组。
- 在 `StudentRepository` 中：
  - `getSubscriptions(studentId, { includeDemo = true })`：先读动态，再根据配置追加 demo 数据；标记来源字段 `source`（`dynamic` / `demo`）。
  - `addSubscription` / `updateSubscription` / `cancelSubscription` 等写入动作只操作动态存储；写入成功后触发缓存刷新。
  - 提供配置项 `subscriptionConfig.enableDemoData`，默认关闭。

### Step 2：UI 渲染与交互
- `renderSubscriptionSection()` 调整：
  - 使用新的 `getSubscriptions`，按 `source` 字段把动态卡片排在数组前。可额外在卡片上加 `data-source`。
  - UI 样式：为 demo 卡片添加淡灰提示或角标（如“演示数据”）。
- 订阅操作按钮（新增、编辑、取消、续期）调用仓库写入接口后，重新渲染列表；确保刷新页面后仍保留。
- 如果 Demo 模式开启，允许通过筛选下拉或 toggle 显示/隐藏 demo 卡片（可选）。

### Step 3：配置与初始化
- 在入口处（如 `window.AppConfig`）增加开关：
  ```javascript
  window.AppConfig = {
      subscription: {
          enableDemoData: false,
          persistence: 'localStorage' // 或 future: 'api'
      }
  };
  ```
- 加载页面时，根据配置决定是否实例化 `DemoSubscriptionStore`。

### Step 4：持久化实现细节
- **localStorage 方案（短期）**：
  - Key 结构：`subscription:${studentId}` 对应 JSON 数组。
  - 提供基本容错：读写失败时回退到空数组并打印警告。
- **API 方案（扩展）**：
  - 抽象持久化接口，未来只需要把 `DynamicSubscriptionStore` 内的实现换成 `fetch` 调用。
  - 支持异步处理与错误上报。

### Step 5：文档与测试
- 更新文档：
  - 在 `subscription-center-overview.md` 中说明数据来源、开关、调试方式。
  - 在 `matched-courses-modal-implementation-plan.md` 或新的文档中记录订阅数据持久化策略。
- 测试用例建议：
  - 新增订阅后刷新页面仍存在。
  - demo 开关关闭时不再渲染静态卡片。
  - 动态 + demo 混合时，动态卡片始终排在前面。
  - 持久化接口异常时提供兜底提示。

## 后续迭代建议
- 引入订阅数据的版本号或迁移逻辑，便于升级数据结构。
- 将本地持久化替换为实际后端 API，并同步增加鉴权、分页等功能。
- 扩展 analytics：记录真实订阅动作成功/失败情况，支持后续 BI 统计。
