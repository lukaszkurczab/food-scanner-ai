import { TextInput } from "react-native-gesture-handler";
import { useTheme } from "../theme/useTheme";
import {
  Modal as DefaultModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";

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
  const styles = getStyles(theme);
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
    <DefaultModal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
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
          {error ? (
            <Text style={[styles.errorText, { color: theme.error || "red" }]}>
              {error}
            </Text>
          ) : null}
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
      </View>
    </DefaultModal>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "80%",
      marginTop: 10,
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
    },
    errorText: {
      alignSelf: "flex-start",
      marginBottom: 8,
      fontSize: 14,
    },
  });
