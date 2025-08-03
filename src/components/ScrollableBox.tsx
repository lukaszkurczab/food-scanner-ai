import React from "react";
import { View, ScrollView, ViewStyle } from "react-native";
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
          marginBottom: theme.spacing.xl,
        },
        style,
      ]}
    >
      <ScrollView
        contentContainerStyle={[{ paddingBottom: 8 }, contentContainerStyle]}
        showsVerticalScrollIndicator
        bounces
        nestedScrollEnabled={true}
      >
        <View style={{ flexGrow: 1 }}>{children}</View>
      </ScrollView>
    </View>
  );
};
