# 学生已选课程同步优化实施方案

## 目标概述
- 点击订阅卡片内“查看匹配课程 → 加入已选课程”后，匹配课程即刻同步至该学生的“学生已选课程”页签。
- 保持现有 UI、交互与批量订阅能力不回退，同时兼容“仅产品课程”与“本校课程+产品课程”两类订阅来源。

## 优化步骤

1. **数据结构梳理与补足**
   - 对照 `renderSelectedCoursesSection` 所需字段，完善 `StudentRepository.addCourseToSelected`：
     - `source === 'home'`：写入 `homeCourse`、`homeCourseName`、`status`、`audit`、`category` 等字段，同时附带映射得到的 `productCourses`。
     - `source === 'product'`：允许只填充产品侧字段，`homeCourse*` 留空但保留键值，方便渲染回退。
   - 在成功写入后维持 `selectedCourses:changed` 事件发射，并补充 `homeCourse` 缺省校验避免旧数据报错。

2. **选课列表读取优化**
   - 调整 `StudentRepository.getSelectedCourses(studentId, options)`：
     - 同时读取 `details.selectedCourses` 与运行时推算列表。
     - 以 `(source, courseCode/productCourseCode)` 为 key 去重合并，写入缓存，确保手动添加与自动推算列表共存。

3. **匹配课程模态回调增强**
   - 在 `matchedCoursesModal` 的 `mergedOnAddCourse` 成功分支：
     - 调 `StudentRepository.getSelectedCourses(student.id, { forceRefresh: true })`。
     - 执行 `StudentAnalysisController.scheduleRefresh()`，触发表格重渲染。
     - 保持按钮状态置为“已加入”，展示成功 Toast，对仅产品订阅增加“暂未关联本校课程”提示。

4. **事件桥接与生命周期管理**
   - 新增 `initSelectedCoursesEventBridge`（`index.html` lifecycle 区域）：
     - 调用 `StudentRepository.subscribe('selectedCourses:changed', handler)`。
     - 若事件中的 `studentId` 等于当前页面学生，则执行 `StudentAnalysisController.scheduleRefresh()`。
     - 使用内部 `_initialized` 标记保证仅注册一次，并在 `beforeunload` 时清理。
   - 页面初始化与学生切换时调用该桥接，并继续保持 `SubscriptionModule.syncButtonStates` 调用。

5. **渲染兜底处理**
   - 在 `appendSelectedCourseRowCells` 中：
     - 对缺失的 `homeCourse`/`homeCourseName` 显示“未关联本校课程”或留空但保留结构。
     - 产品数据缺失时同样输出 `'-'`。
     - 渲染批量/单门订阅按钮时依据 `data-course-type` 判断是否启用，避免对仅产品行挂载本校操作。

6. **兼容性与风险控制**
   - 去重逻辑确保不会误删既有条目，可通过日志或简单单元测试验证。
   - 补字段时保持旧数据可渲染，通过构造缺省样例进行冒烟测试。
   - 事件桥接需防止重复注册或在无学生上下文时空调用。

7. **验证流程**
   1. “本校订阅”链路：操作流程 → 课程出现在“学生已选课程”并显示完整信息，批量/单门按钮可用。
   2. “仅产品订阅”链路：确认表格展示产品信息、本校列使用兜底文案，按钮遵循规则。
   3. 控制台确认 `selectedCourses:changed` handler 仅注册一次，无报错。
   4. 向数据源写入旧格式选课数据并刷新，确保渲染稳定。
   5. 回归测试批量订阅、续期等功能确保无副作用。

## 注意事项
- 默认保持 ASCII 字符，避免无必要的样式/布局调整。
- 所有变更提交前需运行上述验证步骤，防止现有功能回归问题。
- 若未来需要为“仅产品订阅”自动填充本校课程，需另行扩展数据来源，本方案暂不处理。