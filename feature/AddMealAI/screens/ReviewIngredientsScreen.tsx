import { useEffect, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  detectIngredientsWithVision,
  calculateTotalNutrients,
  getNutritionForName,
} from "@/services";
import { RootStackParamList } from "@/navigation/navigate";
import { Ingredient, Nutrients } from "@/types";
import {
  NutritionChart,
  ErrorModal,
  Button,
  TextInput,
  CancelModal,
  Spinner,
} from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useMealContext } from "@/context/MealContext";

type ReviewIngredientsRouteProp = RouteProp<
  RootStackParamList,
  "ReviewIngredients"
>;

const ReviewIngredientsScreen = () => {
  const route = useRoute<ReviewIngredientsRouteProp>();
  const { image, id } = route.params;
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = getStyles(theme);
  const { meal, addMeal, removeMeal } = useMealContext();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutritionData, setNutritionData] = useState<Nutrients | null>(null);
  const [isLoadingDetection, setIsLoadingDetection] = useState(true);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      setIsLoadingDetection(true);
      const newIngredients = await detectIngredientsWithVision(image);
      setIsLoadingDetection(false);

      if (!newIngredients || newIngredients.length === 0) {
        setShowErrorModal(true);
        return;
      }

      addMeal({ image, id, ingredients: newIngredients });
    };

    if (!ingredients.length) analyze();
  }, []);

  useEffect(() => {
    if (id) {
      const currentMeal = meal.find((m) => m.id === id);
      if (currentMeal) {
        setIngredients(currentMeal.ingredients);
      }
    }
  }, [meal, id]);

  useEffect(() => {
    const fetchNutrition = async () => {
      setIsLoadingNutrition(true);
      const total: Nutrients = calculateTotalNutrients(
        meal.filter((i) => i.id === id)
      );
      setNutritionData(total);
      setIsLoadingNutrition(false);
    };
    fetchNutrition();
  }, [meal]);

  const updateMealContext = (updatedIngredients: Ingredient[]) => {
    if (id) {
      const updatedMeal = meal.find((m) => m.id === id);
      if (!updatedMeal) return;
      removeMeal(id);
      addMeal({
        image: updatedMeal.image,
        id,
        ingredients: updatedIngredients,
      });
    }
  };

  const handleAmountChange = (index: number, newAmount: string) => {
    const updated = [...ingredients];
    const parsed = parseInt(newAmount);

    if (!isNaN(parsed)) {
      updated[index] = {
        ...updated[index],
        amount: parsed,
      };

      setIngredients(updated);
      updateMealContext(updated);
    }
  };

  const handleDetectMoreIngredients = () => {
    navigation.navigate("Camera");
  };

  const handleNameChange = (index: number, newName: string) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      name: newName,
    };

    updateMealContext(updated);
  };

  const handleConfirm = () => {
    navigation.navigate("Result");
  };

  const recalculateNutrition = async () => {
    if (!id) return;

    setIsLoadingNutrition(true);

    const currentMeal = meal.find((m) => m.id === id);
    if (!currentMeal) {
      setIsLoadingNutrition(false);
      return;
    }

    const updatedIngredients = await getNutritionForName(currentMeal);

    if (updatedIngredients && Array.isArray(updatedIngredients)) {
      setIngredients(updatedIngredients);
      updateMealContext(updatedIngredients);

      const total: Nutrients = calculateTotalNutrients(
        meal.map((m) =>
          m.id === id ? { ...m, ingredients: updatedIngredients } : m
        )
      );
      setNutritionData(total);
    }

    setIsLoadingNutrition(false);
  };

  const handleCancel = () => {
    setShowCancelModal(false);
    if (id) removeMeal(id);

    if (meal.length - 1) {
      navigation.navigate("Result");
    } else navigation.navigate("Home");
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
    updateMealContext(updated);
  };

  if (isLoadingDetection) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.subheader}>Detected Ingredients</Text>
        {!meal.length ? (
          <Text style={{ color: theme.text }}>Detecting ingredients...</Text>
        ) : (
          <>
            {meal
              .find((m) => m.id === id)
              ?.ingredients.map((ingredient, index) => (
                <View
                  key={`${index}-${ingredient.name}`}
                  style={styles.ingredientRow}
                >
                  <View
                    style={{
                      width: "100%",
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      style={{ width: "5%", overflow: "hidden" }}
                      onPress={() => handleRemoveIngredient(index)}
                    >
                      <Image
                        source={require("@/assets/icons/close.png")}
                        style={{ width: 16, height: 16 }}
                      />
                    </TouchableOpacity>
                    <TextInput
                      value={ingredient.name}
                      onEndEditing={(e) => handleNameChange(index, e)}
                    />
                    <View
                      style={{
                        width: "20%",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <TextInput
                        keyboardType="numeric"
                        value={ingredient.amount.toString()}
                        onEndEditing={(e: any) => handleAmountChange(index, e)}
                        style={{ width: 50 }}
                      />
                      <Text style={styles.unit}>
                        {ingredient.type === "food" ? "g" : "ml"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            <Button
              text="+ Detect more ingredients"
              onPress={handleDetectMoreIngredients}
              style={styles.moreIngredientsButton}
              textStyle={styles.moreIngredientsButtonText}
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        {isLoadingNutrition ? (
          <Spinner size="small" />
        ) : nutritionData ? (
          nutritionData.protein === 0 &&
          nutritionData.carbs === 0 &&
          nutritionData.fat === 0 ? (
            <Text style={styles.subheader}>Meal has no nutritional value.</Text>
          ) : (
            <>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.subheader}>Meal nutrition</Text>
                <TouchableOpacity onPress={recalculateNutrition}>
                  <Image
                    source={require("@/assets/icons/refresh.png")}
                    style={{ width: 20, height: 20 }}
                  />
                </TouchableOpacity>
              </View>
              <NutritionChart nutrition={nutritionData} />
            </>
          )
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
          width: "80%",
        }}
      >
        <TouchableOpacity
          style={{ paddingHorizontal: 30 }}
          onPress={() => setShowCancelModal(true)}
        >
          <Text
            style={{
              fontSize: 16,
              borderBottomWidth: 1,
              borderColor: theme.text,
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <Button
          text="Confirm"
          onPress={handleConfirm}
          style={styles.saveButton}
        />
      </View>

      <CancelModal
        visible={showCancelModal}
        message="Are you sure you want to cancel? All data will be lost."
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
      />

      <ErrorModal
        visible={showErrorModal}
        message="No ingredients detected. Please try taking the photo again."
        onClose={() => {
          setShowErrorModal(false);
          navigation.navigate("Camera", {
            previousIngredients: ingredients,
            previousNutrition: nutritionData,
          });
        }}
      />
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      paddingBottom: 30,
      gap: 24,
      backgroundColor: theme.background,
      minHeight: "100%",
      justifyContent: "space-between",
    },
    subheader: {
      fontSize: 18,
      fontWeight: "600",
    },
    ingredientRow: {
      width: "90%",
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingHorizontal: 20,
    },
    section: {
      width: "100%",
      alignItems: "center",
    },
    unit: {
      marginLeft: 5,
    },
    saveButton: {
      width: 150,
    },
    moreIngredientsButton: {
      width: 200,
      marginTop: 16,
      backgroundColor: theme.primaryLight,
    },
    moreIngredientsButtonText: {
      fontSize: 14,
    },
  });

export default ReviewIngredientsScreen;
