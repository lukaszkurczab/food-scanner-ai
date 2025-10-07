import React, { useState, useEffect } from "react";
import { View, Image } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useUserContext } from "@/context/UserContext";
import { useTranslation } from "react-i18next";

type Props = {
  size?: number;
  style?: any;
  accessibilityLabel?: string;
  avatarLocalPath?: string | null;
  avatarUrl?: string | null;
  isPremium?: boolean;
};

export const UserIcon: React.FC<Props> = ({
  size = 120,
  style,
  accessibilityLabel,
  isPremium = false,
}) => {
  const theme = useTheme();
  const { userData } = useUserContext();
  const { t } = useTranslation("common");

  const borderColor = isPremium ? theme.macro.fat : theme.card;
  const borderWidth = isPremium ? 4 : 2;
  const sourceUri = userData
    ? userData.avatarLocalPath || userData.avatarUrl || null
    : null;
  const [error, setError] = useState(false);

  const computedLabel =
    accessibilityLabel ?? t("user.avatar_accessibility");

  useEffect(() => {
    // reset error when source changes
    setError(false);
  }, [sourceUri]);

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
      accessibilityLabel={computedLabel}
    >
      {sourceUri && !error ? (
        <Image
          source={{ uri: sourceUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setError(true)}
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
          accessibilityLabel={t("user.premium_badge_accessibility")}
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
