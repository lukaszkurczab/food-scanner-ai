import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { askDietAI, getMealHistory } from "@/services";
import { useTheme } from "@/theme/useTheme";

export default function ChatScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hello! How can I help you today?" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!question.trim()) return;
    const userMessage = { from: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    const history = await getMealHistory();
    const reply = await askDietAI(question, history);

    const aiMessage = { from: "ai", text: reply };
    setMessages((prev) => [...prev, aiMessage]);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              msg.from === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text style={styles.messageText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>{loading ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: theme.background,
      flexGrow: 1,
      justifyContent: "flex-end",
    },
    messageBubble: {
      padding: 10,
      borderRadius: 12,
      marginBottom: 10,
      maxWidth: "80%",
    },
    userBubble: {
      backgroundColor: theme.primaryLight,
      alignSelf: "flex-end",
    },
    aiBubble: {
      backgroundColor: theme.card,
      alignSelf: "flex-start",
    },
    messageText: {
      fontSize: 16,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      borderTopWidth: 1,
      borderColor: theme.card,
      backgroundColor: theme.background,
    },
    input: {
      flex: 1,
      borderColor: theme.accent,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: 16,
    },
    sendButton: {
      marginLeft: 10,
      backgroundColor: theme.secondary,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 20,
    },
    sendButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: "bold",
    },
  });
