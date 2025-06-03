import { useTheme } from "../theme/useTheme";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useState, useMemo } from "react";

type ConfirmModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (mealName: string) => void;
};

export const ConfirmModal = ({
  visible,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme, visible), [theme]);
  const [mealName, setMealName] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (mealName.trim() === "") {
      setError("Meal name cannot be empty");
      return;
    }
    setError("");
    onConfirm(mealName);
  };

  return (
    <TouchableOpacity style={styles.overlay} onPress={onCancel}>
      <View style={styles.modal}>
        <TextInput
          style={styles.textInput}
          keyboardType="default"
          placeholder="Enter meal name"
          placeholderTextColor={theme.accent}
          value={mealName}
          onChangeText={(newName) => {
            setMealName(newName);
            if (newName.trim() !== "") setError("");
          }}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity onPress={onCancel} style={styles.button}>
            <Text style={styles.underlineButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.button, { backgroundColor: theme.secondary }]}
          >
            <Text style={[styles.buttonText, { color: theme.background }]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any, visible: boolean) =>
  StyleSheet.create({
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "80%",
      marginTop: 10,
    },
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
      backgroundColor: theme.background,
    },
    underlineButtonText: {
      textDecorationLine: "underline",
      color: theme.secondary,
      fontSize: 16,
      fontWeight: "600",
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
    textInput: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      width: "100%",
      marginBottom: 10,
      fontSize: 18,
      color: theme.primary,
    },
    errorText: {
      alignSelf: "flex-start",
      marginBottom: 8,
      fontSize: 14,
      color: theme.error || "red",
    },
  });
