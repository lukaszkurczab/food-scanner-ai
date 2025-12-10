import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme } from "@/theme/useTheme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
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
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bounces
        contentContainerStyle={[
          { paddingHorizontal: 8 },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
};
