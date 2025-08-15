import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { SecondaryButton } from "@/components/SecondaryButton";

export const DateRangePicker: React.FC<{
  startDate: Date;
  endDate: Date;
  onOpen: () => void;
  locale?: string;
}> = ({ startDate, endDate, onOpen, locale }) => {
  const theme = useTheme();

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
      }),
    [locale]
  );

  const summary = `${fmt.format(startDate)}-${fmt.format(endDate)}`;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontWeight: "700",
            fontSize: theme.typography.size.md,
          }}
        >
          Date range
        </Text>
        <Text style={{ color: theme.text, fontSize: theme.typography.size.md }}>
          {summary}
        </Text>
      </View>

      <SecondaryButton label="Set date range" onPress={onOpen} />
    </View>
  );
};
