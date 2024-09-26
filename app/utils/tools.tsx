import OpenAI from "openai";

export const addTodosTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "addTodos",
    description: "Add multiple new todo items to the list with subtasks",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        todos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The title of the todo item",
              },
              subtasks: {
                type: "array",
                items: { type: "string" },
                description: "An array of subtasks for the todo item",
              },
            },
            required: ["text", "subtasks"],
            additionalProperties: false,
          },
          description: "An array of todo items to add",
        },
      },
      required: ["todos"],
      additionalProperties: false,
    },
  },
};

export const addSubtasksTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "addSubtasks",
    description: "Add subtasks to an existing todo item",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        todoId: {
          type: "number",
          description: "The ID of the todo item to add subtasks to",
        },
        subtasks: {
          type: "array",
          items: { type: "string" },
          description: "An array of subtasks to add",
        },
      },
      required: ["todoId", "subtasks"],
      additionalProperties: false,
    },
  },
};

export const completeTodosTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "completeTodos",
    description: "Mark todo items as completed",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "number" },
          description: "An array of todo item IDs to mark as completed",
        },
      },
      required: ["ids"],
      additionalProperties: false,
    },
  },
};

export const completeSubtasksTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "completeSubtasks",
    description: "Mark subtasks as completed",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        subtaskIds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              todoId: { type: "number" },
              subtaskId: { type: "number" },
            },
            required: ["todoId", "subtaskId"],
            additionalProperties: false,
          },
          description:
            "An array of subtask IDs to mark as completed, with their parent todo IDs",
        },
      },
      required: ["subtaskIds"],
      additionalProperties: false,
    },
  },
};

export const uncompleteTodosTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "uncompleteTodos",
    description: "Mark todo items as incomplete",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "number" },
          description: "An array of todo item IDs to mark as incomplete",
        },
      },
      required: ["ids"],
      additionalProperties: false,
    },
  },
};

export const uncompleteSubtasksTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "uncompleteSubtasks",
    description: "Mark subtasks as incomplete",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        subtaskIds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              todoId: { type: "number" },
              subtaskId: { type: "number" },
            },
            required: ["todoId", "subtaskId"],
            additionalProperties: false,
          },
          description:
            "An array of subtask IDs to mark as incomplete, with their parent todo IDs",
        },
      },
      required: ["subtaskIds"],
      additionalProperties: false,
    },
  },
};

export const deleteTodosTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "deleteTodos",
    description: "Delete todo items from the list",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "number" },
          description: "An array of todo item IDs to delete",
        },
      },
      required: ["ids"],
      additionalProperties: false,
    },
  },
};

export const deleteSubtasksTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "deleteSubtasks",
    description: "Delete subtasks from todo items",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        subtaskIds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              todoId: { type: "number" },
              subtaskId: { type: "number" },
            },
            required: ["todoId", "subtaskId"],
            additionalProperties: false,
          },
          description:
            "An array of subtask IDs to delete, with their parent todo IDs",
        },
      },
      required: ["subtaskIds"],
      additionalProperties: false,
    },
  },
};
