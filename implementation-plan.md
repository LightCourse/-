# 订阅中心优化实施阶段划分

## 阶段 1：仓库层扩展准备
- 梳理 `scripts/studentRepository.js` 的读取逻辑，确认字段与数据结构。
- 确定订阅唯一标识策略（复用 `courseCode` 或引入 UUID）及错误类型约定。
- 搭建事件通知接口骨架（如 `subscribe`/`emit`）或回调注册表。

## 阶段 2：仓库写入 API 实现
- 实现 `addSubscription`、`updateSubscription`、`removeSubscription`、`applyBatchSubscriptions` 方法，保证返回浅拷贝。
- 在成功写入后触发 `emit('subscriptions:changed', { studentId })`，并处理重复监听保护。
- 为重复订阅、数据缺失等场景抛出自定义错误，准备最小验证脚本或测试。

## 阶段 3：前端刷新封装
- 在 `index.html` 中提取 `refreshSubscriptionCenter(studentId)`，负责调用 `renderSubscriptionSection`。
- 在 `DOMContentLoaded` 或 `SubscriptionModule.init()` 中注册仓库事件监听，绑定刷新逻辑与按钮状态同步。

## 阶段 4：单门订阅流程接入
- 改造 `submitSingleCourse`：调用仓库 `addSubscription`，捕获错误沿用现有提示，成功后关闭模态并恢复按钮。
- 校验 `SubscriptionModule` 相关按钮禁用逻辑，确保刷新后重新计算状态。

## 阶段 5：批量订阅与其他操作
- 将 `submitBatchCourses` 接入 `applyBatchSubscriptions`，根据返回结果更新提示信息。
- 对续期、取消、查看匹配等操作分别调用 `updateSubscription`/`removeSubscription`，并复用事件通知。

## 阶段 6：回归与验收
- 手动验证单门、批量、取消、续期流程，确认卡片即时更新且按钮状态一致。
- 回归整个订阅中心的筛选、分页、模态交互等既有功能，确保无回归。
- 整理测试记录与变更说明，为提交或上线做准备。
