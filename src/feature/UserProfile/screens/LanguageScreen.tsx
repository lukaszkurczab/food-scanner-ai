import React, { useState, useMemo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Layout, TextInput } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useUserContext } from "@contexts/UserContext";

type Language = {
  code: string;
  label: string;
};

const LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
];

export default function LanguageScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { userData, updateUser } = useUserContext();

  const initialLang = userData?.language || i18n.language || "en";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(initialLang);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData?.language && userData.language !== selected) {
      setSelected(userData.language);
    }
  }, [userData?.language]);

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
      await i18n.changeLanguage(code);
      await updateUser({ ...userData, language: code });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout disableScroll>
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          style={styles.header}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.text} />

          <Text
            style={[
              styles.heading,
              {
                color: theme.text,
                fontFamily: theme.typography.fontFamily.bold,
              },
            ]}
            accessibilityRole="header"
          >
            {t("language", { ns: "profile", defaultValue: "Language" })}
          </Text>
        </Pressable>

        <TextInput
          placeholder={t("search", { defaultValue: "Search" })}
          value={search}
          onChangeText={setSearch}
          icon={
            <MaterialIcons
              name="search"
              size={20}
              color={theme.textSecondary}
            />
          }
          iconPosition="right"
          style={styles.searchInput}
          inputStyle={{ fontSize: theme.typography.size.base }}
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
                  borderBottomColor: theme.border,
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
                style={{
                  fontSize: theme.typography.size.lg,
                  color:
                    selected === item.code ? theme.accentSecondary : theme.text,
                  fontFamily:
                    selected === item.code
                      ? theme.typography.fontFamily.bold
                      : theme.typography.fontFamily.regular,
                  flex: 1,
                }}
              >
                {item.label}
              </Text>
              {selected === item.code && (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.accentSecondary}
                />
              )}
            </Pressable>
          )}
          style={{ marginTop: theme.spacing.lg }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
  },
  searchInput: {
    marginBottom: 8,
    marginHorizontal: 12,
  },
  languageRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  rowGap8: { gap: 8 },
});
