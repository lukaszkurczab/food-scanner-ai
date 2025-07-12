import { useMemo } from "react";
import { useTheme } from "../theme/useTheme";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type ErrorModalProps = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export const ErrorModal = ({ visible, message, onClose }: ErrorModalProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme, visible), [theme, visible]);

  return (
    <TouchableOpacity style={styles.overlay} onPress={onClose}>
      <View style={[styles.modal, { backgroundColor: theme.background }]}>
        <Text style={styles.title}>❌ Oops!</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.button, { backgroundColor: theme.secondary }]}
        >
          <Text style={[styles.buttonText, { color: theme.background }]}>
            Try Again
          </Text>
        </TouchableOpacity>
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
  });
