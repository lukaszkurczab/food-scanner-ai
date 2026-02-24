import React, { useMemo } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { navigate } from "@/navigation/navigate";
import AvatarBadge from "@/components/AvatarBadge";
import { useUserContext } from "@/context/UserContext";
import { useBadges } from "@/hooks/useBadges";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { useTranslation } from "react-i18next";

export const BottomTabBar: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const { uid } = useAuthContext();
  const { userData } = useUserContext();
  const { isPremium } = usePremiumContext();
  const { badges } = useBadges(uid);
  const { t } = useTranslation("common");

  const avatarSrc = userData?.avatarLocalPath || userData?.avatarUrl || "";
  const safeBadges = Array.isArray(badges) ? badges : [];

  let borderColor: string;
  if (isPremium) {
    borderColor = "#C9A227";
  } else if (safeBadges.some((b) => b.type === "streak")) {
    const streakBadges = safeBadges.filter((b) => b.type === "streak");
    streakBadges.sort(
      (a, b) => (b.milestone as number) - (a.milestone as number)
    );
    borderColor = streakBadges[0].color;
  } else {
    borderColor = theme.border;
  }

  type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];
  type TabItem = {
    key: string;
    icon: MaterialIconName;
    onPress: () => void;
    isFab?: boolean;
  };

  const tabs: TabItem[] = [
    { key: "Home", icon: "home-filled", onPress: () => navigate("Home") },
    { key: "Stats", icon: "bar-chart", onPress: () => navigate("Statistics") },
    {
      key: "Add",
      icon: "add",
      isFab: true,
      onPress: () => navigate("MealAddMethod"),
    },
    { key: "History", icon: "assistant", onPress: () => navigate("Chat") },
    { key: "Profile", icon: "person", onPress: () => navigate("Profile") },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          if (tab.isFab) {
            return (
              <Pressable
                key={tab.key}
                onPress={tab.onPress}
                style={styles.fab}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={32}
                  color={theme.onAccent}
                  style={styles.iconCentered}
                />
              </Pressable>
            );
          }

          const isProfile = tab.key.toLowerCase() === "profile";
          return (
            <Pressable key={tab.key} onPress={tab.onPress} style={styles.tab}>
              {isProfile ? (
                <AvatarBadge
                  size={40}
                  uri={avatarSrc || undefined}
                  badges={[]}
                  overrideColor={borderColor}
                  overrideEmoji={undefined}
                  fallbackIcon={
                    <MaterialIcons
                      name="person"
                      size={24}
                      color={theme.textSecondary}
                    />
                  }
                  accessibilityLabel={t("tabs.profile_accessibility")}
                />
              ) : (
                <MaterialIcons
                  name={tab.icon}
                  size={26}
                  color={theme.text}
                  style={styles.iconCentered}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrapper: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopEndRadius: theme.rounded.lg,
      borderTopLeftRadius: theme.rounded.lg,
    },
    container: {
      flexDirection: "row",
      alignSelf: "center",
      alignItems: "center",
      padding: theme.spacing.sm,
      width: "100%",
      justifyContent: "space-evenly",
      shadowColor: theme.shadow,
      shadowOpacity: Platform.OS === "android" ? 0.22 : 0.12,
      shadowRadius: theme.spacing.xl - theme.spacing.xs,
      shadowOffset: { width: 0, height: theme.spacing.xs },
      elevation: 20,
      height: 56,
      backgroundColor: theme.card,
      borderTopEndRadius: theme.rounded.md,
      borderTopLeftRadius: theme.rounded.md,
    },
    tab: {
      width: 56,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
    },
    fab: {
      width: 58,
      height: 58,
      justifyContent: "center",
      alignItems: "center",
      marginTop: -20,
      backgroundColor: theme.accentSecondary,
      borderRadius: theme.rounded.full,
      shadowColor: theme.shadow,
      shadowOpacity: 0.3,
      shadowRadius: theme.spacing.md + theme.spacing.xs / 2,
      elevation: 6,
      borderWidth: 0,
    },
    iconCentered: {
      alignSelf: "center",
    },
  });

export default BottomTabBar;
