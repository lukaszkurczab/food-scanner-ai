import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { Layout, TextInput } from "@/src/components";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import i18n from "@/src/i18n";

type Language = {
  code: string;
  label: string;
};

const MOCK_LANGUAGES: Language[] = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
];

export default function LanguageScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(i18n.language || "en");

  const languages = useMemo(
    () =>
      MOCK_LANGUAGES.filter((lang) =>
        lang.label.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  return (
    <Layout showNavigation={false} disableScroll>
      <View style={{ paddingTop: theme.spacing.lg, flex: 1 }}>
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
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                },
              ]}
              onPress={async () => {
                if (item.code !== selected) {
                  setSelected(item.code);
                  await i18n.changeLanguage(item.code);
                }
              }}
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
});
