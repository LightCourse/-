# 学生已选课程多条记录展示方案

## 目标
- 在订阅卡片执行“加入已选课程”后，每次动作都在“学生已选课程”列表追加一条独立记录，保留交互轨迹。
- 初始化时不再默认展示张明的本校课程 MATH 240P 映射到产品课程 MATH 227S，只有实际点击后才出现。
- 保持现有 UI/交互、事件广播与批量订阅能力不回退。

## 实现策略
1. **保留去重入口但开放重复写入**：
   - 继续调用 `StudentRepository.addCourseToSelected` 完成存储与事件发射。
   - 通过传入 `allowDuplicate: true` 跳过仓库层的重复检测，并触发 `metadata.demoDuplicate` 标记，以便合并逻辑识别为独立记录。
2. **确保数据源不预置 MATH 227S**：
   - 检查 mock 数据与运行时推算，移除对张明 `selectedCourses` 的默认填充，避免刷新后自动出现。
3. **维持渲染与按钮状态一致**：
   - `renderSelectedCoursesSection` 读取的列表只需新增记录即可，框架已有按 `metadata.demoDuplicate` 保留独立行的逻辑。

## 具体步骤
1. **梳理“加入已选课程”入口**
   - 搜索 `addCourseToSelected(`，确认订阅卡片等所有入口均传入 `allowDuplicate: true`。
   - 引入 `buildSelectedCoursePayload` 帮助函数集中构建 payload，默认带上 `allowDuplicate: true`、home/product 关键字段，降低遗漏风险。
   - 如未来新增入口，复用该帮助函数以保持一致性。
2. **清理默认选课数据**
   - 检查 `data/students.js`、`buildSelectedCoursesFromRuntime` 等是否预置 `MATH 227S`，确保张明初始 `selectedCourses` 为空。
   - `buildSelectedCoursesFromRuntime` 新增 `options.prefillProductCourses`，在“学生已选课程”调用时显式传 `false`，仍然允许“学生服务”快照传 `true` 保留示例数据。
3. **验证重复添加逻辑**
   - 可运行 `scripts/tests/selectedCoursesDuplicateSelfCheck.js`，验证仓库层在 `allowDuplicate: true` 时会插入多条记录并打上 `metadata.demoDuplicate` 标记。
   - 手动执行“加入已选课程”，确认列表新增一条；连续执行两次时应看到两条独立记录且按钮状态更新为“已加入”。
4. **确认合并行为**
   - 运行 `scripts/tests/selectedCoursesMergeSelfCheck.js`，验证与自主计划合并后仍保留两条 `metadata.demoDuplicate` 记录，且 runtime 条目独立存在。
   - 如需手动验证，可在前端连续添加两次后刷新页面，确认列表数量未被合并。
5. **回归交互**
   - 验证 `selectedCourses:changed` 事件只注册一次且无报错。
   - 检查批量订阅、续期等相关功能，确保新增记录不会引入副作用。

## 验证与交付
- 记录操作截图或简要日志，辅助开发/产品确认交互。
- 若后续需对重复记录做标记或排序，可在此方案基础上扩展（例如按 `addedAt` 倒序显示）。
