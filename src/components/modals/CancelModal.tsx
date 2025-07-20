import { useMemo } from "react";
import { useTheme } from "@/src/theme/index";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type CancelModalProps = {
  visible: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
};

export const CancelModal = ({
  visible,
  message,
  onClose,
  onConfirm,
}: CancelModalProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme, visible), [theme, visible]);

  return (
    <TouchableOpacity style={styles.overlay} onPress={onClose}>
      <View style={[styles.modal, { backgroundColor: theme.background }]}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            style={[styles.button, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.buttonText, { color: theme.background }]}>
              Yes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any, visible: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      display: visible ? "flex" : "none",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modal: {
      width: "80%",
      padding: 20,
      borderRadius: 16,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 5,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
    },
    message: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 24,
    },
    buttonText: {
      fontWeight: "600",
      fontSize: 16,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "80%",
    },
  });
