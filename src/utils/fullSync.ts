export async function fullSync({
  syncUserProfile,
  syncSurvey,
  syncSettings,
  getMeals,
  getChatHistory,
}: {
  syncUserProfile: () => Promise<void>;
  syncSurvey: () => Promise<void>;
  syncSettings: () => Promise<void>;
  getMeals: () => Promise<void>;
  getChatHistory: () => Promise<void>;
}) {
  await Promise.all([
    syncUserProfile(),
    syncSurvey(),
    syncSettings(),
    getMeals(),
    getChatHistory(),
  ]);
}
