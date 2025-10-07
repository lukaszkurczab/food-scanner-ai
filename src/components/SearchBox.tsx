import React, { useMemo, useRef, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
};

export const SearchBox: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  debounceMs = 200,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (txt: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(txt), debounceMs);
  };

  const onTextChange = (txt: string) => {
    setLocal(txt);
    apply(txt);
  };

  const clear = () => {
    setLocal("");
    onChange("");
  };

  const styles = useMemo(
    () => ({
      wrap: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.background,
        borderRadius: theme.rounded.md,
        paddingHorizontal: 12,
        flexGrow: 1,
      },
      input: {
        flex: 1,
        color: theme.text,
        fontSize: theme.typography.size.md,
      },
      clearBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: theme.rounded.sm,
      },
    }),
    [theme]
  );

  return (
    <View style={styles.wrap}>
      <MaterialIcons name="search" size={24} color={theme.textSecondary} />

      <TextInput
        value={local}
        onChangeText={onTextChange}
        placeholder={placeholder ?? t("input.search")}
        placeholderTextColor={theme.textSecondary}
        style={[{ marginLeft: theme.spacing.sm }, styles.input]}
        returnKeyType="search"
        accessibilityLabel={t("input.search_accessibility")}
      />

      {local.length > 0 && (
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel={t("input.clear_search_accessibility")}
          style={styles.clearBtn}
        >
          <MaterialIcons name="close" size={24} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};
