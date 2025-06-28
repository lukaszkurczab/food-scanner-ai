import { useState } from "react";
import { Text, TextInput, StyleSheet, Keyboard, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTheme } from "../theme/useTheme";
import { Button, Checkbox } from "../components";
import { useRegister } from "../hooks/useRegister";
import { RootStackParamList } from "../navigation/navigate";
import FormScreenWrapper from "../components/FormScreenWrapper";

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Register"
>;

const RegisterScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checked, setChecked] = useState(false);

  const { register, loading, errors } = useRegister();

  const handleRegister = async () => {
    Keyboard.dismiss();
    await register(email, password, confirmPassword, username, checked);
  };

  return (
    <FormScreenWrapper contentContainerStyle={styles.container}>
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
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={theme.accent}
        value={username}
        onChangeText={setUsername}
      />
      {errors.username && (
        <Text style={styles.errorText}>{errors.username}</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.accent}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {errors.password && (
        <Text style={styles.errorText}>{errors.password}</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor={theme.accent}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleRegister}
      />
      {errors.confirmPassword && (
        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
      )}

      <View>
        <Checkbox
          checked={checked}
          onCheckedChange={setChecked}
          label="Accept terms and conditions"
        />
        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
      </View>

      {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

      <Button
        text={loading ? "Creating..." : "Create account"}
        onPress={handleRegister}
        disabled={loading}
      />
    </FormScreenWrapper>
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

export default RegisterScreen;
