import { useTheme } from "@/src/theme/index";
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
  onConfirm: (mealName: string) => Promise<void>;
};

export const ConfirmModal = ({
  visible,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme, visible), [theme, visible]);
  const [mealName, setMealName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (mealName.trim() === "") {
      setError("Meal name cannot be empty");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(mealName);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.overlay}
      onPress={() => {
        if (!isSubmitting) onCancel();
      }}
      activeOpacity={1}
    >
      <View style={styles.modal}>
        <TextInput
          style={styles.textInput}
          keyboardType="default"
          placeholder="Enter meal name"
          placeholderTextColor={theme.accent}
          value={mealName}
          editable={!isSubmitting}
          onChangeText={(newName) => {
            setMealName(newName);
            if (newName.trim() !== "") setError("");
          }}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={isSubmitting ? undefined : onCancel}
            style={styles.button}
            disabled={isSubmitting}
          >
            <Text style={styles.underlineButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isSubmitting ? undefined : handleConfirm}
            style={[
              styles.button,
              {
                backgroundColor: isSubmitting
                  ? theme.mode || "#ccc"
                  : theme.accent,
                opacity: isSubmitting ? 0.6 : 1,
              },
            ]}
            disabled={isSubmitting}
          >
            <Text style={[styles.buttonText, { color: theme.background }]}>
              {isSubmitting ? "Saving..." : "Confirm"}
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
      color: theme.accent,
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
      color: theme.text,
    },
    errorText: {
      alignSelf: "flex-start",
      marginBottom: 8,
      fontSize: 14,
      color: theme.error || "red",
    },
  });
