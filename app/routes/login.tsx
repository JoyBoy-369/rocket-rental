import {
  ActionArgs,
  LoaderArgs,
  MetaFunction,
  redirect,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import * as React from "react";
import { FormStrategy } from "remix-auth-form";
import { commitSession, getSession } from "~/services/session.server";
import { authenticator } from "~/services/auth.server";
import { safeRedirect } from "~/utils/misc";
import { createUser, getUserByUsername } from "~/models/user.server";

export async function loader({ request }: LoaderArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/",
  });
  const session = await getSession(request.headers.get("cookie"));
  const error = session.get(authenticator.sessionErrorKey);
  console.log({ error });
  return json(
    { formError: error?.message },
    { headers: { "Set-Cookie": await commitSession(session) } }
  );
}

export async function action({ request }: ActionArgs) {
  const formData = await request.clone().formData();
  const username = formData.get("username");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");
  const remember = formData.get("remember");

  const intent = formData.get("intent");
  switch (intent) {
    case "login": {
      const userId = await authenticator.authenticate(
        FormStrategy.name,
        request,
        {
          failureRedirect: "/login",
        }
      );
      const session = await getSession(request.headers.get("cookie"));
      // and store the user data
      session.set(authenticator.sessionKey, userId);

      // commit the session
      const newCookie = await commitSession(session, {
        maxAge: remember ? 60 * 60 * 24 * 7 : undefined,
      });
      return redirect(redirectTo, {
        headers: {
          "Set-Cookie": newCookie,
        },
      });
    }
    case "signup": {
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return json(
          { errors: { email: "A user already exists with this email" } },
          { status: 400 }
        );
      }

      const user = await createUser(username, password);
      const session = await getSession(request.headers.get("cookie"));
      session.set(authenticator.sessionKey, user.id);
      return redirect(redirectTo, {
        headers: { "Set-Cookie": await commitSession(session) },
      });
    }
    default: {
      return json({ errors: { email: "Invalid intent" } }, { status: 400 });
    }
  }

  // return createUserSession({
  //   request,
  //   userId,
  //   remember: remember === "on" ? true : false,
  //   redirectTo,
  // });
}

export const meta: MetaFunction = () => {
  return {
    title: "Login",
  };
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const data = useLoaderData<typeof loader>();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const usernameRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  let usernameError: string | null = null;
  let passwordError: string | null = null;

  React.useEffect(() => {
    if (usernameError) {
      usernameRef.current?.focus();
    } else if (passwordError) {
      passwordRef.current?.focus();
    }
  }, [usernameError, passwordError]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <Form
          method="post"
          className="space-y-6"
          aria-invalid={data.formError ? true : undefined}
          aria-describedby="form-error"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <div className="mt-1">
              <input
                ref={usernameRef}
                id="username"
                autoFocus={true}
                name="username"
                type="username"
                autoComplete="username"
                aria-invalid={usernameError ? true : undefined}
                aria-describedby="username-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />

              {usernameError && (
                <div className="pt-1 text-red-700" id="username-error">
                  {usernameError}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={passwordError ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {passwordError && (
                <div className="pt-1 text-red-700" id="password-error">
                  {passwordError}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="remember"
              className="ml-2 block text-sm text-gray-900"
            >
              Remember me
            </label>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          {data.formError && (
            <div className="pt-1 text-red-700" id="password-error">
              {data.formError}
            </div>
          )}
          <div className="flex items-center justify-between gap-6">
            <button
              type="submit"
              name="intent"
              value="login"
              className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
            >
              Log in
            </button>
            <button
              type="submit"
              name="intent"
              value="signup"
              className="w-full rounded bg-gray-500  py-2 px-4 text-white hover:bg-gray-600 focus:bg-gray-400"
            >
              Sign up
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
