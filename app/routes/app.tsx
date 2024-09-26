import React, { useEffect, useRef } from "react";

import { ArrowPathIcon, CheckIcon } from "@heroicons/react/20/solid";
import { json, redirect } from "@remix-run/node";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import classNames from "classnames";

import { getAssistantResponse } from "../.server/ai";
import {
  getMessages,
  getTodos,
  resetMessages,
  saveMessage,
} from "../.server/db";
import { authenticator } from "../services/auth.server";
import { Message, Subtask, Todo } from "../utils/types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request);

  if (!user) {
    return redirect("/");
  }

  const todos = await getTodos(user.id);
  const messages = await getMessages(user.id);

  return json({
    user,
    todos,
    messages,
  });
};

export const action = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    return redirect("/");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reset") {
    await resetMessages(user.id);
    return json({ success: true });
  }

  const userMessage = formData.get("message");
  await saveMessage(user.id, "user", userMessage);
  const result = await getAssistantResponse(userMessage, user.id);

  return json(result);
};

export default function Home() {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { todos, messages, user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const allMessages: Message[] = [
    ...messages,
    ...(fetcher.formData
      ? [
          {
            role: "user" as const,
            content: fetcher.formData.get("message") as string,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [allMessages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    fetcher.submit(form);
    form.reset();
  };

  const handleReset = () => {
    fetcher.submit({ intent: "reset" }, { method: "post" });
  };

  return (
    <div className="flex flex-col lg:flex-row h-dvh w-screen gap-3 justify-center p-4">
      <div className="flex lg:flex-col justify-between py-1">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
        >
          <path
            d="M1 10H8M8 10H15M8 10V3M8 10L13.5 4.5M8 10L2.5 4.5"
            stroke="currentcolor"
          />
        </svg>

        <Form action="/logout" method="post">
          <button type="submit" className="rounded-full overflow-hidden">
            <img src={user.avatarUrl} className="h-8 w-8" />
          </button>
        </Form>
      </div>
      <div className="flex h-full flex-grow flex-col overflow-hidden rounded-2xl border border-gray-200 lg:flex-row">
        <div className="h-3/6 overflow-y-auto border-b border-gray-200 lg:h-full lg:flex-grow lg:border-b-0 lg:border-r">
          {todos.length === 0 && (
            <div className="flex h-full w-full items-center justify-center">
              <div>
                <p>Create your first task</p>
                <p className="text-gray-500">Chat with our AI assistant</p>
              </div>
            </div>
          )}
          {todos.length > 0 && (
            <ul className="flex flex-col">
              {todos.map((todo: Todo) => (
                <li
                  key={todo.id}
                  className="flex flex-col gap-1 border-b border-gray-200 px-2.5 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={classNames(
                        "flex h-4 w-4 items-center justify-center rounded",
                        {
                          "bg-black text-white": todo.completed,
                          "border border-gray-300 bg-white": !todo.completed,
                        },
                      )}
                    >
                      {todo.completed && <CheckIcon className="h-3 w-3" />}
                    </span>
                    <span>{todo.text}</span>
                  </div>
                  {todo.subtasks && todo.subtasks?.length > 0 && (
                    <ul className="flex flex-col gap-1 pl-6">
                      {todo.subtasks.map((subtask: Subtask) => (
                        <li
                          key={subtask.id}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={classNames(
                              "flex h-4 w-4 items-center justify-center rounded",
                              {
                                "bg-black text-white": subtask.completed,
                                "border border-gray-300 bg-white":
                                  !subtask.completed,
                              },
                            )}
                          >
                            {subtask.completed && (
                              <CheckIcon className="h-3 w-3" />
                            )}
                          </span>
                          <span>{subtask.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex h-3/6 flex-col lg:h-full lg:w-[32rem]">
          <div
            className="flex flex-grow flex-col gap-6 overflow-y-auto px-4 pb-16 pt-4"
            ref={chatContainerRef}
          >
            {allMessages
              .filter(
                (message: Message) =>
                  message.role === "user" ||
                  (message.role === "assistant" && message.content),
              )
              .map((message, index) => (
                <div
                  key={index}
                  className={classNames("w-fit", {
                    "ml-auto flex max-w-[75%] items-center rounded-xl bg-gray-100 px-4 py-2":
                      message.role === "user",
                    "flex gap-2": message.role === "assistant",
                  })}
                >
                  {message.role === "assistant" && (
                    <span className="mt-2 block h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500" />
                  )}
                  <span>{message.content}</span>
                </div>
              ))}
            {fetcher.state === "submitting" && (
              <div className="flex items-center space-x-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 opacity-100"></span>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 opacity-100 [animation-delay:333ms]"></span>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 opacity-100 [animation-delay:666ms]"></span>
              </div>
            )}
          </div>
          <fetcher.Form
            method="post"
            className="flex gap-2 p-4"
            onSubmit={handleSubmit}
          >
            <button
              type="button"
              onClick={handleReset}
              className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-black"
            >
              <ArrowPathIcon className="h-6 w-6" />
            </button>
            <input
              type="text"
              name="message"
              placeholder="Type your message..."
              autoComplete="off"
              className="h-10 flex-grow min-w-0 rounded-full bg-gray-100 px-4"
            />
            <button
              type="submit"
              className="h-10 rounded-full bg-black px-4 text-white disabled:cursor-not-allowed"
            >
              Send
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
