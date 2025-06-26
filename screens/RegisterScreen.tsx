import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTheme } from "../theme/useTheme";
import { Button } from "../components";
import { useRegister } from "../hooks/useRegister";
import { RootStackParamList } from "../navigation/navigate";

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Register"
>;

const RegisterScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, loading } = useRegister();

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła się nie zgadzają");
      return;
    }

    if (!firstName.trim()) {
      Alert.alert("Błąd", "Imię jest wymagane");
      return;
    }

    await register(email, password, firstName, lastName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create an account</Text>

      <Text style={styles.subText}>
        Already have an account?{" "}
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Log in
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
        placeholder="First name"
        placeholderTextColor={theme.accent}
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last name"
        placeholderTextColor={theme.accent}
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.accent}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor={theme.accent}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleRegister}
      />

      <Button
        text={loading ? "Creating..." : "Create account"}
        onPress={handleRegister}
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
      fontSize: 28,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 12,
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

export default RegisterScreen;
