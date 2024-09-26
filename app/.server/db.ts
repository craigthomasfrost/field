import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";

import { Message, Subtask, Todo, User } from "../utils/types";

let db: Database;

interface TodoInput {
  text: string;
  subtasks?: string[];
}

type RawTodo = Omit<Todo, "completed" | "subtasks"> & {
  completed: number;
  subtasks: string;
};

interface RawSubtask {
  todoId: number;
  subtaskId: number;
}

export async function getDb() {
  if (!db) {
    db = await open({
      filename: "database.sqlite",
      driver: sqlite3.Database,
    });

    await db.run("PRAGMA foreign_keys = ON;");

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        avatar_url TEXT
      );

      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        tool_call_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }
  return db;
}

export async function getTodos(userId: number) {
  const db = await getDb();
  const todos = await db.all<RawTodo[]>(
    `
    SELECT t.id, t.text, t.completed,
           json_group_array(
             json_object(
               'id', s.id,
               'text', s.text,
               'completed', s.completed
             )
           ) FILTER (WHERE s.id IS NOT NULL) as subtasks
    FROM todos t
    LEFT JOIN subtasks s ON t.id = s.todo_id
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY t.id;
  `,
    userId,
  );

  return todos.map((todo) => ({
    ...todo,
    completed: Boolean(todo.completed),
    subtasks: JSON.parse(todo.subtasks).map((subtask: Subtask) => ({
      ...subtask,
      completed: Boolean(subtask.completed),
    })),
  }));
}

export async function addTodos(userId: number, items: (string | TodoInput)[]) {
  const db = await getDb();
  const addedTodos: string[] = [];

  await db.run("BEGIN TRANSACTION");

  try {
    for (const item of items) {
      if (typeof item === "string") {
        if (item.trim() !== "") {
          await db.run(
            "INSERT INTO todos (user_id, text) VALUES (?, ?)",
            userId,
            item.trim(),
          );
          addedTodos.push(item.trim());
        }
      } else if (typeof item === "object" && item !== null) {
        if (item.text && item.text.trim() !== "") {
          const { lastID } = await db.run(
            "INSERT INTO todos (user_id, text) VALUES (?, ?)",
            userId,
            item.text.trim(),
          );
          addedTodos.push(item.text.trim());

          if (Array.isArray(item.subtasks)) {
            for (const subtext of item.subtasks) {
              if (subtext.trim() !== "") {
                await db.run(
                  "INSERT INTO subtasks (todo_id, text) VALUES (?, ?)",
                  lastID,
                  subtext.trim(),
                );
              }
            }
          }
        }
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error adding todos:", error);
  }

  return addedTodos;
}

export const addSubtasks = async (
  userId: number,
  todoId: number,
  subtasks: string[],
) => {
  const addedSubtasks: string[] = [];
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    const todoExists = await db.get(
      "SELECT 1 FROM todos WHERE id = ? AND user_id = ?",
      todoId,
      userId,
    );
    if (!todoExists) {
      throw new Error("Todo not found or doesn't belong to the user");
    }

    for (const subtext of subtasks) {
      if (subtext.trim() !== "") {
        await db.run(
          "INSERT INTO subtasks (todo_id, text) VALUES (?, ?)",
          todoId,
          subtext.trim(),
        );
        addedSubtasks.push(subtext.trim());
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error(`Error adding subtasks to todo ${todoId}:`, error);
  }

  return addedSubtasks;
};

export const completeTodos = async (userId: number, ids: number[]) => {
  const completedTodos: string[] = [];

  await db.run("BEGIN TRANSACTION");

  try {
    for (const id of ids) {
      await db.run(
        "UPDATE todos SET completed = 1 WHERE id = ? AND user_id = ?",
        id,
        userId,
      );
      await db.run("UPDATE subtasks SET completed = 1 WHERE todo_id = ?", id);
      const result = await db.get(
        "SELECT text FROM todos WHERE id = ? AND user_id = ?",
        id,
        userId,
      );
      if (result) {
        completedTodos.push(result.text);
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error completing todos:", error);
  }

  return completedTodos;
};

export const completeSubtasks = async (
  userId: number,
  subtaskIds: RawSubtask[],
) => {
  const completedSubtasks: string[] = [];
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const { todoId, subtaskId } of subtaskIds) {
      const todoExists = await db.get(
        "SELECT 1 FROM todos WHERE id = ? AND user_id = ?",
        todoId,
        userId,
      );
      if (!todoExists) {
        throw new Error("Todo not found or doesn't belong to the user");
      }

      await db.run(
        "UPDATE subtasks SET completed = 1 WHERE id = ? AND todo_id = ?",
        subtaskId,
        todoId,
      );
      const result = await db.get(
        "SELECT text FROM subtasks WHERE id = ? AND todo_id = ?",
        subtaskId,
        todoId,
      );
      if (result) {
        completedSubtasks.push(result.text);
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error completing subtasks:", error);
  }

  return completedSubtasks;
};

export const uncompleteTodos = async (userId: number, ids: number[]) => {
  const uncompletedTodos: string[] = [];
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const id of ids) {
      await db.run(
        "UPDATE todos SET completed = 0 WHERE id = ? AND user_id = ?",
        id,
        userId,
      );
      await db.run("UPDATE subtasks SET completed = 0 WHERE todo_id = ?", id);
      const result = await db.get(
        "SELECT text FROM todos WHERE id = ? AND user_id = ?",
        id,
        userId,
      );
      if (result) {
        uncompletedTodos.push(result.text);
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error uncompleting todos:", error);
  }

  return uncompletedTodos;
};

export const uncompleteSubtasks = async (
  userId: number,
  subtaskIds: RawSubtask[],
) => {
  const uncompletedSubtasks: string[] = [];
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const { todoId, subtaskId } of subtaskIds) {
      const todoExists = await db.get(
        "SELECT 1 FROM todos WHERE id = ? AND user_id = ?",
        todoId,
        userId,
      );
      if (!todoExists) {
        throw new Error("Todo not found or doesn't belong to the user");
      }

      await db.run(
        "UPDATE subtasks SET completed = 0 WHERE id = ? AND todo_id = ?",
        subtaskId,
        todoId,
      );
      const result = await db.get(
        "SELECT text FROM subtasks WHERE id = ? AND todo_id = ?",
        subtaskId,
        todoId,
      );
      if (result) {
        uncompletedSubtasks.push(result.text);
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error uncompleting subtasks:", error);
  }

  return uncompletedSubtasks;
};

export const deleteTodos = async (userId: number, ids: number[]) => {
  const deletedTodos: string[] = [];
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const id of ids) {
      const result = await db.get(
        "SELECT text FROM todos WHERE id = ? AND user_id = ?",
        id,
        userId,
      );
      if (result) {
        deletedTodos.push(result.text);
        await db.run(
          "DELETE FROM todos WHERE id = ? AND user_id = ?",
          id,
          userId,
        );
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error deleting todos:", error);
  }

  return deletedTodos;
};

export const deleteSubtasks = async (
  userId: number,
  subtaskIds: RawSubtask[],
) => {
  const deletedSubtasks: string[] = [];
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    for (const { todoId, subtaskId } of subtaskIds) {
      const todoExists = await db.get(
        "SELECT 1 FROM todos WHERE id = ? AND user_id = ?",
        todoId,
        userId,
      );
      if (!todoExists) {
        throw new Error("Todo not found or doesn't belong to the user");
      }

      const result = await db.get(
        "SELECT text FROM subtasks WHERE id = ? AND todo_id = ?",
        subtaskId,
        todoId,
      );
      if (result) {
        deletedSubtasks.push(result.text);
        await db.run(
          "DELETE FROM subtasks WHERE id = ? AND todo_id = ?",
          subtaskId,
          todoId,
        );
      }
    }
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error deleting subtasks:", error);
  }

  return deletedSubtasks;
};

export async function saveMessage(
  userId: number,
  role: Message["role"],
  content: string,
  tool_calls?: object,
  tool_call_id?: string,
) {
  const db = await getDb();
  await db.run(
    "INSERT INTO messages (user_id, role, content, tool_calls, tool_call_id) VALUES (?, ?, ?, ?, ?)",
    [
      userId,
      role,
      content,
      tool_calls ? JSON.stringify(tool_calls) : null,
      tool_call_id,
    ],
  );
}

export async function getMessages(userId: number) {
  const db = await getDb();
  return db.all<Message[]>(
    "SELECT role, content, tool_calls, tool_call_id FROM messages WHERE user_id = ? ORDER BY id ASC",
    userId,
  );
}

export async function resetMessages(userId: number) {
  const db = await getDb();
  await db.run("BEGIN TRANSACTION");
  try {
    await db.run("DELETE FROM messages WHERE user_id = ?", userId);
    await db.run(
      "INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)",
      [userId, "assistant", "How can I help with your tasks today?"],
    );
    await db.run("COMMIT");
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error resetting messages:", error);
  }
}

export async function createOrUpdateUser(
  user: Omit<User, "id">,
): Promise<User> {
  const db = await getDb();

  await db.run("BEGIN TRANSACTION");

  try {
    const existingUser = await db.get(
      "SELECT id FROM users WHERE google_id = ?",
      user.googleId,
    );

    let userId: number;

    if (existingUser) {
      await db.run(
        "UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE google_id = ?",
        [user.name, user.email, user.avatarUrl, user.googleId],
      );
      userId = existingUser.id;
    } else {
      const result = await db.run(
        "INSERT INTO users (google_id, name, email, avatar_url) VALUES (?, ?, ?, ?)",
        [user.googleId, user.name, user.email, user.avatarUrl],
      );
      if (typeof result.lastID !== "number") {
        throw new Error("Failed to insert new user: No ID returned");
      }
      userId = result.lastID;
    }

    await db.run("COMMIT");
    return { ...user, id: userId };
  } catch (error) {
    await db.run("ROLLBACK");
    console.error("Error creating or updating user:", error);
    throw error;
  }
}
