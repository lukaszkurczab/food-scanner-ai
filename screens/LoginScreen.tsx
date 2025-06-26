import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/useTheme";
import { Button } from "../components";
import { useLogin } from "../hooks/useLogin";
import { RootStackParamList } from "../navigation/navigate";
import { StackNavigationProp } from "@react-navigation/stack";

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

const LoginScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading } = useLogin();

  const handleLogin = async () => {
    Keyboard.dismiss();
    await login(email, password);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Log in</Text>

      <Text style={styles.subText}>
        Don't have an account?{" "}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate("Register")}
        >
          Create now!
        </Text>
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.accent}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.accent}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onSubmitEditing={handleLogin}
      />

      <Button
        text={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 16,
      backgroundColor: theme.background,
    },
    header: {
      fontSize: 32,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
      color: theme.primary,
    },
    subText: {
      textAlign: "center",
      fontSize: 16,
      marginBottom: 24,
      color: theme.text,
    },
    link: {
      color: "blue",
      fontWeight: "500",
    },
    input: {
      height: 48,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 16,
      color: theme.text,
    },
  });

export default LoginScreen;
