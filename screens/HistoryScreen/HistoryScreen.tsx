import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  getMealHistory,
  clearMealHistory,
  removeMealFromHistory,
} from "../../services";
import { Meal } from "../../types";
import { Ionicons } from "@expo/vector-icons";

type RootStackParamList = {
  History: undefined;
  MealDetail: { meal: Meal };
};
type HistorycreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "History"
>;

export default function HistoryScreen({
  navigation,
}: {
  navigation: HistorycreenNavigationProp;
}) {
  const [history, setHistory] = useState<Meal[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getMealHistory();
      setHistory(data);
    };
    load();
  }, []);

  const handleClearHistory = () => {
    Alert.alert(
      "Czy na pewno?",
      "Ta operacja usunie całą historię posiłków. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyczyść",
          style: "destructive",
          onPress: async () => {
            await clearMealHistory();
            setHistory([]);
            alert("Historia została wyczyszczona 🗑️");
          },
        },
      ]
    );
  };

  const handleDeleteMeal = (id: string) => {
    Alert.alert("Usuń posiłek", "Czy na pewno chcesz usunąć ten posiłek?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          await removeMealFromHistory(id);
          const updated = history.filter((m) => m.id !== id);
          setHistory(updated);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📚 Historia Posiłków</Text>
      <Button
        title="🗑️ Wyczyść historię"
        onPress={handleClearHistory}
        color="#f44336"
      />
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("MealDetail", { meal: item })}
          >
            <View style={styles.item}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.date}>
                  {new Date(item.date).toLocaleString()}
                </Text>
                <Text>Kalorie: {item.nutrition.kcal.toFixed(0)} kcal</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteMeal(item.id)}>
                <Ionicons name="trash-outline" size={24} color="red" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  item: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  date: {
    fontWeight: "bold",
  },
});
