export async function fullSync({
  getUserProfile,
  getSurvey,
  syncSettings,
  getMeals,
  getChatHistory,
}: {
  getUserProfile: () => Promise<void>;
  getSurvey: () => Promise<void>;
  syncSettings: () => Promise<void>;
  getMeals: () => Promise<void>;
  getChatHistory: () => Promise<void>;
}) {
  await Promise.all([
    getUserProfile(),
    getSurvey(),
    syncSettings(),
    getMeals(),
    getChatHistory(),
  ]);
}
