# 查看匹配课程模态落地实施计划

## 背景
- 现有 `handleAction('view')` 仍跳转到路由，未提供模态化体验。
- 仓库层尚未输出“本校课程 vs 产品课程”的匹配明细，也没有添加至“已选课程”的写入手段。
- 需要在前端、仓库、文档与验收四个维度落地完整闭环，确保后续按步骤推进即可完成。

## 目标与范围
1. **数据侧**：能够返回规范化的匹配课程数据，区分“本校课程（home）”与“产品课程（product）”，并暴露添加至已选课程的操作接口。
2. **UI 侧**：构建查看匹配课程模态，承载筛选、分栏展示、本校/产品差异化提示及空态信息。
3. **交互侧**：在模态内支持“加入已选课程”动作，避免重复添加并提供反馈。
4. **文档验收**：补充使用说明、测试用例与埋点需求，确保交付易于验收和迭代。

---

## 实施步骤

### Step 1：仓库能力定义与数据契约校准
- [x] 审阅 `scripts/studentRepository.js`，确认现有 `normalizeSubscriptionSnapshot`、`resolveSubscriptionContext`、`getSelectedCourses` 的入参/返回结构。
- [x] 新增 `resolveMatchedCourses(subscriptionId, { includeProduct = true, includeHome = true })`：
  - 输出结构 `{ homeCourses: [...], productCourses: [...], summary: {...}, metadata: {...} }`。
  - `homeCourses` 每条记录至少包含 `courseCode`, `courseName`, `category`, `credit`, `availability`。
  - `productCourses` 每条记录至少包含 `productId`, `productCourseCode`, `productCourseName`, `schoolName`, `onsaleStatus`, `price`, `nextStartDate`。
  - `metadata.deadlineSource` 复用默认日期兜底策略，用于模态提示。
- [x] 若订阅快照缺乏匹配明细，扩展 `normalizeSubscriptionSnapshot` 读取 `snapshot.matchResults`；无法获取时返回空数组并设置 `metadata.matchSource`。
- [x] 搭建仓库存储/缓存：在 `subscriptionCache` 中新增 `matchedCourses` 段，按 `subscriptionId` 缓存一次调用结果（可采用 5 分钟失效）。
- [x] 输出 `buildSelectedCoursesMutation()` 帮助方法，统一写入“已选课程”集合，避免在 UI 中直接改动原始结构。

### Step 2：加入已选课程写入流程
- [x] 在仓库导出 `addCourseToSelected(studentId, payload)`：
  - `payload` 包含 `source` (`'home' | 'product'`)、`courseCode/productCourseCode`、`credit`、`mappingId` 等字段。
  - 写入前校验是否已存在，若重复则返回 `{ success: false, reason: 'duplicate' }`。
  - 写入成功后刷新缓存，返回最新选课清单 `{ success: true, selectedCourses: [...] }`。
- [x] 同步扩展 `getSelectedCourses` 支持缓存命中后直接返回；需要时加上 `forceRefresh` 参数。
- [x] 增加错误处理：在写入失败时抛出统一异常对象 `{ type, message, detail }`，供 UI 侧 toast 使用。

### Step 3：模态骨架与样式落地
- [x] 在 `index.html` 中新增 `matched-courses-modal` 容器与模板结构，复用既有模态基础样式，增加：
  - 顶部信息栏：显示课程名称、所属学校、截止日期来源（需使用 `metadata.deadlineSource`）。
  - 分栏展示：左侧“本校课程”，右侧“产品课程”。
  - 空态文案、加载骨架、错误提示区域。
- [x] 抽离模态渲染函数 `renderMatchedCoursesModal(subscriptionContext, matchedCourses)`，内部负责：
  - 组装 Tab/Filter（如“展示全部/仅本校/仅产品”）。
  - 渲染课程卡片列表，卡片上放置“加入已选课程”按钮。
  - 接收 `onAddCourse` 回调，用于触发 Step 4 的写入逻辑。
- [x] 设计 CSS：沿用现有配色，新增 `.matched-course-card`、`.course-origin-badge`, `.course-meta-line` 等类名，自适应 768px 以下折叠为单列。

### Step 4：交互逻辑与状态联动
- [x] 扩展 `handleAction`：当 action 为 `'view'` 时，
  - 调用 `resolveSubscriptionContext` → `resolveMatchedCourses`，展示加载态。
  - 成功后调用 `renderMatchedCoursesModal` 并注册事件监听。
  - 失败时弹出错误 toast，落盘 telemetry（可选）。
- [x] 在模态内实现 `onAddCourse(course, source)`：
  - 调用仓库 `addCourseToSelected`。
  - `success` 时更新模态内的状态标识（如按钮置为“已加入”，刷新右下角“已选课程数”）。
  - `duplicate` 时展示灰态提示，不触发写入。
  - 其他错误时弹出错误 toast。
- [x] 模态关闭时清理事件监听、加载状态和缓存（如需要可调用 `invalidateMatchedCourses(subscriptionId)`）。

### Step 5：埋点、提示与异常兜底
- [ ] 定义交互事件：`view_matched_courses_open`, `add_course_to_selected_success`, `add_course_to_selected_duplicate`, `matched_courses_error`。
- [ ] 在 UI 中触发事件上报（可暂存于 `window.__pendingAnalytics` 等结构，后续接入正式埋点）。
- [ ] 新增 toast 文案：成功、重复、失败三种；另外在模态顶部提示数据来源（快照时间、deadline 来源）。
- [ ] 设计异常视图：无匹配数据、仅本校/仅产品、仓库抛错等场景。

### Step 6：验证、文档与交付
- [ ] 更新 `docs/subscription-actions-phase6.md`：补充查看匹配课程模态的测试步骤（含本校、产品、空态、添加成功/重复两个场景）。
- [ ] 在 `subscription-workflow-optimization-plan.md` 中标记 Step 3~5 的完成情况与变更点。
- [ ] 规划手动验收 checklist：
  1. 点击“查看匹配课程”弹出模态，数据加载正确。
  2. 切换 Tab/Filter（如有）时数据视图正确切换。
  3. 添加到已选课程后按钮状态更新，且 `getSelectedCourses` 结果同步刷新。
  4. 重复添加时出现重复提示。
  5. 仓库层缓存命中与失效策略符合预期（可通过日志/DevTools 观察）。
- [ ] 预留后续自动化测试：为仓库函数编写单元测试草案（可采用 Jest/纯函数断言），并在文档中记录测试目标。

---

## 环境需求与依赖
- 继续使用当前 `StudentRepository` 与订阅卡片架构，无需引入新框架。
- 如需模拟数据，请在 `data/` 目录内补充 `matchedCourses.sample.json`，用于本地调试。
- 保持现有 toast/模态基础组件，避免重复造轮子。

## 成功交付标准
- UI 与仓库均能独立运行并通过手动验收 checklist。
- 文档更新完整，团队成员可以依文档复现功能。
- 所有新增接口均具备清晰的输入输出定义，并在代码中附带必要注释。
