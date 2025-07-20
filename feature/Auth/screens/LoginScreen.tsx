import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import {
  TextInput,
  PrimaryButton,
  ErrorBox,
  LinkText,
  Layout,
} from "@/components/";
import { useLogin } from "@/feature/Auth/hooks/useLogin";
import NetInfo from "@react-native-community/netinfo";
import { validateEmail } from "@/utils/validation";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [internetError, setInternetError] = useState(false);

  const { login, loading, errors, criticalError, reset } = useLogin();

  useEffect(() => {
    reset();
  }, []);

  useEffect(() => {
    reset();
  }, [email, password]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setInternetError(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const emailError =
    touched.email && !validateEmail(email)
      ? "Enter a valid email address"
      : errors.email;
  const passwordError =
    touched.password && password.length < 6
      ? "Please enter a correct password"
      : errors.password;

  const isFormValid = !!email && !!password && !emailError && !passwordError;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) return;
    await login(email.trim(), password);
  };

  let displayCriticalError = criticalError;
  if (internetError) displayCriticalError = "No internet connection";

  const isLoginDisabled = !isFormValid || loading || !!displayCriticalError;

  return (
    <Layout>
      {displayCriticalError && <ErrorBox message={displayCriticalError} />}

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.xl,
            textAlign: "center",
            marginBottom: theme.spacing.xxl,
          }}
        >
          Login
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={emailError}
          editable={!loading && !displayCriticalError}
          placeholder="Enter your email"
          accessibilityLabel="Email address"
          style={{ marginBottom: theme.spacing.xl }}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          error={passwordError}
          editable={!loading && !displayCriticalError}
          placeholder="Enter your password"
          accessibilityLabel="Password"
          style={{ marginBottom: theme.spacing.xl }}
          icon={
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={22} />
            </Pressable>
          }
          iconPosition="right"
        />

        <PrimaryButton
          label="Log in"
          onPress={handleLogin}
          disabled={isLoginDisabled}
          loading={loading}
          style={{ marginBottom: theme.spacing.xl }}
        />

        <LinkText
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={loading}
          style={{ alignSelf: "center", marginBottom: theme.spacing.xl }}
        >
          Forgot password?
        </LinkText>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.regular,
            }}
          >
            Don't have an account?{" "}
          </Text>
          <LinkText
            style={{
              fontFamily: theme.typography.fontFamily.bold,
            }}
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
          >
            Sign up
          </LinkText>
        </View>
      </View>
    </Layout>
  );
}
