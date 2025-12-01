# 匹配课程模态头部信息优化方案

## 目标
- 移除模态头部的“截止日期”展示，避免冗余信息干扰。
- 上半部分仅展示：学生姓名、学生学校、订阅课程（含课程代码、名称、学校）。
- 保持模态主体的匹配课程列表与操作逻辑不变。

## 实现策略
1. **统一字段来源**：
   - 开模态时的上下文 `contextPayload` 已注入 `student` 与 `subscription.course` 数据，可直接使用。
   - 通过 `course` 节点的代码/名称/学校补全订阅课程展示，必要时 fallback 到 `subscription.course`。
2. **精简模板结构**：
   - 删除或重命名 `deadline` 相关 DOM 元素，让头部区只保留学生与订阅信息。
   - 根据新布局调整样式容器（无需大改，只要留出三个信息位即可）。
3. **同步渲染逻辑**：
   - 更新 `renderMatchedCoursesModal` 将学生姓名、学校、订阅课程写入新节点；清理 `deadlineLabel` 等引用。
   - 确保其它函数（例如错误提示、加载状态）在不存在 deadline 节点时依旧稳健。

## 实施步骤
1. **现状梳理**
   - 在 `index.html` 确认模态 HTML 结构，定位 `matchedCoursesDeadlineLabel`、`matchedCoursesCourseLabel` 等元素。
   - 阅读 `renderMatchedCoursesModal`，记录目前往各节点写入的字段。
2. **设计头部布局**
   - 决定学生姓名、学生学校、订阅课程的展示顺序与容器结构（如单行/多行）。
   - 修改 HTML：移除 deadline 元素，新增或重命名用于展示三块信息的标签，并预留样式类。
3. **更新渲染函数**
   - 在 `renderMatchedCoursesModal` 中：
     - 读取 `context.student.name`、`context.student.school`，写入新节点。
     - 通过 `context.subscription.course`/`context.course` 组合课程代码、名称、学校的字符串。
     - 删除所有关于 `deadlineLabel`、`deadlineHint` 的赋值。
4. **清理辅助逻辑**
   - 检查 `handleRepositoryError`、`openModalWithPayload`、`recordSubscriptionActionLog` 等是否引用截止日期，必要时移除。
   - 确保 `closeMatchedCoursesModal` 重置逻辑不再访问已删节点。
5. **验证流程**
   - 手动操作订阅卡片 → “查看匹配课程”，确认模态头部只展示学生和课程信息。
   - 验证加载、失败、无匹配等场景提示正常。
   - 回归交互：执行“加入已选课程”等按钮，确保行为未受影响。

## 验证与交付
- 记录一次操作前后截图，确认头部信息改动。
- 如有埋点或日志需要补充，更新对应说明文档或工单。