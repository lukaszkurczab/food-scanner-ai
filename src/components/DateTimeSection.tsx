import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Card, Modal } from "@/components";
import AppIcon from "@/components/AppIcon";
import { Clock24h, Clock12h, Calendar } from "@/components";
import { useTranslation } from "react-i18next";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  addedValue?: Date;
  onChangeAdded?: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
};

export const DateTimeSection: React.FC<Props> = ({
  value,
  onChange,
  minDate,
  maxDate,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { i18n, t } = useTranslation();
  const locale = i18n.language || "en";

  const prefers12h = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        timeZone: "UTC",
      }).formatToParts(new Date(Date.UTC(2020, 0, 1, 13)));
      return parts.some((p) => p.type === "dayPeriod");
    } catch {
      return false;
    }
  }, [locale]);

  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: prefers12h,
      }),
    [locale, prefers12h],
  );

  const [visible, setVisible] = useState(false);
  const [tmp, setTmp] = useState<Date>(value);
  const [dateText, setDateText] = useState(fmtDate.format(value));
  const [timeText, setTimeText] = useState(fmtTime.format(value));

  useEffect(() => {
    setTmp(value);
    setDateText(fmtDate.format(value));
    setTimeText(fmtTime.format(value));
  }, [value, fmtDate, fmtTime]);

  const handleOpen = () => {
    setTmp(value);
    setVisible(true);
  };

  const handleSave = () => {
    onChange(tmp);
    setVisible(false);
  };

  const handleCancel = () => {
    setTmp(value);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleOpen}>
        <Card variant="outlined">
          <View style={styles.rowBetween}>
            <View style={styles.flex1}>
              <Text style={styles.dateText}>{dateText}</Text>
              <Text style={styles.timeText}>{timeText}</Text>
            </View>
            <AppIcon name="calendar" size={24} color={theme.link} />
          </View>
        </Card>
      </Pressable>

      <Modal
        visible={visible}
        title={t("meals:meal_time", "Meal time")}
        onClose={handleCancel}
        primaryAction={{
          label: t("common:save", "Save"),
          onPress: handleSave,
          tone: "primary",
        }}
        secondaryAction={{
          label: t("common:cancel", "Cancel"),
          onPress: handleCancel,
          tone: "secondary",
        }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalMessage}>
            {t("meals:pick_date_time", "Choose date and time")}
          </Text>

          {prefers12h ? (
            <Clock12h value={tmp} onChange={setTmp} />
          ) : (
            <Clock24h value={tmp} onChange={setTmp} />
          )}

          <Calendar
            startDate={tmp}
            endDate={tmp}
            focus="start"
            onChangeRange={({ start }) =>
              setTmp((prev) => {
                const next = new Date(start);
                next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                return next;
              })
            }
            onToggleFocus={() => {}}
            minDate={minDate}
            maxDate={maxDate}
            mode="single"
            onPickSingle={(d) =>
              setTmp((prev) => {
                const next = new Date(d);
                next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                return next;
              })
            }
          />
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    flex1: {
      flex: 1,
    },
    dateText: {
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    timeText: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      marginTop: theme.spacing.xxs,
    },
    modalContent: {
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    modalMessage: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "center",
    },
  });
