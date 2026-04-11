import { useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UserData } from "@/types";
import {
  changeUsernameService,
  changeEmailService,
  changePasswordService,
  deleteAccountService,
} from "@/services/user/userService";

type UseUserAccountParams = {
  uid: string;
  setUserData: Dispatch<SetStateAction<UserData | null>>;
  mirrorProfileLocally: (patch: Partial<UserData>) => Promise<void>;
};

type UseUserAccountResult = {
  changeUsername: (newUsername: string, password: string) => Promise<void>;
  changeEmail: (newEmail: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteUser: (password?: string) => Promise<void>;
};

export function useUserAccount({
  uid,
  setUserData,
  mirrorProfileLocally,
}: UseUserAccountParams): UseUserAccountResult {
  const changeUsername = useCallback(
    async (newUsername: string, password: string) => {
      if (!uid) return;
      await changeUsernameService({ uid, newUsername, password });
      await mirrorProfileLocally({ username: newUsername });
    },
    [uid, mirrorProfileLocally]
  );

  const changeEmail = useCallback(
    async (newEmail: string, password: string) => {
      if (!uid) return;
      await changeEmailService({ uid, newEmail, password });
    },
    [uid]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordService({ currentPassword, newPassword });
    },
    []
  );

  const deleteUser = useCallback(
    async (password?: string) => {
      if (!uid) return;
      await deleteAccountService({ uid, password: password || "" });
      setUserData(null);
    },
    [uid, setUserData]
  );

  return useMemo(
    () => ({
      changeUsername,
      changeEmail,
      changePassword,
      deleteUser,
    }),
    [changeUsername, changeEmail, changePassword, deleteUser]
  );
}
