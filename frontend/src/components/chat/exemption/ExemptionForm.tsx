/* eslint-disable */
/* prettier-ignore */

import React, { useState, useEffect } from 'react';
import { Form, FormField, Select, Button, SpaceBetween } from '@cloudscape-design/components';

export interface DecisionNode {
  question?: string;
  decision?: string;
  yes?: DecisionNode;
  no?: DecisionNode;
}

export interface Answer {
  question: string;
  answer: string;
}

interface DecisionTreeFormProps {
  onSubmit: (answers: Answer[]) => void;
  tree: DecisionNode;
}

const DecisionTreeForm: React.FC<DecisionTreeFormProps> = ({ onSubmit, tree }) => {
  const [nodes, setNodes] = useState<DecisionNode[]>([tree]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newQuestionIndex, setNewQuestionIndex] = useState<number | null>(null);

  const handleSelectChange = (index: number, event: any) => {
    const selectedOption = event.detail.selectedOption;
    if (!selectedOption) {
      setNodes(nodes.slice(0, index + 1));
      setAnswers(answers.slice(0, index));
      return;
    }

    const value = selectedOption.value;
    const newAnswers = [...answers];
    newAnswers[index] = { question: nodes[index].question!, answer: value };
    setAnswers(newAnswers.slice(0, index + 1));

    const newNodes = [...nodes];
    newNodes[index + 1] = nodes[index][value as keyof DecisionNode] as DecisionNode;
    setNodes(newNodes.slice(0, index + 2));
    setNewQuestionIndex(index + 1);
  };

  console.log("DecisionTreeForm got tree: ", tree);

  const handleSubmit = () => {
    onSubmit(answers);
  };

  useEffect(() => {
    if (newQuestionIndex !== null) {
      setTimeout(() => setNewQuestionIndex(null), 500);
    }
  }, [newQuestionIndex]);

  return (
    <Form>
      <SpaceBetween size="m">
        {nodes.map((node, index) => (
          node.question && (
            <div key={index} className={`question ${newQuestionIndex === index ? 'question-enter question-enter-active' : ''}`}>
              <FormField label={node.question}>
                <Select
                  selectedOption={answers[index] ? { label: answers[index].answer, value: answers[index].answer } : { label: 'Select an option', value: '' }}
                  onChange={(event) => handleSelectChange(index, event)}
                  options={[
                    { label: 'Yes', value: 'yes' },
                    { label: 'No', value: 'no' }
                  ]}
                />
              </FormField>
            </div>
          )
        ))}

      </SpaceBetween>
      {nodes[nodes.length - 1]?.decision && (
        <div style={{ marginTop: '20px' }}>
          <Button onClick={handleSubmit} variant="primary">Submit</Button>
        </div>
      )}
    </Form>
  );
};

export default DecisionTreeForm;

