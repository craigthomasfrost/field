import OpenAI from "openai";

import {
  addSubtasksTool,
  addTodosTool,
  completeSubtasksTool,
  completeTodosTool,
  deleteSubtasksTool,
  deleteTodosTool,
  uncompleteSubtasksTool,
  uncompleteTodosTool,
} from "../utils/tools";
import { Subtask, Todo } from "../utils/types";
import {
  addSubtasks,
  addTodos,
  completeSubtasks,
  completeTodos,
  deleteSubtasks,
  deleteTodos,
  getMessages,
  getTodos,
  saveMessage,
  uncompleteSubtasks,
  uncompleteTodos,
} from "./db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAssistantResponse(
  userMessage: string,
  userId: number,
) {
  const currentTodos = await getTodos(userId);
  let previousMessages = await getMessages(userId);
  if (previousMessages.length > 0 && previousMessages[0].role === "tool") {
    previousMessages = previousMessages.slice(1);
  }
  const todoSummary = currentTodos
    .map(
      (todo: Todo) =>
        `- ID: ${todo.id}, Text: "${todo.text}", Completed: ${todo.completed}${
          todo.subtasks && todo.subtasks.length > 0
            ? `, Subtasks: [${todo.subtasks
                .map(
                  (subtask: Subtask) =>
                    `{ID: ${subtask.id}, Text: "${subtask.text}", Completed: ${subtask.completed}}`,
                )
                .join(", ")}]`
            : ""
        }`,
    )
    .join("\n");

  let messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a helpful AI assistant that can manage a todo list. The
      current tasks and their status can be seen below in case you need to
      discuss them with the user or reference them in tools etc.

      ${todoSummary}

      Whenever you respond to the user, be succinct. Don't ever repeat the whole
      task list because the user will be able to see it in the UI. Provide brief,
      helpful summaries of your actions so that you respond quickly.`,
    },
    ...previousMessages.map((msg): OpenAI.ChatCompletionMessageParam => {
      switch (msg.role) {
        case "tool":
          return {
            role: "tool",
            content: msg.content,
            tool_call_id: msg.tool_call_id!,
          };
        case "assistant":
          return msg.tool_calls
            ? {
                role: "assistant",
                content: msg.content,
                tool_calls: JSON.parse(msg.tool_calls),
              }
            : {
                role: "assistant",
                content: msg.content,
              };
        case "user":
        case "system":
          return {
            role: msg.role,
            content: msg.content,
          };
        default:
          throw new Error(`Unsupported message role: ${msg.role}`);
      }
    }),
    { role: "user", content: userMessage },
  ];

  let continueProcessing = true;

  while (continueProcessing) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: [
        addSubtasksTool,
        addTodosTool,
        completeSubtasksTool,
        completeTodosTool,
        deleteSubtasksTool,
        deleteTodosTool,
        uncompleteSubtasksTool,
        uncompleteTodosTool,
      ],
      tool_choice: "auto",
      parallel_tool_calls: false,
    });

    const assistantMessage = response.choices[0].message;

    await saveMessage(
      userId,
      "assistant",
      assistantMessage.content || "",
      assistantMessage.tool_calls || undefined,
    );

    messages.push(assistantMessage);

    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let result;

        switch (toolCall.function.name) {
          case "addTodos":
            result = await addTodos(userId, args.todos);
            break;
          case "completeTodos":
            result = await completeTodos(userId, args.ids);
            break;
          case "completeSubtasks":
            result = await completeSubtasks(userId, args.subtaskIds);
            break;
          case "uncompleteTodos":
            result = await uncompleteTodos(userId, args.ids);
            break;
          case "uncompleteSubtasks":
            result = await uncompleteSubtasks(userId, args.subtaskIds);
            break;
          case "deleteTodos":
            result = await deleteTodos(userId, args.ids);
            break;
          case "deleteSubtasks":
            result = await deleteSubtasks(userId, args.subtaskIds);
            break;
          case "addSubtasks":
            result = await addSubtasks(userId, args.todoId, args.subtasks);
            break;
          default:
            console.error(`Unknown tool: ${toolCall.function.name}`);
            continue;
        }

        await saveMessage(
          userId,
          "tool",
          JSON.stringify(result),
          undefined,
          toolCall.id,
        );

        messages.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    } else {
      continueProcessing = false;
      return assistantMessage;
    }
  }
}
