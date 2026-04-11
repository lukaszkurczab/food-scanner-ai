import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type DockActiveLayerHeaderProps = {
  metaLabel: string;
  title: string;
  showRemove: boolean;
  removeLabel: string;
  onRemove: () => void;
};

export default function DockActiveLayerHeader({
  metaLabel,
  title,
  showRemove,
  removeLabel,
  onRemove,
}: DockActiveLayerHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.activeLayerHeader}>
      <View>
        <Text
          style={[
            styles.metaLabel,
            {
              fontFamily: theme.typography.fontFamily.medium,
            },
          ]}
        >
          {metaLabel}
        </Text>
        <Text
          style={[
            styles.activeLayerTitle,
            {
              fontFamily: theme.typography.fontFamily.semiBold,
            },
          ]}
        >
          {title}
        </Text>
      </View>
      {showRemove ? (
        <Pressable
          onPress={onRemove}
          style={[
            styles.localAction,
            {
              borderColor: theme.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
        >
          <Text
            style={[
              styles.localActionLabel,
              {
                fontFamily: theme.typography.fontFamily.medium,
              },
            ]}
          >
            {removeLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  activeLayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  metaLabel: {
    color: "#7A6D5E",
    fontSize: 10,
    lineHeight: 12,
  },
  activeLayerTitle: {
    color: "#393128",
    fontSize: 15,
    lineHeight: 18,
    marginTop: 2,
  },
  localAction: {
    height: 24,
    minWidth: 68,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#F7F2EA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  localActionLabel: {
    color: "#C69272",
    fontSize: 11,
    lineHeight: 13,
  },
});
