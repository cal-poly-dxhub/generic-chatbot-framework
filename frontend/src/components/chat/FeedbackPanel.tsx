/* eslint-disable */

import React, { useState } from "react";
import { Button, Modal, Form, Textarea, SpaceBetween } from "@cloudscape-design/components";

type FeedbackPanelProps = {
  messageId: string;
  chatId: string;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");
  const [selectedThumb, setSelectedThumb] = useState<"up" | "down" | null>(null);

  const openModal = (thumb: "up" | "down") => {
    setSelectedThumb(thumb);
    setVisible(true);
  };

  const submitFeedback = () => {
    console.log("Feedback submitted:", { thumb: selectedThumb, feedback });
    setFeedback("");
    setVisible(false);
  };

  return (
    <div>
      <SpaceBetween direction="horizontal" size="xs">
        <Button onClick={() => openModal("up")} iconName="thumbs-up"></Button>
        <Button onClick={() => openModal("down")} iconName="thumbs-down"></Button>
      </SpaceBetween>

      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        header="Provide Your Feedback"
        footer={
          <SpaceBetween direction="horizontal" size="s">
            <Button variant="link" onClick={() => setVisible(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitFeedback}>Submit</Button>
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

