# Non-Tab Screen Navigation Audit

Legend:
- `Affordance`: explicit `back`/`close` control in UI.
- `Guard`: navigation interception (`beforeRemove` / shared guard hook).
- `Confirm`: discard/leave confirmation when unsaved changes/draft can be lost.

## Add Meal Flow
| Screen | Affordance | Guard | Confirm | Notes |
| --- | --- | --- | --- | --- |
| `CameraDefault` | `back` or `close` | yes | no | No form edits on camera preview itself. |
| `BarcodeScan` | `back` or `close` | yes | no | Returns to prior step/manual panel. |
| `BarcodeProductNotFound` | `back` (to scan) | yes | no | Recovery step; no unsaved form draft beyond retry code. |
| `DescribeMeal` | `back` or `close` | yes (shared hook) | yes | Unsaved text input protected. |
| `TextAnalyzing` | `back` or `close` | parent flow | no | Processing state, explicit exit added. |
| `PreparingReviewPhoto` | `back` or `close` | parent flow | no | Processing/recovery state, explicit exit added. |
| `ReviewMeal` | `close` | yes (shared hook) | yes | Unsaved meal draft protected on all exits. |
| `ManualMealEntry` | `back`/`close` | yes (shared hook) | yes | Unsaved edit session protected. |
| `EditMealDetails` | `back`/`close` | yes (shared hook) | yes | Unsaved edit session protected. |
| `IngredientsNotRecognized` | explicit action buttons | n/a | no | Full-screen now without bottom tabs (`showNavigation=false`). |

## Edit / Detail / Draft Flows
| Screen | Affordance | Guard | Confirm | Notes |
| --- | --- | --- | --- | --- |
| `MealDetails` | `back` | existing + explicit button | no | Read/details view + edit entrypoint. |
| `EditHistoryMealDetails` (via `MealDetailsFormScreen`) | `back`/`close` | yes (shared hook) | yes | Unsaved edit session protected. |
| `SelectSavedMeal` | `close` | n/a | no | Selector screen; explicit close added. |
| `SavedMealsCamera` | explicit secondary back action | existing | no | Camera retake flow already explicit. |

## Chat / Modal / Sheet Subflows
| Screen/Flow | Affordance | Guard | Confirm | Notes |
| --- | --- | --- | --- | --- |
| `MealAddMethod` sheet | explicit `close` button + backdrop | n/a | no | Explicit close affordance added. |

## Profile / Settings / Forms
| Screen | Affordance | Guard | Confirm | Notes |
| --- | --- | --- | --- | --- |
| `ChangeEmail` | `back` (FormScreenShell) | yes (shared hook) | yes | Unsaved form values protected. |
| `UsernameChange` | `back` (FormScreenShell) | yes (shared hook) | yes | Unsaved form values protected. |
| `ChangePassword` | `back` (FormScreenShell) | yes (shared hook) | yes | Unsaved form values protected. |
| `DeleteAccount` | `back` (FormScreenShell) | yes (shared hook) | yes | Unsaved password input protected. |
| `SendFeedback` | `back` (FormScreenShell) | yes (shared hook) | yes | Unsent message/attachment protected. |
| Other profile hubs/read-only screens | explicit back via FormScreenShell | n/a | no | No unsaved editable state. |

## Other Non-Tab Full-Screen Screens
| Screen | Affordance | Guard | Confirm | Notes |
| --- | --- | --- | --- | --- |
| `WeeklyReport` | explicit back in header | no | no | Read-only. |
| `Terms` / `Privacy` | explicit close action | no | no | Read-only legal content. |
| `CheckMailbox` | explicit close | no | no | Read-only + resend actions. |
| Auth entry screens (`Login`/`Register`/`ResetPassword`) | explicit route actions in-screen | no | no | Root auth flow; no stack-depth back requirement. |
