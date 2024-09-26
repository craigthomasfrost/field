export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: string | null;
  tool_call_id?: string | null;
}

export type User = {
  id: number;
  googleId: string;
  name: string;
  email: string;
  avatarUrl: string;
};
