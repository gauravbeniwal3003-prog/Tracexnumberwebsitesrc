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

export const saveToHistory = (number: string, data: ApiResponse) => {
  const history = getHistory();
  const newItem: HistoryItem = {
    timestamp: Date.now(),
    number,
    data
  };
  
  // Remove existing entry for this number if it exists
  const filtered = history.filter(item => item.number !== number);
  const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getHistory = (): HistoryItem[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  
  try {
    const history: HistoryItem[] = JSON.parse(raw);
    const now = Date.now();
    
    // Auto-clear logic: Filter out items older than 24 hours
    const validHistory = history.filter(item => (now - item.timestamp) < EXPIRY_MS);
    
    if (validHistory.length !== history.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validHistory));
    }
    
    return validHistory;
  } catch (e) {
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
