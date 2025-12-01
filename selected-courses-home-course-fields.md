# 本校字段可用性梳理

## 模态上下文提供的数据
- `context.subscription.course`
  - `code`: 订阅创建时填写的本校课程代码（如 `PSYC 1`）
  - `name`: 本校课程名称（如 `Introduction to Psychology`）
  - `school`: 对应本校院校名
- `context.course`
  - 通过 `resolveSubscriptionContext` 统一注入，默认等同于 `subscription.course`
  - 在续期/编辑等场景可包含最新的 `code`、`name`

## 匹配结果卡片 (`course` 参数)
- **本校卡片 (`source === 'home'`)** 来源于 `buildHomeCourseMatches`
  - `courseCode`, `courseName`: 主体课程代码与名称
  - `category`: 课程类别
  - `credit`: 学分信息（数字或字符串）
  - `availability` / `status`: 可用性枚举（`available`、`pending` 等）
  - `term`, `year`: 建议学期与年份（可为空）
- **产品卡片 (`source === 'product'`)** 同时携带可选的 `homeCourseCode/homeCourseName`
  - 当映射信息存在时，由 `buildProductCourseMatches` 写入
  - `productCourseCode`, `productCourseName`, `schoolName`, `mappingId` 等产品侧字段

## 现有 payload 情况
- `buildSelectedCoursePayload` 已默认设置
  - `homeCourseCode = course.homeCourseCode || course.courseCode`
  - `homeCourseName = course.homeCourseName || course.courseName`
  - 但当卡片缺少本校字段时，默认值会退化为产品课程信息
- 订阅上下文中的 `course.code/name` 可作为最终兜底值

## 实施提示
- “本校”卡片始终具备 `courseCode/courseName`，可直接使用
- 若产品卡片需要展示本校信息，可通过 `modalContext.course`（即订阅主体课）补齐
- 若两侧数据均缺失，则保留现有“未关联本校课程”兜底文案
