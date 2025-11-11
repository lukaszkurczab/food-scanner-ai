import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import type { MealType } from "@/types/meal";
import { autoMealName } from "@/utils/autoMealName";
import { useTranslation } from "react-i18next";
import { DateTimeSection } from "@/components/DateTimeSection";
import {
  Layout,
  PrimaryButton,
  SecondaryButton,
  Card,
  Modal,
} from "@/components";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { getApp } from "@react-native-firebase/app";
import { getFirestore, doc, setDoc } from "@react-native-firebase/firestore";
import type { RootStackParamList } from "@/navigation/navigate";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

type ScreenRoute = RouteProp<RootStackParamList, "EditResult">;

const app = getApp();
const db = getFirestore(app);

export default function EditResultScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const { uid } = useAuthContext();
  const route = useRoute<ScreenRoute>();
  const savedCloudId = route.params?.savedCloudId;
  const nav = useNavigation<any>();
  const { meal, setLastScreen, setPhotoUrl } = useMealDraftContext();
  const { userData } = useUserContext();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [mealName, setMealName] = useState(meal?.name || autoMealName());
  const [mealType, setMealType] = useState<MealType>(meal?.type || "breakfast");
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [selectedAt, setSelectedAt] = useState<Date>(
    meal?.timestamp ? new Date(meal.timestamp) : new Date()
  );
  const [addedAt, setAddedAt] = useState<Date>(new Date());

  const image = meal?.photoUrl ?? null;
  const [imageError, setImageError] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  useEffect(() => setImageError(false), [image]);

  useEffect(() => {
    if (uid) setLastScreen(uid, "EditResult");
  }, [setLastScreen, uid]);

  useEffect(() => {
    const checkLocal = async () => {
      if (!meal?.photoUrl) return;
      setCheckingImage(true);
      try {
        const isLocal = meal.photoUrl.startsWith("file://");
        if (!isLocal) {
          setPhotoUrl(null);
          return;
        }
        const info = await FileSystem.getInfoAsync(meal.photoUrl);
        if (!info.exists) setPhotoUrl(null);
      } finally {
        setCheckingImage(false);
      }
    };
    void checkLocal();
  }, [meal?.photoUrl, setPhotoUrl]);

  if (!meal || !uid) return null;

  const goShare = () => {
    if (!meal || !uid) return;
    const pass = {
      ...meal,
      name: mealName,
      type: mealType,
      timestamp: selectedAt.toISOString(),
    } as any;
    nav.navigate("MealShare", { meal: pass, returnTo: "MealDetails" });
  };

  const handleAddPhoto = () => {
    navigation.navigate("MealCamera", {
      skipDetection: true,
      returnTo: "EditResult",
    });
  };

  const handleSave = async () => {
    if (!userData?.uid || saving) return;
    if (!savedCloudId) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const payload = {
      ...(meal as any),
      name: mealName,
      type: mealType,
      timestamp: selectedAt.toISOString(),
      createdAt: addedAt.toISOString(),
      updatedAt: nowIso,
      source: "saved",
    };
    try {
      await setDoc(doc(db, "users", uid, "myMeals", savedCloudId), payload, {
        merge: true,
      });
      navigation.navigate("SavedMeals");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setShowCancelModal(true);
  const handleCancelConfirm = () => navigation.navigate("SavedMeals");

  return (
    <Layout showNavigation={false}>
      <View style={{ padding: theme.spacing.container }}>
        <View style={styles.imageWrap}>
          {checkingImage ? (
            <ActivityIndicator size="large" color={theme.accent} />
          ) : image && !imageError ? (
            <>
              {console.log("Rendering image:", image)}
              <Image
                source={{ uri: image }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
              <Pressable
                onPress={goShare}
                accessibilityRole="button"
                accessibilityLabel={t("share", { ns: "common" })}
                hitSlop={8}
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                  },
                ]}
              >
                <MaterialIcons name="ios-share" size={22} color={theme.text} />
              </Pressable>
            </>
          ) : (
            <>
              {console.log("Rendering image:", image)}
              <Pressable
                onPress={handleAddPhoto}
                style={[
                  styles.placeholder,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("add_photo", { ns: "meals" })}
              >
                <MaterialIcons
                  name="add-a-photo"
                  size={44}
                  color={theme.textSecondary}
                />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontWeight: "600",
                    marginTop: 6,
                  }}
                >
                  {t("add_photo", { ns: "meals" })}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <Card>
          <Text
            style={{
              fontSize: theme.typography.size.md,
              color: theme.text,
              fontWeight: "600",
              marginBottom: theme.spacing.sm,
            }}
          >
            {t("meal_name", { ns: "meals", defaultValue: "Nazwa posiłku" })}
          </Text>
          <Text
            style={{
              color: theme.text,
              opacity: 0.8,
              marginBottom: theme.spacing.xs,
            }}
          >
            {mealName}
          </Text>
        </Card>

        <DateTimeSection
          value={selectedAt}
          onChange={setSelectedAt}
          addedValue={addedAt}
          onChangeAdded={setAddedAt}
        />

        <Card
          variant="outlined"
          onPress={() => !saving && setShowIngredients(!showIngredients)}
        >
          <Text
            style={{
              fontSize: theme.typography.size.md,
              fontWeight: "500",
              color: theme.text,
              textAlign: "center",
            }}
          >
            {showIngredients
              ? t("hide_ingredients", { ns: "meals" })
              : t("show_ingredients", { ns: "meals" })}
          </Text>
        </Card>

        <View
          style={[
            styles.actions,
            { gap: theme.spacing.md, marginTop: theme.spacing.md },
          ]}
        >
          <PrimaryButton
            label={t("save", { ns: "common" })}
            onPress={handleSave}
            loading={saving}
            disabled={saving || !savedCloudId}
          />
          <SecondaryButton
            label={t("back_to_saved", {
              ns: "meals",
              defaultValue: "Wróć do zapisanych",
            })}
            onPress={handleCancel}
            disabled={saving}
          />
        </View>
      </View>

      <Modal
        visible={showCancelModal}
        message={t("cancel_edit_message", {
          ns: "meals",
          defaultValue: "Porzucić zmiany i wrócić do zapisanych posiłków?",
        })}
        primaryActionLabel={t("confirm", { ns: "common" })}
        onClose={() => setShowCancelModal(false)}
        onPrimaryAction={handleCancelConfirm}
        secondaryActionLabel={t("cancel", { ns: "common" })}
        onSecondaryAction={() => setShowCancelModal(false)}
      />
    </Layout>
  );
}

const IMAGE_SIZE = 220;

const styles = StyleSheet.create({
  imageWrap: {
    position: "relative",
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    backgroundColor: "#B2C0C9",
  },
  placeholder: {
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    gap: 6,
  },
  fab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actions: { justifyContent: "space-between" },
});
