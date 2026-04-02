import {
  Exercise,
  ExerciseGroup,
  HistoryEntry,
  SnoozeEntry,
  CreateHistoryRequest,
  CreateSnoozeRequest,
  ApiMeta,
  TrainingSession,
  HistorySet,
  CreateSessionRequest,
  CreateSetRequest,
} from '@/types/api';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000')
  .replace(/^["']|["']$/g, '')
  .replace(/\/$/, '');

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log('Fetching:', url);

    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof Error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Verbindung zum Server fehlgeschlagen. Überprüfe die API-URL.');
      }
      throw error;
    }
    throw new Error('Ein unerwarteter Fehler ist aufgetreten');
  }
}


export const api = {
  getMeta: () => fetchApi<ApiMeta>('/'),

  getQueue: (limit?: number) =>
    fetchApi<ExerciseGroup[]>(limit != null ? `/queue?limit=${limit}` : '/queue'),

  getExercise: (exerciseId: number) =>
    fetchApi<Exercise>(`/exercise/${exerciseId}`),

  createHistory: (data: CreateHistoryRequest) =>
    fetchApi<HistoryEntry>('/history', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: () => fetchApi<HistoryEntry[]>('/history'),

  getExerciseHistory: (exerciseId: number, limit?: number) =>
    fetchApi<HistoryEntry[]>(
      `/history?exerciseId=${exerciseId}${limit != null ? `&limit=${limit}` : ''}`
    ),

  snoozeExercise: (data: CreateSnoozeRequest) =>
    fetchApi<SnoozeEntry>('/snooze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAllSnoozes: () =>
    fetchApi<void>('/snooze', {
      method: 'DELETE',
    }),

  createSession: (data: CreateSessionRequest) =>
    fetchApi<TrainingSession>('/session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addSet: (sessionId: number, data: CreateSetRequest) =>
    fetchApi<HistorySet>(`/session/${sessionId}/set`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
