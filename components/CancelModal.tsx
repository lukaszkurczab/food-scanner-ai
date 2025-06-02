import { useTheme } from "../theme/useTheme";
import {
  Modal as DefaultModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

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
  const { theme } = useTheme();

  return (
    <DefaultModal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.button, { backgroundColor: theme.secondary }]}
            >
              <Text style={[styles.buttonText, { color: theme.background }]}>
                Yes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </DefaultModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
