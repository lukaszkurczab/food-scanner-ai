export async function fullSync({
  syncUserProfile,
  syncSettings,
  getMeals,
  getChatHistory,
}: {
  syncUserProfile: () => Promise<void>;
  syncSettings: () => Promise<void>;
  getMeals: () => Promise<void>;
  getChatHistory: () => Promise<void>;
}) {
  await Promise.all([
    syncUserProfile(),
    syncSettings(),
    getMeals(),
    getChatHistory(),
  ]);
}
