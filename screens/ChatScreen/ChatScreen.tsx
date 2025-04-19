import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { askDietAI, getMealHistory } from "../../services";

export default function ChatScreen() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const history = await getMealHistory();
    const reply = await askDietAI(question, history);
    setAnswer(reply);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🤖 Czat z dietetykiem AI</Text>

        <Text style={styles.label}>Zadaj pytanie:</Text>
        <TextInput
          style={styles.input}
          placeholder="Czy mój dzisiejszy obiad był zdrowy?"
          value={question}
          onChangeText={setQuestion}
          multiline
        />

        <Button
          title={loading ? "Myślę..." : "Wyślij"}
          onPress={handleAsk}
          disabled={loading}
        />

        {answer.length > 0 && (
          <View style={styles.responseBox}>
            <Text style={styles.label}>Odpowiedź:</Text>
            <Text>{answer}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginTop: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  responseBox: {
    marginTop: 30,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
  },
});
