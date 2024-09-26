import React from "react";

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";

import { authenticator } from "../services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await authenticator.isAuthenticated(request);
  if (user) return redirect("/app");

  return json({});
}

export default function Login() {
  return (
    <div className="h-dvh w-screen flex items-center justify-center">
      <div>
        <h1>Welcome to Field</h1>
        <Form action="/auth/google" method="post">
          <button className="text-gray-500 hover:text-black">
            Sign in with Google
          </button>
        </Form>
      </div>
    </div>
  );
}
