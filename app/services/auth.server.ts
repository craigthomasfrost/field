import { Authenticator, AuthorizationError } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";

import { createOrUpdateUser } from "../.server/db";
import { User } from "../utils/types";
import { sessionStorage } from "./session.server";

type AuthUser = User & { id: number };

export const authenticator = new Authenticator<AuthUser>(sessionStorage);

const allowListString = process.env.ALLOWED_EMAILS ?? "";
const allowList = new Set(
  allowListString.split(",").map((email) => email.trim()),
);

let googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackURL: process.env.GOOGLE_CALLBACK_URL ?? "",
  },
  async ({ profile }) => {
    const email = profile.emails[0].value;

    if (allowList.has(email)) {
      const user: Omit<User, "id"> = {
        googleId: profile.id,
        name: profile.displayName,
        email: email,
        avatarUrl: profile.photos[0]?.value,
      };
      return await createOrUpdateUser(user);
    } else {
      throw new AuthorizationError("Your account is not authorized.");
    }
  },
);

authenticator.use(googleStrategy);
