import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import type { SyncStatus } from "@/hooks/useSyncStatus";

type Props = {
  status: SyncStatus;
};

export function SyncStatusBadge({ status }: Props) {
  const theme = useTheme();
  const { t } = useTranslation("common");

  if (status === "idle") return null;

  const text =
    status === "syncing"
      ? t("sync.syncing")
      : status === "queued"
      ? t("sync.queued")
      : t("sync.offline");

  const colors =
    status === "syncing"
      ? { bg: theme.success.background, fg: theme.success.text }
      : status === "queued"
      ? { bg: theme.warning.background, fg: theme.warning.text }
      : { bg: theme.card, fg: theme.textSecondary };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg, borderColor: theme.border }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
