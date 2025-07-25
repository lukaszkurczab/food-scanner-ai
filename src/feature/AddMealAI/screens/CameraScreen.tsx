import { useEffect, useRef, useState } from "react";
import { View, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { PermissionRequestView, ConfirmButtons } from "@/src/components";
import { CaptureButton, TorchToggle } from "../components";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<any>();

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setPhotoUri(null);
    });

    return unsubscribe;
  }, [navigation]);

  const handleTakePicture = async () => {
    if (isTakingPhoto || !isCameraReady || !cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch (err) {
      console.error("Error taking picture:", err);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleAccept = () => {
    if (photoUri)
      navigation.navigate("ReviewIngredients", {
        image: photoUri,
        id: uuidv4(),
      });
  };

  const handleReject = () => {
    setPhotoUri(null);
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <PermissionRequestView
        message="Camera access is required to take photos"
        onPress={requestPermission}
      />
    );
  }

  if (photoUri) {
    return (
      <View style={{ flex: 1 }}>
        <Image
          source={{ uri: photoUri }}
          style={{ flex: 1 }}
          resizeMode="cover"
        />
        <ConfirmButtons onAccept={handleAccept} onReject={handleReject} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torchOn}
        onCameraReady={() => setIsCameraReady(true)}
      />
      <View
        style={{
          flex: 1,
          backgroundColor: "transparent",
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: [{ translateX: -50 }],
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 30,
          gap: 16,
        }}
      >
        <TorchToggle on={torchOn} toggle={() => setTorchOn((v) => !v)} />
        <CaptureButton onPress={handleTakePicture} disabled={isTakingPhoto} />
      </View>
    </View>
  );
};

export default CameraScreen;
