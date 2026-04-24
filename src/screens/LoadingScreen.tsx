import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Layout } from "@/components";

export default function LoadingScreen() {
  return (
    <Layout showNavigation={false}>
      <View style={styles.centerBoth}>
        <ActivityIndicator size="large" />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerBoth: { flex: 1, justifyContent: "center", alignItems: "center" },
});
