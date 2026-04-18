import React, { createContext, useCallback, useContext, useMemo } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { useAuthContext } from "./AuthContext";
import {
  changeEmailService,
  changePasswordService,
  changeUsernameService,
  deleteAccountService,
  exportUserData as fetchUserExportData,
} from "@/services/user/userService";

export type UserAccountContextType = {
  deleteUser: (password?: string) => Promise<void>;
  changeUsername: (newUsername: string, password: string) => Promise<void>;
  changeEmail: (newEmail: string, password: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  exportUserData: () => Promise<string | void>;
};

const UserAccountContext = createContext<UserAccountContextType>({
  deleteUser: async () => {},
  changeUsername: async () => {},
  changeEmail: async () => {},
  changePassword: async () => {},
  exportUserData: async () => {},
});

export const UserAccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid: authUid } = useAuthContext();
  const uid = authUid || "";

  const deleteUser = useCallback(async (password?: string) => {
    if (!uid) return;
    await deleteAccountService({ uid, password: password || "" });
  }, [uid]);

  const changeUsername = useCallback(
    async (newUsername: string, password: string) => {
      if (!uid) return;
      await changeUsernameService({ uid, newUsername, password });
    },
    [uid]
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

  const exportUserData = useCallback(async (): Promise<string | void> => {
    if (!uid) return;
    const data = await fetchUserExportData(uid);
    const json = JSON.stringify(data, null, 2);

    const html = `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <style>
            body { font-family: -apple-system, Roboto, Inter, Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 12px 0; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 12px; background: #f5f5f5; padding: 12px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Fitaly - User Data Export</h1>
          <pre>${json
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</pre>
        </body>
      </html>`;

    const { uri: tmpPdf } = await Print.printToFileAsync({ html });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `fitaly_user_data_${yyyy}-${mm}-${dd}.pdf`;

    try {
      if (Platform.OS === "android" && FileSystem.StorageAccessFramework) {
        try {
          const permissions =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted && permissions.directoryUri) {
            const fileUri =
              await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "application/pdf"
              );
            const pdfBase64 = await FileSystem.readAsStringAsync(tmpPdf, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/pdf",
              dialogTitle: "Fitaly - PDF",
            });
            return fileUri;
          }
          const fallback = `${FileSystem.documentDirectory!}${filename}`;
          await FileSystem.copyAsync({ from: tmpPdf, to: fallback });
          await Sharing.shareAsync(fallback, {
            mimeType: "application/pdf",
            dialogTitle: "Fitaly - PDF",
          });
          return fallback;
        } catch {
          const fallback = `${FileSystem.documentDirectory!}${filename}`;
          await FileSystem.copyAsync({ from: tmpPdf, to: fallback });
          await Sharing.shareAsync(fallback, {
            mimeType: "application/pdf",
            dialogTitle: "Fitaly - PDF",
          });
          return fallback;
        }
      }

      const dest = `${FileSystem.documentDirectory!}${filename}`;
      await FileSystem.copyAsync({ from: tmpPdf, to: dest });
      await Sharing.shareAsync(dest, {
        mimeType: "application/pdf",
        dialogTitle: "Fitaly - PDF",
      });
      return dest;
    } finally {
      FileSystem.deleteAsync(tmpPdf, { idempotent: true }).catch(() => {
        // Ignore tmp cleanup failures for export flow.
      });
    }
  }, [uid]);

  const value = useMemo<UserAccountContextType>(
    () => ({
      deleteUser,
      changeUsername,
      changeEmail,
      changePassword,
      exportUserData,
    }),
    [deleteUser, changeUsername, changeEmail, changePassword, exportUserData]
  );

  return (
    <UserAccountContext.Provider value={value}>
      {children}
    </UserAccountContext.Provider>
  );
};

export const useUserAccountContext = () => useContext(UserAccountContext);
