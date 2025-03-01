/* eslint-disable */

import React, { useState } from "react";
import { Button, Modal, Form, Textarea, SpaceBetween, Spinner } from "@cloudscape-design/components";
import { useUpdateFeedbackMutation } from '../../hooks/chats';

type FeedbackPanelProps = {
  messageId: string;
  chatId: string;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ messageId, chatId }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");
  const [selectedThumb, setSelectedThumb] = useState<"up" | "down" | null>(null);

  const openModal = (thumb: "up" | "down") => {
    setSelectedThumb(thumb);
    setVisible(true);
  };

  const { mutate: updateFeedback, status: status } = useUpdateFeedbackMutation();
  const isSubmitting = status === "loading";

  const submitFeedback = () => {
    if (selectedThumb) {
      updateFeedback({
        chatId,
        updateFeedbackRequestContent: {
          thumb: selectedThumb,
          feedback: feedback,
          messageId: messageId,
        }
      });
    }
    setVisible(false);
  };

  return (
    <div>
      <SpaceBetween direction="horizontal" size="xs">
        <Button onClick={() => openModal("up")} iconName="thumbs-up" variant="icon"></Button>
        <Button onClick={() => openModal("down")} iconName="thumbs-down" variant="icon"></Button>
      </SpaceBetween>

      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        header="Provide Your Feedback"
        footer={
          <SpaceBetween direction="horizontal" size="s">
            <Button variant="link" onClick={() => setVisible(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitFeedback} disabled={isSubmitting}>
              {isSubmitting ? < Spinner /> : "Submit"}
            </Button>
          </SpaceBetween>
        }
      >
        <Form>
          <Textarea
            value={feedback}
            onChange={({ detail }) => setFeedback(detail.value)}
            placeholder="Let us know your thoughts..."
          />
        </Form>
      </Modal>
    </div>
  );
};

export default FeedbackPanel;

