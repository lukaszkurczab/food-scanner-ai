import React from "react";
import { View } from "react-native";
import { PrimaryButton, SecondaryButton } from "@/src/components";
import { StickyFooterActions } from "../components/StickyFooterActions";

export const MealDetailsActions: React.FC<{
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ onEdit, onDuplicate, onDelete }) => {
  return (
    <StickyFooterActions>
      <View style={{ gap: 10 }}>
        <PrimaryButton label="Edit meal" onPress={onEdit} />
        <SecondaryButton label="Duplicate" onPress={onDuplicate} />
        <SecondaryButton label="Delete" onPress={onDelete} />
      </View>
    </StickyFooterActions>
  );
};
