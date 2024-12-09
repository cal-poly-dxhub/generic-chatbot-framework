/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Button, ButtonProps, Modal, ModalProps } from '@cloudscape-design/components';
import { FC, PropsWithChildren, useState } from 'react';

export interface ModalButtonProps {
  readonly modal: Omit<ModalProps, 'visible' | 'children'>;
  readonly button: Omit<ButtonProps, 'onClick'>;
}

export const ModalButton: FC<PropsWithChildren<ModalButtonProps>> = ({ children, modal, button }) => {
  const [visisble, setVisible] = useState(false);

  return (
    <>
      <Button {...button} onClick={() => setVisible(true)} />
      <Modal {...modal} visible={visisble} onDismiss={() => setVisible(false)}>
        {children}
      </Modal>
    </>
  );
};
