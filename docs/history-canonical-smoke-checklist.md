# History Canonical Smoke Checklist

Scope: History list, meal details, history edit, and history delete.

1. Log a meal from Add Meal and confirm it appears on Home, History, and Statistics with the same name, macros, `cloudId`, and day grouping.
2. Open History and change search text and nutrition/date filters. Confirm results update locally without a visible loading/refetch cycle and the selected date range is inclusive by local `dayKey`.
3. Open a History row. Confirm details resolve by `cloudId` from the local meal store and do not display a saved-template fallback when the local history meal is absent.
4. Edit the meal from details, change name/macros/time/photo, save, and confirm Home, History, details, and Statistics reflect the local edit before network sync.
5. Delete the meal from details and confirm it disappears immediately from History/Home/Statistics, details closes, and the delete remains queued while offline.
6. Open Saved Meals and delete a saved template. Confirm this does not delete any logged History meal unless that meal is separately deleted from History details.
7. Repeat steps 3-5 offline, then reconnect and confirm queued update/delete operations sync without restoring the deleted meal.
