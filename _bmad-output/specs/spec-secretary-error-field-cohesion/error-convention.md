# Error & Required-Field Convention (secretary web)

The one convention the app standardizes on. All three surfaces already exist in the codebase; this file names which is authoritative and when each applies.

## The three surfaces (and their existing anchors)

| Surface | Use for | Authoritative implementation | Style tokens (from live repo) |
|---|---|---|---|
| **Inline field error** | A specific field failed validation (missing / invalid value) | `ClassInCompetitionModal.jsx:548-552` pattern: `fieldErrors.<key>` → `<div className="mt-1.5 text-right text-xs text-red-600">{msg}</div>` | `mt-1.5 text-right text-xs text-red-600` |
| **In-modal form banner** | A modal submit failed as a whole (server rejection, load error inside a modal) | `JudgeModal.jsx:212-216` block | `rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]` |
| **Page toast** | A page-level async op failed/succeeded (list load, save on a full page, delete) | `ToastMessage.jsx` (error + success variants), driven by `showToast(type, message)` | error: `border-[#E7BABA] bg-[#FDF4F4] text-[#A54848]`; success: `border-[#B9D9C0] bg-[#F4FBF5] text-[#2F6B3B]` |

The error palette is already shared between the in-modal banner, the toast error variant, and the class-modal validation toast — so the surfaces are visually coherent today; the gap is *which forms use which*, and forms that hand-roll their own inline style.

## When each applies (the rule)

1. **Per-field, pre-submit validation** → **inline field error** (CAP-1), rendered directly under the offending field. This is the primary signal; a form-level toast/banner accompanies it only as a summary ("יש למלא את השדות המסומנים").
2. **Modal submit rejected by the server** → **in-modal form banner AND page error toast, both fed by the same `getErrorMessage` string** (CAP-2). This is the app's existing verified pattern — do not deviate: the class form does exactly this at `useSecretaryCompetitionClassesPage.js:471-475` (`setClassModalError(msg)` + `showToast("error", msg)`), banner rendered at `ClassInCompetitionModal.jsx:891-893`; `JudgesManagementPage.jsx` already matches. Uniformity is the rule Oren set.
3. **Full-page async op (list load, page-level save, delete, filter)** → **page toast** (CAP-2), via the page's existing `showToast`.

Never mix: a per-field problem does not surface as a page toast alone; a page load failure does not surface as inline text.

## Required-field asterisk (CAP-4)

- `Field.jsx:34` already renders `{props.required && <span className="text-red-500 mr-0.5">*</span>}`. Passing `required` to a `Field` is the whole mechanism — no new component.
- **Forms that use `Field`:** pass `required` on every mandatory field. (Arena / StallCompound / ServiceProduct already do — reference, not work.)
- **Forms that do NOT use `Field`** (raw `<label>` + input): either migrate the label to `Field`, or add the identical inline asterisk span (`<span className="text-red-500 mr-0.5">*</span>`) to the raw label. Prefer migrating to `Field` where the form is small; otherwise add the span. Decide per form in the change list, but the *marker* must be identical everywhere.
- **What counts as mandatory** = whatever the form's own save/continue validation rejects when empty. Walk each form's validation (anchors in `change-list.md`) and mark exactly those fields — no more, no less.

## Copy convention (CAP-3)

- Field-level errors are imperative and name the action: "יש לבחור …" (choose), "יש להזין …" (enter). This matches the existing `FIELD_VALIDATION_RULES` voice.
- The consolidated form-level validation toast is the existing "…לא נשמר. יש למלא את השדות המסומנים." shape.
- All proposed/changed strings live in `hebrew-strings.md` for sign-off; nothing new ships unapproved.
