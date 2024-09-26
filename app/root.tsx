import React from "react";

import { Links, Meta, MetaFunction, Outlet, Scripts } from "@remix-run/react";

import "./styles/tailwind.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Field | AI Todo App" },
    {
      name: "description",
      content: "Field is a todo app powered by AI.",
    },
  ];
};

export default function App() {
  return (
    <html>
      <head>
        <link rel="icon" href="data:image/x-icon;base64,AA" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
