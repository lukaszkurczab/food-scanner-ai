import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ViewStyle,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  style?: ViewStyle;
};

export const SearchBox: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  debounceMs = 200,
  style,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();

  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const apply = (txt: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(txt), debounceMs);
  };

  const onTextChange = (txt: string) => {
    setLocal(txt);
    apply(txt);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    setLocal("");
    onChange("");
  };

  return (
    <View style={[styles.wrap, style]}>
      <AppIcon name="search" size={20} color={theme.textSecondary} />

      <TextInput
        value={local}
        onChangeText={onTextChange}
        placeholder={placeholder ?? t("input.search")}
        placeholderTextColor={theme.input.placeholder}
        style={styles.input}
        returnKeyType="search"
        accessibilityLabel={t("input.search_accessibility")}
      />

      {local.length > 0 ? (
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel={t("input.clear_search_accessibility")}
          style={styles.clearBtn}
        >
          <AppIcon name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
      borderRadius: theme.rounded.md,
      paddingHorizontal: theme.spacing.md,
      minHeight: 52,
      alignSelf: "stretch",
      flexShrink: 1,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.12 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    input: {
      flex: 1,
      marginLeft: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      color: theme.input.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    clearBtn: {
      marginLeft: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.rounded.sm,
    },
  });
