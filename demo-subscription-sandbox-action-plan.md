# 演示订阅交互改造方案

## 1. 背景与目标
- **现状**：演示订阅卡片按钮可点击，但调用真实仓储接口时返回“未找到订阅 demo-...”，交互失败。
- **目标**：为演示数据提供与真实订阅一致的操作体验（续期、取消、编辑等），但变更仅限当前会话，刷新后恢复原始模板。
- **边界**：不得影响真实订阅数据的读写流程；无需将演示操作结果写入持久化存储。

## 2. 总体思路
1. **识别沙箱上下文**：在`StudentRepository.resolveSubscriptionContext`中明确区分真实订阅与演示订阅，附加`isSandbox`、`__sandbox`标记。
2. **沙箱数据层**：复用现有`DemoSubscriptionSandbox`在内存层维护演示订阅快照，必要时支持`localStorage`托底（按`demoPersistence`配置）。
3. **API 分流**：在所有操作入口（续期、取消、编辑）中，根据`isSandbox`选择调用`repository.demoActions`而非真实写接口。
4. **UI 即时反馈**：操作成功后更新`window.currentSubscriptionContext`并刷新订阅中心，让界面立即呈现沙箱变化；Toast 文案标注“演示”提示。
5. **刷新回滚**：不对真实存储写入，页面刷新后通过`data/students.js`模板重新种子化，自动回滚至初始状态。

## 3. 实施步骤
### 3.1 仓储层调整
- [ ] `resolveSubscriptionContext`：
  - 若命中演示订阅模板或沙箱快照，返回时加上`isSandbox: true`，并确保`subscription.__source = 'demo'`、`subscription.__sandbox = true`。
  - 对沙箱快照命中后写回`DemoSubscriptionSandbox`，保持上下文同步。
- [ ] `performDemoAction`/`demoActions.cancel`/`demoActions.renew`：
  - 统一在返回快照上附带`__sandbox`标记及`__sandboxChanged`提示，用于 UI 判断是否需额外提示。
  - 捕获`notFound`错误并转换为用户可读信息（如“演示订阅已刷新，请重新打开卡片”）。

### 3.2 前端交互调整 (`index.html`)
- [ ] `handleAction`：优先读取`context.isSandbox`，并与订阅对象上的`__sandbox`合并，决定使用`repository.demoActions`。
- [ ] `openCancelSubscriptionModal`、`openRenewSubscriptionModal`：
  - 接受`isSandbox`标记，更新提示文案（追加“演示模式：该操作仅作用于当前沙箱数据”）。
  - 存入的`window.currentSubscriptionCancellation`/`window.currentSubscriptionRenewal`需携带`isSandbox`。
- [ ] `submitCancelSubscription`、`submitRenewSubscription`、`submitSubscribe`：根据上下文选择 demo/真实方法；错误提示区分沙箱与真实场景。
- [ ] `handleSubscriptionActionSuccess`：当`context.isSandbox`为真时，使用演示 Toast 文案，强调操作仅影响沙箱数据。

### 3.3 数据刷新与缓存
- [ ] 操作成功后调用`repository.resolveSubscriptionContext`刷新上下文，再触发`refreshSubscriptionCenter`与`SubscriptionModule.syncButtonStates`。
- [ ] 若启用`demoPersistence: 'memory'`，刷新即回滚；如切换到`localStorage`，需补充手动清理入口（可在调试菜单或重置按钮触发）。

### 3.4 验证用例
1. **取消演示订阅**：
   - 进入演示卡片 -> 取消 -> Toast 显示“演示订阅已取消”，卡片状态更新为已取消。
   - 刷新页面 -> 演示订阅恢复为原始状态。
2. **续期演示订阅**：
   - 续期 30 天 -> 截止日期延后，历史记录追加“renewed”。
   - 刷新 -> 恢复默认期限。
3. **真实订阅回归**：
   - 在存在真实订阅的学生上执行续期/取消，确认调用真实仓储方法且数据持久化。
4. **错误兜底**：
   - 手动删除沙箱内存后执行操作，提示“演示订阅已刷新，请重新打开卡片”。

## 4. 推广与注意事项
- **配置依赖**：需确保`AppConfig.subscription.demoActionsMode = 'sandbox'`时才启用上述逻辑。
- **事件钩子**：可通过监听`demoSubscriptions:changed`事件实现额外调试日志或 UI 标识。
- **后续扩展**：若未来需要演示新增订阅，可在`demoActions`中追加`create`实现，同样仅作用于沙箱层。

## 5. 时间评估
| 任务 | 预估 | 备注 |
| --- | --- | --- |
| 仓储层标记与异常优化 | 0.5 天 | 覆盖`resolveSubscriptionContext`、`performDemoAction` |
| 前端交互分流与文案 | 1 天 | 包含模态框、按钮处理、Toast 文案 |
| 手动测试与调整 | 0.5 天 | 涵盖演示与真实订阅验证 |
| **合计** | **2 天** | 不含潜在回归修复 |

## 6. 风险与缓解
- **风险**：沙箱/真实逻辑混用导致真实数据未更新。
  - **缓解**：操作前统一分流，`demoActions`与真实接口完全隔离。
- **风险**：演示状态刷新后上下文失效。
  - **缓解**：在失败提示中引导重新打开卡片，并在`handleAction`前重新拉取上下文。
- **风险**：演示数据持久化（localStorage）与预期不符。
  - **缓解**：默认使用内存模式，localStorage 仅在开发调试时启用，并提供清理方法。
