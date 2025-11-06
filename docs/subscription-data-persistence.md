# Subscription Data Persistence Guide

## Overview
- Dynamic subscriptions are managed by `scripts/studentRepository.js` and persist across sessions according to `AppConfig.subscription.persistence`.
- Supported modes: `memory` (session only), `localStorage` (browser storage), `api` (placeholder for future server integration).
- Demo templates remain in `data/students.js` and are appended only when `enableDemoData` is `true`.

## Storage Providers
| Mode | Description | Key Pattern | Notes |
| --- | --- | --- | --- |
| memory | In-memory map scoped to current tab | — | Fallback for unsupported environments or API errors |
| localStorage | Browser storage via `window.localStorage` | `subscription:<studentId>` | Automatically migrates legacy `subscription-center:<id>` entries and clears obsolete keys |
| api | Reserved for remote persistence | — | Currently logs warnings and falls back to memory |

### Local Storage Flow
1. On first read, the repository tries the in-memory cache, then the configured provider.
2. When using `localStorage`, the loader attempts the new key and then the legacy key:
   - Legacy payloads are parsed, re-saved under the new prefix, and the old key is deleted.
   - JSON parse failures are caught and reported via console warning.
3. Whichever provider returns data is cloned to avoid accidental mutation and saved back into the memory cache.

### Write Path
- All repository mutators call `persistDynamicSubscriptions(studentId, list)`.
- The helper normalizes the payload, updates the in-memory snapshot, and delegates to the active provider.
- Provider failures do not block the UI; warnings clarify that the data only lives in memory until the page reloads.

## Configuration Snippet
```html
<script>
  window.AppConfig = window.AppConfig || {};
  window.AppConfig.subscription = {
    enableDemoData: true,
    persistence: 'localStorage' // 'memory' | 'localStorage' | 'api'
  };
</script>
```

## Error Handling
- Missing `localStorage` support: repository logs a warning and continues in memory mode.
- JSON parse errors: payload discarded with warning; UI starts from an empty list.
- API mode: each persistence call warns that it is not implemented.

## Manual Validation Checklist
1. **Persistence**: Add a subscription, refresh页面，确认卡片仍在；同时查看浏览器 `localStorage` 是否存在 `subscription:<id>`。
2. **Toggle Demo**: 设置 `enableDemoData=false` 重新加载，确认只剩真实订阅且排序不变。
3. **Legacy Migration**: 在控制台写入旧键 `subscription-center:<id>`, 刷新后确认自动迁移至新前缀。
4. **Failure Fallback**: 切换 `persistence='api'` 并执行新增，观察警告信息，确认在当前标签下仍能看到新增订阅。
5. **Data Reset**: 清除 `subscription:<id>` 项后刷新，确认仓库回退到空列表且不抛异常。
