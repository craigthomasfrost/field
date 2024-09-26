import { ActionFunction, redirect } from "@remix-run/node";

import { authenticator } from "../services/auth.server";

export const action: ActionFunction = async ({ request }) => {
  await authenticator.logout(request, { redirectTo: "/" });
};

export const loader = async () => redirect("/");
