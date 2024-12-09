/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
export function getMatchesCountText(count: number) {
  return count === 1 ? `1 match` : `${count} matches`;
}

export function formatDate(date: Date | number, locales = 'en-AU') {
  const dateFormatter = new Intl.DateTimeFormat(locales, { dateStyle: 'long' });
  const timeFormatter = new Intl.DateTimeFormat(locales, {
    timeStyle: 'short',
    hour12: false,
  });
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

export function createLabelFunction(columnName: string) {
  return ({ sorted, descending }: { sorted: boolean; descending: boolean }) => {
    const sortState = sorted ? `sorted ${descending ? 'descending' : 'ascending'}` : 'not sorted';
    return `${columnName}, ${sortState}.`;
  };
}

export const paginationLabels = {
  nextPageLabel: 'Next page',
  pageLabel: (pageNumber: number) => `Go to page ${pageNumber}`,
  previousPageLabel: 'Previous page',
};

export const collectionPreferencesProps = {
  cancelLabel: 'Cancel',
  confirmLabel: 'Confirm',
  title: 'Preferences',
};
