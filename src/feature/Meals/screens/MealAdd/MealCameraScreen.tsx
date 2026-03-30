import { useMemo } from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import { CameraView } from "expo-camera";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { Layout, PhotoPreview, ScreenCornerNavButton } from "@/components";
import { Modal } from "@/components/Modal";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useMealCameraState } from "@/feature/Meals/hooks/useMealCameraState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";

export default function MealCameraScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"CameraDefault">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t: tCommon } = useTranslation("common");
  const { t: tMeals } = useTranslation("meals");
  const { t: tChat } = useTranslation("chat");
  const canStepBack = flow.canGoBack();
  const topLeftActionStyle = useMemo(
    () => ({
      top: insets.top + theme.spacing.xs,
      left: insets.left + theme.spacing.sm,
    }),
    [insets.left, insets.top, theme.spacing.sm, theme.spacing.xs],
  );
  const topRightActionStyle = useMemo(
    () => ({
      top: insets.top + theme.spacing.xs,
      right: insets.right + theme.spacing.sm,
    }),
    [insets.right, insets.top, theme.spacing.sm, theme.spacing.xs],
  );

  const {
    permission,
    requestPermission,
    cameraRef,
    isCameraReady,
    isTakingPhoto,
    photoUri,
    premiumModal,
    canUsePhotoAi,
    skipDetection,
    setIsCameraReady,
    handleTakePicture,
    handleAccept,
    handleRetake,
    onUseSample,
    closePremiumModal,
    goManagePremium,
  } = useMealCameraState({ navigation, flow, params });

  const handleTopLeftPress = () => {
    if (canStepBack) {
      flow.goBack();
      return;
    }
    navigation.goBack();
  };

  if (!permission) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <View style={styles.flexBackground} />
      </Layout>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionTitle}>
            {tCommon("camera_permission_title")}
          </Text>

          <Text style={styles.permissionSubtitle}>
            {blocked
              ? tMeals("camera_permission_blocked_message")
              : tCommon("camera_permission_message")}
          </Text>

          <Pressable
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonLabel}>
              {tCommon("continue")}
            </Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  if (photoUri) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <PhotoPreview
          photoUri={photoUri}
          onRetake={handleRetake}
          onAccept={handleAccept}
          secondaryText={tCommon("camera_retake")}
          primaryText={tCommon("camera_use_photo")}
        />
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onCameraReady={() => setIsCameraReady(true)}
          />
          <View style={StyleSheet.absoluteFill}>
            <ScreenCornerNavButton
              icon={canStepBack ? "back" : "close"}
              onPress={handleTopLeftPress}
              accessibilityLabel={
                canStepBack
                  ? tCommon("back", { defaultValue: "Back" })
                  : tCommon("close", { defaultValue: "Close" })
              }
              containerStyle={topLeftActionStyle}
            />

            {!skipDetection && (
              <View style={[styles.creditsBadgePosition, topRightActionStyle]}>
                <AiCreditsBadge
                  text={tChat("credits.costMultiple", { count: 5 })}
                />
              </View>
            )}

            <View style={styles.photoGuideWrap}>
              <View style={styles.photoGuidePill}>
                <Text style={styles.photoGuidePillText}>
                  {tMeals("camera_default_label", {
                    defaultValue: "Photo meal",
                  })}
                </Text>
              </View>
              <View style={styles.photoGuideCard}>
                <Text style={styles.photoGuideTitle}>
                  {tMeals("camera_default_title", {
                    defaultValue: "Capture your meal",
                  })}
                </Text>
                <Text style={styles.photoGuideText}>
                  {skipDetection
                    ? tMeals("camera_replace_subtitle", {
                        defaultValue:
                          "Take a new photo to update the current draft.",
                      })
                    : canUsePhotoAi
                      ? tMeals("camera_default_subtitle", {
                          defaultValue:
                            "Frame the whole plate clearly. We'll prepare a draft for review.",
                        })
                      : tChat("limit.photoRequired", {
                          cost: 5,
                        })}
                </Text>
              </View>
            </View>

            <View style={styles.shutterWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.shutterButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleTakePicture}
                disabled={isTakingPhoto || !isCameraReady}
              >
                <View style={styles.shutterCore} />
              </Pressable>
            </View>

            {typeof __DEV__ !== "undefined" && __DEV__ && (
              <View style={styles.devRow}>
                <Pressable
                  onPress={() => void onUseSample()}
                  style={styles.devBtn}
                >
                  <Text style={styles.devBtnText}>
                    {tMeals("dev.sample_meal")}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={premiumModal}
        title={tChat("limit.reachedTitle")}
        message={tChat("limit.photoRequired", {
          cost: 5,
        })}
        onClose={closePremiumModal}
        primaryAction={{
          label: tChat("limit.upgradeCta"),
          onPress: goManagePremium,
        }}
        secondaryAction={{
          label: tCommon("cancel"),
          onPress: closePremiumModal,
        }}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) => {
  const overlayCard = theme.isDark
    ? "rgba(0, 0, 0, 0.52)"
    : "rgba(17, 24, 39, 0.58)";
  const overlayStroke = "rgba(255, 255, 255, 0.88)";
  const overlayPrimaryText = "rgba(255, 255, 255, 0.96)";
  const overlaySecondaryText = "rgba(255, 255, 255, 0.78)";

  return StyleSheet.create({
    layout: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    fill: { flex: 1 },
    flexBackground: { flex: 1, backgroundColor: theme.background },
    cameraWrap: { flex: 1, backgroundColor: theme.background },
    camera: { flex: 1 },
    permissionWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.background,
    },
    permissionTitle: {
      fontSize: theme.typography.size.bodyM,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    permissionSubtitle: {
      fontSize: theme.typography.size.bodyL,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
      color: theme.text,
      opacity: 0.9,
    },
    permissionButton: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg + theme.spacing.xs,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.surfaceElevated,
    },
    permissionButtonLabel: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      color: theme.text,
    },
    creditsBadgePosition: {
      position: "absolute",
    },
    photoGuideWrap: {
      position: "absolute",
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: 126,
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    photoGuidePill: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.rounded.full,
      backgroundColor: overlayCard,
      borderWidth: 1,
      borderColor: theme.overlay,
    },
    photoGuidePillText: {
      color: overlayPrimaryText,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.medium,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    photoGuideCard: {
      width: "100%",
      maxWidth: 360,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.rounded.xl,
      backgroundColor: overlayCard,
      gap: theme.spacing.xs,
      alignItems: "center",
    },
    photoGuideTitle: {
      color: overlayPrimaryText,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
    photoGuideText: {
      color: overlaySecondaryText,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      textAlign: "center",
    },
    shutterWrapper: {
      position: "absolute",
      bottom: 48,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    shutterButton: {
      alignItems: "center",
      justifyContent: "center",
      borderColor: overlayStroke,
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 2,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    shutterCore: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: overlayStroke,
    },
    devRow: {
      position: "absolute",
      top: theme.spacing.md,
      left: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-start",
    },
    devBtn: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    devBtnText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
    },
  });
};
