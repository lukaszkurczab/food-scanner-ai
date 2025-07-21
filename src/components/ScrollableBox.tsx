import React from "react";
import { View, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

export const ScrollableBox: React.FC<Props> = ({
  children,
  style,
  contentContainerStyle,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          borderRadius: theme.rounded.md,
          backgroundColor: theme.background,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: theme.spacing.xl,
        },
        style,
      ]}
    >
      <ScrollView
        contentContainerStyle={[{ paddingBottom: 8 }, contentContainerStyle]}
        showsVerticalScrollIndicator
        bounces
      >
        <View style={{ flexGrow: 1, margin: theme.spacing.md }}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
};
