/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse } from './api.ts';

interface HistoryItem {
  timestamp: number;
  number: string;
  data: ApiResponse;
}

const STORAGE_KEY = 'tracexdata_history';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Hours

export const saveToHistory = (_number: string, _data: ApiResponse) => {
  // Search history disabled
  localStorage.removeItem(STORAGE_KEY);
};

export const getHistory = (): HistoryItem[] => {
  localStorage.removeItem(STORAGE_KEY);
  return [];
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
