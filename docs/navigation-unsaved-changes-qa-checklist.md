# Navigation & Unsaved Changes QA Checklist

## Scope
- Add Meal flow (`Camera`, `Barcode`, `Describe`, `TextAnalyzing`, `PreparingReview`, `Review`, `Manual/Edit details`)
- Edit/detail flows (`MealDetails`, `EditHistoryMealDetails`)
- Profile/settings forms (`Change Email`, `Username`, `Password`, `Delete Account`, `Send Feedback`)
- Full-screen pickers/selectors (`SelectSavedMeal`, `MealAddMethod` sheet)

## 1) iOS swipe back
- Open a screen with unsaved form/draft changes.
- Perform iOS edge swipe back.
- Verify discard-confirm modal appears.
- Tap `Continue editing` and verify state remains.
- Swipe back again and tap discard/leave; verify navigation completes.

## 2) Android hardware back
- Open a screen with unsaved form/draft changes.
- Press hardware back.
- Verify discard-confirm modal appears.
- Press hardware back again to close the confirm modal.
- Press hardware back again and confirm discard; verify navigation completes.

## 3) Tap explicit back/close affordance
- On each full-screen flow without bottom tabs, tap visible back/close button.
- With no unsaved changes: verify immediate exit behavior.
- With unsaved changes: verify confirm modal before exit.

## 4) Draft loss vs preservation
- In Add Meal: make draft changes, trigger exit, choose `Continue editing`, verify draft state remains.
- Trigger exit again, choose discard/leave, verify draft is discarded and flow exits.
- Save meal path: verify successful save still exits without discard modal.
