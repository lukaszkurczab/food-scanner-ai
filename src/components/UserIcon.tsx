import React, { useEffect, useState } from "react";
import { View, Image } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useUserContext } from "@/src/context/UserContext";

type Props = {
  size?: number;
  style?: any;
  accessibilityLabel?: string;
};

export const UserIcon: React.FC<Props> = ({
  size = 120,
  style,
  accessibilityLabel = "User avatar",
}) => {
  const theme = useTheme();
  const { userData } = useUserContext();
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const checkIfFileExists = async (path: string) => {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAndSaveAvatar = async () => {
      if (!userData) return;

      if (userData.avatarLocalPath) {
        const exists = await checkIfFileExists(userData.avatarLocalPath);
        if (exists) {
          setAvatarPath(userData.avatarLocalPath);
          return;
        }
      }

      if (userData.avatarUrl) {
        const fileUri =
          FileSystem.documentDirectory + "user_avatar_" + userData.uid + ".jpg";
        const exists = await checkIfFileExists(fileUri);

        if (!exists) {
          try {
            await FileSystem.downloadAsync(userData.avatarUrl, fileUri);
          } catch (e) {
            setAvatarPath(null);
            return;
          }
        }
        setAvatarPath(fileUri);
        return;
      }

      setAvatarPath(null);
    };

    fetchAndSaveAvatar();

    return () => {
      isMounted = false;
    };
  }, [userData?.avatarLocalPath, userData?.avatarUrl, userData?.uid]);

  const isPremium = userData?.plan === "premium";

  const borderColor = isPremium ? theme.macro.fat : theme.card;
  const borderWidth = isPremium ? 4 : 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.card,
          position: "relative",
        },
        style,
      ]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {avatarPath ? (
        <Image
          source={{ uri: avatarPath }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : userData?.avatarUrl ? (
        <Image
          source={{ uri: userData.avatarUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <MaterialIcons
          name="person"
          size={size * 0.66}
          color={theme.textSecondary}
        />
      )}

      {isPremium && (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            backgroundColor: theme.card,
            borderRadius: size * 0.18,
            padding: size * 0.06,
            elevation: 3,
          }}
          accessible
          accessibilityLabel="Premium user"
        >
          <MaterialIcons
            name="star"
            size={size * 0.22}
            color={theme.macro.fat}
          />
        </View>
      )}
    </View>
  );
};

export default UserIcon;
