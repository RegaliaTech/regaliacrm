"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    // `redirect: false` — do the sign-in (sets the session cookie) but let us
    // navigate ourselves below. Relying on Auth.js's built-in redirect breaks
    // behind a proxy (Vercel): it issues an HTTP redirect to the credentials
    // callback, which only accepts POST, so the browser's follow-up GET fails
    // with "InvalidProvider". Doing the redirect explicitly avoids that.
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // Re-throw redirect errors so Next.js can handle navigation.
    throw error;
  }

  // Outside the try/catch: redirect() throws NEXT_REDIRECT by design, which
  // must not be swallowed by the AuthError handling above.
  redirect("/dashboard");
}
