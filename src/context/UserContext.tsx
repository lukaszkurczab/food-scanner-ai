import React, { useMemo } from "react";
import type { UserProfileContextType } from "./UserProfileContext";
import { UserProfileProvider, useUserProfileContext } from "./UserProfileContext";
import type { UserAccountContextType } from "./UserAccountContext";
import { UserAccountProvider, useUserAccountContext } from "./UserAccountContext";
import type { AppSettingsContextType } from "./AppSettingsContext";
import { AppSettingsProvider, useAppSettingsContext } from "./AppSettingsContext";

export type UserContextType = UserProfileContextType &
  UserAccountContextType &
  AppSettingsContextType;

export const UserProvider = ({ children }: { children: React.ReactNode }) => (
  <UserProfileProvider>
    <UserAccountProvider>
      <AppSettingsProvider>{children}</AppSettingsProvider>
    </UserAccountProvider>
  </UserProfileProvider>
);

export const useUserContext = (): UserContextType => {
  const userProfileContext = useUserProfileContext();
  const userAccountContext = useUserAccountContext();
  const appSettingsContext = useAppSettingsContext();

  return useMemo(
    () => ({
      ...userProfileContext,
      ...userAccountContext,
      ...appSettingsContext,
    }),
    [userProfileContext, userAccountContext, appSettingsContext]
  );
};
