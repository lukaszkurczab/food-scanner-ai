import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { BackTitleHeader, Layout, TextInput } from "@/components";
import AppIcon from "@/components/AppIcon";
import { useTranslation } from "react-i18next";
import { useUserContext } from "@contexts/UserContext";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type Language = {
  code: string;
  label: string;
};

const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
];

type LanguageNavigation = StackNavigationProp<RootStackParamList, "Language">;

type LanguageScreenProps = {
  navigation: LanguageNavigation;
};

export default function LanguageScreen({ navigation }: LanguageScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const { language, changeLanguage } = useUserContext();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(language || "en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (language && language !== selected) {
      setSelected(language);
    }
  }, [language, selected]);

  const languages = useMemo(
    () =>
      LANGUAGES.filter((lang) =>
        lang.label.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const handleSelect = async (code: string) => {
    if (code === selected || saving) return;
    setSelected(code);
    setSaving(true);
    try {
      await changeLanguage(code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout disableScroll>
      <View style={styles.flex}>
        <BackTitleHeader
          title={t("language", { ns: "profile", defaultValue: "Language" })}
          onBack={() => navigation.goBack()}
        />

        <TextInput
          placeholder={t("input.search", { defaultValue: "Search" })}
          value={search}
          onChangeText={setSearch}
          icon={
            <AppIcon
              name="search"
              size={20}
              color={theme.textSecondary}
            />
          }
          iconPosition="right"
          style={styles.searchInput}
          inputStyle={styles.searchInputText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <FlatList
          data={languages}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.languageRow,
                {
                  opacity: pressed || saving ? 0.7 : 1,
                },
                styles.rowCenter,
                styles.rowGap8,
              ]}
              onPress={() => handleSelect(item.code)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text
                style={[
                  styles.languageLabel,
                  selected === item.code && styles.languageLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {selected === item.code && (
                <AppIcon
                  name="check"
                  size={20}
                  color={theme.accentSecondary}
                />
              )}
            </Pressable>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    searchInput: {
      marginBottom: theme.spacing.xs,
      marginHorizontal: theme.spacing.sm,
    },
    searchInputText: { fontSize: theme.typography.size.base },
    languageRow: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    rowCenter: { flexDirection: "row", alignItems: "center" },
    rowGap8: { gap: theme.spacing.sm },
    languageLabel: {
      fontSize: theme.typography.size.lg,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.regular,
      flex: 1,
    },
    languageLabelActive: {
      color: theme.accentSecondary,
      fontFamily: theme.typography.fontFamily.bold,
    },
    list: { marginTop: theme.spacing.lg },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
  });
