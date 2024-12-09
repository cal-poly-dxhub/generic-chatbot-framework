/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import React, { useRef } from 'react';

/**
 * Creates a ref that maintains current value of referenced stateful object.
 * @param state
 * @returns
 */
export function useStatefulRef<T>(state: T): React.MutableRefObject<T> {
  const ref = useRef<T>(state);

  if (ref.current !== state) {
    ref.current = state;
  }

  return ref;
}
