# Phase 6 – Edit/Renew/Cancel Subscription Actions

> **Scope reminder**: This report only covers the first batch actions (`edit`, `renew`, `cancel`). Other card buttons remain untouched per business instruction.

## 1. Test Coverage Summary

| Scenario | Steps | Expected Outcome | Result |
| --- | --- | --- | --- |
| Edit – happy path | 1. 选择任意 `waiting` 状态订阅 → 2. 点击“编辑条件” → 3. 修改设置并保存 | Toast 显示“订阅条件已更新”；卡片刷新并同步按钮状态；`SubscriptionAuditLog` 记录成功 | ✅ 手工验证（2025-11-04） |
| Edit – 非 waiting 状态 | 1. 找到 `matched`/`cancelled` 等订阅 → 2. 点击“编辑条件” | Toast 显示“仅支持对等待匹配状态的订阅调整条件”；按钮 loading 结束；日志记录 `blocked` | ✅ 手工验证 |
| Renew – happy path | 1. 打开任意订阅 → 2. 点击“续期” → 3. 使用默认日期提交 | Toast 显示“续期成功”；截止日期延长并刷新卡片；日志记录成功 | ✅ 手工验证 |
| Renew – 新日期早于当前 | 1. 打开续期模态 → 2. 选择早于当前截止的日期 → 3. 提交 | Toast 显示“续期日期需晚于当前值”；按钮恢复；日志记录 `deadline-earlier` | ✅ 手工验证 |
| Cancel – happy path | 1. 点击“取消订阅” → 2. 在弹窗确认（可填写原因） | Toast 显示“订阅已取消”；卡片更新为取消状态；原因写入仓库；日志记录成功 | ✅ 手工验证 |
| Cancel – 仓库缺失/未初始化 | 通过在调试面板暂时移除 `StudentRepository`（模拟加载失败）再执行 | Toast 显示“取消暂不可用”；日志记录 `repository-missing` | ⚠️ 建议保留为开发环境注入测试 |
| 通用异常 – 上下文缺失 | 复现方式：在控制台清空 `window.currentSubscriptionContext` 后直接提交续期/取消 | Toast 给出上下文失效提示；日志记录 `missing-context`；模态关闭时按钮恢复 | ✅ 手工验证 |
| 首次订阅默认 180 天 | 1. 在控制台通过 `StudentRepository.addSubscription` 创建无 deadline 的订阅 → 2. 刷新卡片 | 卡片展示创建日 +180 天；`metadata.deadlineSource` 为 `auto-180` | ✅ 手工验证（2025-11-05） |
| 续期默认顺延 | 1. 对即将到期的订阅执行默认续期 → 2. 查看卡片 | 截止日期顺延 180 天；toast 显示成功；`metadata.deadlineSource` 为 `renew-auto-180` | ✅ 手工验证 |
| “剩 7 天” 提示 | 1. 将订阅截止日期改为 7 天内 → 2. 刷新卡片 | 截止时间文字变红，出现“剩余 X 天即将到期”提示；续期后提示消失 | ✅ 手工验证 |
| 续期/取消模态文案 | 1. 打开续期/取消模态（即将到期与已过期各一次） | 续期模态提示随状态变化；取消模态提示补充剩余天数或已过期说明 | ✅ 手工验证 |

> 如需复现特定异常，可在浏览器控制台手动改写全局变量或临时注释仓库绑定逻辑。

## 2. 手工验证指南

1. 启动静态服务器或直接用 VS Code Live Server 打开 `index.html`。
2. 在学生中心选择任意带订阅的学生；确认页面右侧卡片展示 edit/renew/cancel 三个按钮。
3. 按“测试覆盖总结”中的步骤逐条执行，并观察：
   - Toast 反馈是否出现且符合文案；
   - 按钮 loading 状态是否在流程结束后复原；
   - 订阅卡片状态是否刷新（依赖 `refreshSubscriptionCenter` mock）；
   - 截止日期颜色 / 提示是否与剩余天数一致，续期后“剩 7 天”提示应即时消失。
4. 打开浏览器控制台，查看 `window.SubscriptionAuditLog`，确认每次操作均有一条记录（含 `action`、`state`、`timestamp`）。
5. 若需验证仓库写入，针对取消或续期操作可在控制台调用：
   ```js
   StudentRepository.resolveSubscriptionContext(<studentId>, <subscriptionId>)
   ```
   检查 `metadata.cancelledReason`、`metadata.deadlineSource` 等字段与历史记录是否匹配。

## 3. 交付物清单

- UI / 交互：三大动作均提供统一的 toast 成功提示、错误兜底以及按钮 loading 复位；卡片截止日期支持动态高亮、模态文案随到期状态调整。
- 日志：`recordSubscriptionActionLog` 自动记录所有成功、失败、拦截场景，可供后续排查。
- 取消动作数据结构：`StudentRepository.cancelSubscription` 额外持久化 `cancelledReason`。
- 截止日期辅助：新增 `SubscriptionDeadlineHelper` 负责缓存、计算 `daysUntilDeadline` 与提醒文案，续期/取消后自动失效缓存。
- 文档：当前文件作为阶段 6 的测试与交接说明，位于 `docs/subscription-actions-phase6.md`。

## 4. 已知限制

- `refreshSubscriptionCenter` 与 `SubscriptionModule.syncButtonStates` 仍依赖外部实现；在纯静态环境下需要模拟以观察卡片刷新。
- 其它订阅动作（jump/view/notifyDetail 等）未进入本批次测试，后续阶段需单独补充。
- 未集成自动化测试；建议后续接入端到端脚本或至少将手工用例整理成 QA Checklist。

## 5. 推荐后续动作

1. 当外部导航路由确定后，再扩展 Phase 6 验收到余下按钮。
2. 将本文件整理进团队共享文档库，并同步给运营/客服了解新的提示文案。
3. 若计划接入自动化测试，可把 `SubscriptionAuditLog` 作为断言基线，结合 UI Testing Library 完成基本流程校验。
