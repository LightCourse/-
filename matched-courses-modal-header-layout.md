# 模态头部布局变更

## 新信息块
- **学生姓名** → `matchedCoursesStudentName`
- **学生学校** → `matchedCoursesStudentSchool`
- **订阅课程** → `matchedCoursesCourseLabel`
- **课程所属学校** → `matchedCoursesCourseSchool`

## 已删除节点
- `matchedCoursesDeadlineLabel`
- `matchedCoursesDeadlineHint`
- 原 `matchedCoursesSchoolLabel`（课程学校标签已替换为新的命名）

> 下一步需更新渲染/重置逻辑以适配上述节点。