import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { askDietAI } from "@services/index";
import { useTheme } from "@theme/index";
import { useUserContext } from "@/context/UserContext";

type Message = {
  from: "user" | "ai";
  text: string;
};

const ChatScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { userData } = useUserContext();
  const scrollViewRef = useRef<ScrollView>(null);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMessage: Message = { from: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    setMessages((prev) => [...prev, { from: "ai", text: "..." }]);

    const history = userData?.history ?? [];
    const reply = await askDietAI(question, history, [
      ...messages,
      userMessage,
    ]);

    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { from: "ai", text: reply };
      return updated;
    });

    setLoading(false);
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
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
          placeholder="Ask me..."
          value={question}
          onChangeText={setQuestion}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={() => {
            handleSend();
          }}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <Text style={styles.sendButtonText}>Wyślij</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

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
      backgroundColor: theme.accent,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    sendButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: "bold",
    },
  });

export default ChatScreen;
