# 课程订阅中心快速说明

## 主要做什么
- 在学生分析页面的“订阅中心”卡片区，展示学生当前设置的所有课程订阅。
- 如果某位学生还没有订阅，就显示一条提示，告诉你需要先去课程表里创建条件。

## 数据从哪里来
- `scripts/studentRepository.js` 负责真实订阅的统一读取与写入，默认优先返回保存在内存 + `localStorage` 的动态订阅数据。
- `data/students.js` 仅保留演示用的 `demoSubscriptions` 模板；是否追加到结果由 `AppConfig.subscription.enableDemoData` 控制（默认 `true`，方便开发调试）。
- `getSubscriptions(studentId)` 会在返回列表时附带 `__source` 字段（`dynamic` 或 `demo`），UI 层可以据此排序或禁用按钮。
- 仓库会在初始化时尝试迁移旧版 `subscription-center:<id>` 存储键，统一使用新前缀 `subscription:<id>`，避免历史数据丢失。

## 页面怎么生成
- `index.html` 中的 `renderSubscriptionSection()` 会在你切换学生或打开订阅中心时运行：
  - 先清空 `#subscriptionCardsContainer`；
  - 通过 `StudentRepository.getSubscriptions()` 取得包含来源标识的订阅数组；
  - 没有订阅就添加空状态提示；
  - 对结果进行排序，使 `dynamic` 数据永远排在前面，再逐条生成 `.subscription-card`。

## 卡片长什么样
- 标题区：课程代码、课程名称、学校信息，右侧有“产品课程 / 本校课程”徽章；如果是 Demo 数据，还会额外显示“演示数据”徽章。
- 状态区：状态标签（带图标）+ 截止时间，必要时显示“⚠️ 剩余天数”提醒。
- 摘要区：显示概览信息，并提供“查看详情”按钮，展开后可看到学期、授课形式、时长、价格、创建日期等。
- 操作区：
  - Demo 卡片按钮被禁用，底部会提示“演示数据，仅供参考，无法执行动作”。
  - 已转化：显示“订阅已完成”提示；
  - 其他状态：主操作为“查看匹配课程”，若需加入课程会在匹配结果里继续点击“加入已选课程”；`waiting` 状态仍提供“编辑条件”“续期”“取消订阅”，通知场景展示“查看通知详情”。
- 注意：部分按钮仍是占位（`alert`），后续接入真实流程时无需额外兼容 Demo 数据，因为按钮已默认禁用。

## 如何筛选和排序
- 顶部下拉框：
  - `status-filter` 按订阅状态过滤；
  - `subscription-type-filter` 区分产品课程 / 本校课程；
  - `deadline-sort` 支持按截止日期升序或降序排列。
- `filterCards()` 会按照选择隐藏或显示卡片，并在筛选结束后再次触发排序。
- `sortCardsByDeadline()` 会读取卡片上的 `data-deadline`，把 DOM 节点重新排好顺序；`resetCardOrder()` 用 `data-index` 恢复原排序。

## 相关的订阅按钮模块
- 同一份 `index.html` 里还封装了 `SubscriptionModule`：
  - 帮我们生成单个订阅按钮或批量订阅按钮；
  - 统一处理点击后的模态框逻辑；
  - 自主选课列表已经在“课程代码”列重用这个模块，按钮只出现一次且带上 `data-*` 属性。

## 配置与持久化
- 全局配置入口：`index.html` 中的 `window.AppConfig.subscription`。
- 目前支持的字段：
  - `enableDemoData`：是否追加演示订阅模板，默认 `true`；关闭后只展示真实订阅。
  - `persistence`：持久化模式，支持 `memory`（默认）、`localStorage`、`api`（占位）。
- `localStorage` 模式下每位学生使用 `subscription:<studentId>` 键保存 JSON 列表，自检会自动迁移旧键并捕获异常。
- 如果切换到 `api`，仓库会打印警告并回落到内存模式，为后续接入后端 API 预留结构。

## 现在的局限
- 持久化目前只覆盖 `memory` 与 `localStorage`，API 模式仍是空实现，需要后续接入后端服务。
- 操作按钮多数仍是占位 `alert`，尚未接入真实路由或模态。
- 没有分页或加载更多，默认一次渲染全部订阅。

## 手工验证建议
1. 创建或修改订阅后刷新页面，确认在 `localStorage` 模式下仍能看到最新卡片。
2. 将 `enableDemoData` 设为 `false`，刷新后应只剩真实订阅，且排序保持不变。
3. 保持 Demo 开启时验证：动态订阅在前、演示订阅在后，Demo 卡片按钮禁用且提示文案存在。
4. 手动在浏览器控制台删除 `subscription:<id>` 项，再次加载页面确认仓库能够初始化空列表。
5. 暂时将 `persistence` 改为 `api`，观察控制台警告是否出现，并确认仍能在单次会话中新增/刷新订阅（内存模式回退）。

## 后续接入建议
1. 在 `StudentRepository` 中新增写操作接口，把真实订阅结果回写数据源或后端接口；
2. 改造 `handleAction()`，弹出现有的订阅模态或发送 API 请求；
3. 更新 `createSubscriptions()`（或后端响应）提供准确的状态、截止日期、提醒信息；
4. 如果未来订阅数量很多，可以考虑增加分页、搜索或懒加载。
