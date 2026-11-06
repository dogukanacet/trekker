import { CredentialsSignin } from "next-auth";

// Thrown from authorize() so the login form can tell "slow down" apart from "wrong password".
export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}
