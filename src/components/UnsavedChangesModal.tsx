import { Modal } from "@/components/Modal";

type UnsavedChangesModalProps = {
  visible: boolean;
  title: string;
  message: string;
  discardLabel: string;
  continueEditingLabel: string;
  onDiscard: () => void;
  onContinueEditing: () => void;
};

export function UnsavedChangesModal({
  visible,
  title,
  message,
  discardLabel,
  continueEditingLabel,
  onDiscard,
  onContinueEditing,
}: UnsavedChangesModalProps) {
  return (
    <Modal
      visible={visible}
      title={title}
      message={message}
      onClose={onContinueEditing}
      primaryAction={{
        label: discardLabel,
        onPress: onDiscard,
        tone: "destructive",
      }}
      secondaryAction={{
        label: continueEditingLabel,
        onPress: onContinueEditing,
      }}
    />
  );
}

export default UnsavedChangesModal;
