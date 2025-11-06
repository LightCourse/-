# Demo Subscription Sandbox Optimization Plan

## Goal
Enable demo (static) subscription cards to simulate interactions while keeping them clearly labeled and isolated from real subscription data.

## Key Design Points
- Preserve demo badges and disclaimers so users know the cards are non-production data.
- Allow buttons on demo cards to trigger sandboxed versions of renew, cancel, edit, etc.
- Ensure all demo interactions are routed through a dedicated sandbox store so real dynamic data remains untouched.
- Provide configuration flags to toggle the sandbox behavior and its persistence scope.

## Implementation Steps

### 1. Configuration Extension
- Add `demoActionsMode` to `AppConfig.subscription` with allowed values `'disabled'` (default) and `'sandbox'`.
- Optionally add `demoPersistence` with values `'memory'` (default) or `'localStorage'` to control sandbox storage longevity.
- Update initialization code to read these flags and expose them via `resolveSubscriptionConfig()`.

### 2. Sandbox Data Layer
- Introduce `DemoSubscriptionSandbox` (new module or section in `studentRepository.js`).
  - Maintain per-student demo snapshots in a `Map` (memory) and optionally mirror them to `localStorage` under keys like `subscription-demo:<studentId>`.
  - Provide methods:
    - `load(studentId)` – returns sandbox copy, seeding from demo templates if absent.
    - `save(studentId, list)` – persists sandbox state.
    - `mutate(studentId, subscriptionId, mutator)` – helper to update a specific demo entry.
- Ensure snapshots are deep-cloned to avoid cross-reference with original templates.

### 3. Repository Integration
- Update `StudentRepository.getSubscriptions()`:
  - When `demoActionsMode === 'sandbox'`, fetch demo entries from the sandbox layer instead of raw templates.
  - Append them with `__source: 'demo'` and new flag `__sandbox: true`.
- Introduce a `StudentRepository.demoActions` namespace (or equivalent methods) mirroring real actions (`renew`, `cancel`, `updateConditions`) but targeting the sandbox store.
- Sandbox methods should emit optional sandbox-only events (e.g., `demoSubscriptions:changed`) without touching real caches.

### 4. UI Behavior Adjustments
- In `renderSubscriptionSection()` and `handleAction()`:
  - Detect `sub.__sandbox` to decide action routing.
  - For sandbox entries, call `StudentRepository.demoActions[...]` instead of real write APIs.
  - Maintain the “演示数据，仅供参考” notice but allow buttons to remain enabled.
- Update toast messaging to clarify demo actions: e.g., "演示操作已更新，仅在当前演示数据中生效".
- Ensure post-action re-render fetches updated sandbox data.

### 5. Sandbox Persistence Handling
- When `demoPersistence === 'localStorage'`, read/write sandbox state using keys `subscription-demo:<studentId>` with error handling similar to real persistence.
- For `memory` mode, sandbox data resets on refresh; provide console messages to clarify this behavior.

### 6. Documentation & Testing
- Update existing docs (`subscription-center-overview.md`, `subscription-data-persistence.md`) to describe sandbox flags and behavior.
- Add manual test checklist:
  1. Enable sandbox mode, perform renew/cancel/edit on demo cards, verify changes stay within sandbox and do not affect real cards.
  2. Toggle sandbox off (disabled) to confirm demo buttons revert to read-only.
  3. In localStorage sandbox mode, refresh the page to ensure demo changes persist.
  4. Verify real subscription list remains unchanged after sandbox operations.
- Optional: add developer note on inserting additional demo templates and how sandbox cloning protects against shared mutations.

---
By following these steps, demo cards deliver a realistic interaction experience while remaining clearly segregated from production data flows.
