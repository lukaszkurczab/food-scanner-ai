import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { navigate, RootStackParamList } from "@/src/navigation/navigate";

type tab = {
  key: string;
  icon: string;
  target: keyof RootStackParamList;
  isFab?: boolean;
};

const TABS: tab[] = [
  { key: "Home", icon: "home-filled", target: "Home" },
  { key: "Stats", icon: "bar-chart", target: "Summary" },
  { key: "Add", icon: "add", target: "MealAddMethod", isFab: true },
  { key: "History", icon: "history", target: "History" },
  { key: "Profile", icon: "person", target: "Profile" },
];

export const BottomTabBar = () => {
  const theme = useTheme();

  const handlePress = (tab: tab) => {
    navigate(tab.target);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.border,
          borderRadius: theme.rounded.full,
        },
      ]}
    >
      {TABS.map((tab, i) => {
        if (tab.isFab) {
          return (
            <Pressable
              key={tab.key}
              onPress={() => handlePress(tab)}
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
                size={42}
                color={theme.card}
                style={{ alignSelf: "center" }}
              />
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.key}
            onPress={() => handlePress(tab)}
            style={[
              styles.tab,
              {
                borderRadius: theme.rounded.sm,
              },
            ]}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={32}
              color={theme.text}
              style={{ alignSelf: "center" }}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    padding: 8,
    marginBottom: 0,
    position: "absolute",
    justifyContent: "space-evenly",
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "android" ? 0.22 : 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
  },
  tab: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
  },
});

export default BottomTabBar;
