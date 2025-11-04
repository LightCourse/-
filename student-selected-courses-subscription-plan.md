# 学生已选课程订阅入口实施方案

## 目标
确保在“学生已选课程”Tab 中补充单门与批量订阅入口，同时复用既有的 SubscriptionModule 逻辑，不影响系统现有的订阅流程与 UI 行为。

## 核心原则
- 单门订阅按钮沿用自主选课页面的呈现方式：定位在课程单元格右上角，触发 `SubscriptionModule.handleSingleSubscribe`。
- 本校课程与产品课程分别使用独立的订阅按钮，并通过预设 `single-home`、`single-product` 区分数据来源与模态内容。
- 批量订阅按钮使用“学生服务”页面的组合下拉结构，通过 `BatchHomeSubscription` 与 `BatchProductSubscription` 调用原有流程。
- 所有事件、数据处理继续复用 SubscriptionModule、StudentRepository 及现有模态框，无需改动内部实现。

## 页面调整
1. **功能栏容器**：在“学生已选课程”Tab 的功能栏新增 `div#selectedCoursesFunctionBar`，结构与“学生服务”一致，包含批量订阅下拉按钮及两项菜单。
2. **表格列结构**：
   - 为“本校课程”列包裹 `.home-course-cell`，写入 `data-course-code`、`data-course-name`、`data-course-type="home"`、`data-student-name` 等属性，并设置 `position: relative; padding-right` 以容纳按钮。
   - 为“产品课程”列包裹 `.product-course-cell`，字段与属性设置同上，但 `data-course-type="product"`。
3. **复选框**：统一为课程行的 checkbox 添加 `.selected-course-checkbox` 类，供批量订阅使用。

## 逻辑集成步骤
1. **批量按钮部署**：在表格渲染完成后执行 `SubscriptionModule.BatchMixedSubscription.deployBoth('#selectedCoursesFunctionBar', { checkboxSelector: '.selected-course-checkbox' })`，按钮初始禁用，监听勾选状态以显示数量。
2. **单门按钮部署**：
   - `SubscriptionModule.deploySingle('.home-course-cell', { preset: 'single-home', insertMethod: 'append', courseNameSelector: '.home-course-name', studentNameSelector: '.student-name' })`
   - `SubscriptionModule.deploySingle('.product-course-cell', { preset: 'single-product', insertMethod: 'append', courseNameSelector: '.product-course-name', studentNameSelector: '.student-name' })`
   - 每次渲染前需清理旧按钮或重建单元格内容，避免重复插入。
3. **勾选监听**：复用现有 `setupBatchSelectionListener` 或在渲染后手动监听 `.selected-course-checkbox`，实时更新批量按钮的 `disabled` 状态与计数字样。
4. **状态同步**：在学生切换、订阅成功等时机调用 `SubscriptionModule.syncButtonStates(StudentAnalysisController.getCurrentStudent()?.id)`，确保按钮标识与 StudentRepository 中的订阅记录一致。
5. **异常兜底**：保持 SubscriptionModule 内部对仓库未初始化、数据缺失的提示，新增代码只负责展示与部署，不改动核心流程。

## 联调与验证
- **单门订阅**：点击本校/产品课程按钮应弹出现有的订阅方式模态，并最终写入 StudentRepository；按钮变为“已订阅”状态。
- **批量订阅**：下拉菜单中选择本校或产品课程，触发原批量订阅模态，核对 `window.batchSelectedCourses` 数据是否包含正确的课程信息。
- **跨 Tab 影响**：确认“学生服务”、“自主选课”等页面功能未受影响；尤其注意 SubscriptionModule 的样式注入与按钮状态同步是否生效。
- **UI 对齐**：检查按钮 hover、禁用态、下拉动效与全局样式一致，必要时复用现有 CSS 变量与 class。

## 后续工作
- 按步骤逐项实现并在每阶段进行自测。
- 若需要分批上线，可先部署本校课程入口，再扩展到产品课程和批量按钮。
- 完成开发后准备测试用例，覆盖单门、批量、本校、产品四种场景。
