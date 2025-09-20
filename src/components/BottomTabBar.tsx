import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { navigate } from "@/navigation/navigate";

type Props = {
  renderProfileIcon?: React.ReactNode;
};

export const BottomTabBar: React.FC<Props> = ({ renderProfileIcon }) => {
  const theme = useTheme();

  const tabs = [
    {
      key: "Home",
      icon: "home-filled",
      onPress: () => navigate("Home"),
    },
    {
      key: "Stats",
      icon: "bar-chart",
      onPress: () => navigate("Statistics"),
    },
    {
      key: "Add",
      icon: "add",
      isFab: true,
      onPress: () => navigate("MealAddMethod"),
    },
    {
      key: "History",
      icon: "history",
      onPress: () => navigate("HistoryList"),
    },
    {
      key: "Profile",
      icon: "person",
      onPress: () => navigate("Profile"),
    },
  ];

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderTopEndRadius: theme.rounded.lg,
          borderTopLeftRadius: theme.rounded.lg,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.border,
            borderTopEndRadius: theme.rounded.md,
            borderTopLeftRadius: theme.rounded.md,
          },
        ]}
      >
        {tabs.map((tab) => {
          if (tab.isFab) {
            return (
              <Pressable
                key={tab.key}
                onPress={tab.onPress}
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.textSecondary,
                    borderRadius: theme.rounded.full,
                    shadowColor: theme.shadow,
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 6,
                    borderWidth: 0,
                  },
                ]}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={32}
                  color={theme.card}
                  style={{ alignSelf: "center" }}
                />
              </Pressable>
            );
          }

          const isProfile = tab.key.toLowerCase() === "profile";

          return (
            <Pressable key={tab.key} onPress={tab.onPress} style={[styles.tab]}>
              {isProfile && renderProfileIcon ? (
                renderProfileIcon
              ) : (
                <MaterialIcons
                  name={tab.icon as any}
                  size={26}
                  color={theme.text}
                  style={{ alignSelf: "center" }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    padding: 8,
    width: "100%",
    justifyContent: "space-evenly",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "android" ? 0.22 : 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
    height: 56,
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
  },
});

export default BottomTabBar;
