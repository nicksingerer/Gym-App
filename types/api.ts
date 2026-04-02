export interface Muscle {
  id: number;
  name: string;
  priority: number;
}

export interface ExerciseMuscle {
  muscleId: number;
  impact: number;
  muscle: Muscle;
}

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  groupId: number;
  muscles: ExerciseMuscle[];
  daysSinceLastDone?: number | null;
}

export interface ExerciseGroup {
  id: number;
  name: string;
  exercises: Exercise[];
}

export interface SetDetail {
  setIndex: number;
  rpe: number;
  reps: number;
  weightKg: number;
}

export interface HistoryEntry {
  id: number;
  exerciseId: number;
  rpe: number;
  sets: number;
  createdAt: string;
  setDetails?: SetDetail[];
  exercise?: Exercise;
}

export interface SnoozeEntry {
  id: number;
  exerciseId: number;
  until: string;
}

export interface CreateHistoryRequest {
  exerciseId: number;
  rpe?: number;
  sets?: number;
}

export interface CreateSnoozeRequest {
  exerciseId: number;
  hours?: number;
}

export interface ApiMeta {
  version: string;
  author: string;
}

export interface TrainingSession {
  id: number;
  exerciseId: number;
  date: string;
}

export interface HistorySet {
  id: number;
  historyId: number;
  setIndex: number;
  weightKg: number;
  reps: number;
  rpe: number;
  createdAt: string;
}

export interface CreateSessionRequest {
  exerciseId: number;
}

export interface CreateSetRequest {
  weightKg: number;
  reps: number;
  rpe?: number;
}
