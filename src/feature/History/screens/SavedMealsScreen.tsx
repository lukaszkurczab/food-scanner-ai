import React from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { Layout } from "@/components";

export default function SavedMealsScreen({ navigation }: any) {
  const theme = useTheme();
  const { userData } = useUserContext();

  return (
    <Layout>
      <></>
    </Layout>
  );
}

const styles = StyleSheet.create({});
