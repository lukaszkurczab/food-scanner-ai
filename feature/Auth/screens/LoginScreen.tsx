import { useState } from "react";
import { Text, TextInput, StyleSheet, Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@theme/index";
import { Button, FormScreenWrapper } from "@components/index";
import { useLogin } from "@hooks/useLogin";
import { RootStackParamList } from "@/navigation/navigate";
import { StackNavigationProp } from "@react-navigation/stack";

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

const LoginScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, errors } = useLogin();

  const handleLogin = async () => {
    Keyboard.dismiss();
    await login(email, password);
  };

  return (
    <FormScreenWrapper contentContainerStyle={styles.container}>
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
      {errors.password && (
        <Text style={styles.errorText}>{errors.password}</Text>
      )}

      <Button
        text={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />
    </FormScreenWrapper>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
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
      marginBottom: 8,
      color: theme.text,
    },
    errorText: {
      color: "#ff4d4f",
      fontSize: 13,
      marginBottom: 8,
      marginLeft: 4,
    },
  });

export default LoginScreen;
