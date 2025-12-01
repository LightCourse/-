# 匹配课程模态现状梳理

## 模板结构
- `ensureMatchedCoursesModalContainer`（index.html ~8160 行）动态注入模态 HTML。
- 头部信息区域 `.matched-courses-info` 内部包含三块 `info-block`：
  1. `订阅课程` → `matchedCoursesCourseLabel`
  2. `所属学校` → `matchedCoursesSchoolLabel`
  3. `截止日期` → `matchedCoursesDeadlineLabel` + `matchedCoursesDeadlineHint`
- 模态主体其它关键节点：
  - `matchedCoursesSummaryLabel`（概览文字）
  - `matchedCoursesFeedback`（信息/错误提示）
  - `matchedCoursesLoadingState`（骨架加载）
  - `matchedCoursesProductSection` 包含产品列表与数量。

## 渲染逻辑
- `renderMatchedCoursesModal`（index.html ~8330 行）：
  - 通过 `document.getElementById` 获取上述节点。
  - `matchedCoursesCourseLabel` 使用 `context.course.code/name` 组合。
  - `matchedCoursesSchoolLabel` 取数据集或 `student.school`。
  - `matchedCoursesDeadlineLabel` 写入 `subscription.deadline`，`matchedCoursesDeadlineHint` 依赖 `describeDeadlineSource`。
  - 加载/错误/空数据时切换骨架、反馈文案。
- `handleRepositoryError` 等函数依赖 `renderMatchedCoursesModal` 重新渲染。
- `closeMatchedCoursesModal` 重置时也会访问 `matchedCoursesDeadlineLabel/Hint`。

## 截止日期相关引用
- DOM：`matchedCoursesDeadlineLabel`、`matchedCoursesDeadlineHint`。
- JS：
  - `renderMatchedCoursesModal` 设置 label/hint 文本。
  - `describeDeadlineSource` 函数提供提示文案映射。
  - `closeMatchedCoursesModal` 重置 label 与 hint。

> 以上梳理为后续删除截止日期、引入学生信息展示提供参考。