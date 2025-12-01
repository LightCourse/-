# 学生已选课程本校关联优化方案

## 目标
- 当订阅类型为“本校课程”时，执行“加入已选课程”后在“学生已选课程”列表中展示完整的本校信息（课程代码、名称等），避免出现“未关联本校课程”的占位提示。
- 保持现有的产品课程写入逻辑与多条记录展示能力不回退。

## 实现策略
1. **补齐写入 payload**：
   - 在匹配课程模态的 `buildSelectedCoursePayload` 中，根据 `context.course` 或订阅实体补足 `homeCourseCode/homeCourseName` 字段。
   - 对订阅类型为本校课程（`source === 'home'` 或订阅内存在本校映射）的场景，统一写入本校信息，同时保留 `productCourse*` 字段。
2. **仓库层复用现有结构**：
   - `StudentRepository.addCourseToSelected` / `buildSelectedCourseEntry` 原本支持 home/product 共存，只需确保 payload 字段完备即可。
   - 若本校信息缺失，仍沿用兜底逻辑（显示“未关联本校课程”）。
3. **UI 自动渲染**：
   - `renderSelectedCoursesSection` 会依据 `homeCourse*` 字段渲染第一列，无需额外调整。

## 具体步骤
1. **识别可获取的本校字段**
   - 在匹配课程模态中确认订阅详情 (`context.subscription`、`context.course`) 包含的 `homeCourseCode/homeCourseName`、`courseCode/courseName` 等字段。
   - 若订阅类型为本校课程，记录需要带入 payload 的字段清单。
   - 参考记录：`selected-courses-home-course-fields.md` 总结了模态上下文与匹配卡片可用字段。
2. **增强 `buildSelectedCoursePayload`**
   - 增加对本校字段的补齐逻辑：
     - `homeCourseCode = course.homeCourseCode || context.course?.code || payload.courseCode`。
     - `homeCourseName = course.homeCourseName || context.course?.name || payload.courseName`。
   - 确保无论 `source` 为 home 还是 product，都能带上本校字段。
3. **仓库层验证**
   - 调用 `StudentRepository.addCourseToSelected` 写入后读取返回的 `entry`，确认 `homeCourse`、`homeCourseName` 正常。
   - 运行 `scripts/tests/selectedCoursesHomeAssociationSelfCheck.js` 验证本校字段写入；再运行 `selectedCoursesDuplicateSelfCheck.js`，确保多条记录仍能写入。
4. **前端验证**
   - 在 UI 中打开匹配课程模态，对本校订阅点击“加入已选课程”。
   - 确认“学生已选课程”列表显示本校列的代码与名称，且产品列保持原行为。
5. **兜底与回归**
   - 对缺少本校信息的订阅保留原有提示，避免新增错误。
   - 回归测试批量订阅、续期等操作，确保无副作用。

## 验证与交付
- 记录脚本输出与界面截图，佐证本校字段成功展示。
- 按需更新文档或工单，说明已支持本校课程自动关联。