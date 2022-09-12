import { Authenticator } from "remix-auth";
import {
  GoogleStrategy,
  FacebookStrategy,
  SocialsProvider,
} from "remix-auth-socials";
import { FormStrategy } from "remix-auth-form";
import invariant from "tiny-invariant";
import { sessionStorage } from "~/services/session.server";
import { verifyLogin } from "~/models/user.server";

// Create an instance of the authenticator
export let authenticator = new Authenticator<string>(sessionStorage, {
  sessionKey: "token",
});
// You may specify a <User> type which the strategies will return (this will be stored in the session)
// export let authenticator = new Authenticator<User>(sessionStorage, { sessionKey: '_session' });

authenticator.use(
  new FormStrategy(async ({ form }) => {
    // Here you can use `form` to access and input values from the form.
    // and also use `context` to access more things from the server
    let username = form.get("username"); // or email... etc
    let password = form.get("password");

    // You can validate the inputs however you want
    invariant(typeof username === "string", "username must be a string");
    invariant(username.length > 0, "username must not be empty");

    invariant(typeof password === "string", "password must be a string");
    invariant(password.length > 0, "password must not be empty");

    // And finally, you can find, or create, the user
    const user = await verifyLogin(username, password);

    if (!user) {
      throw new Error("Invalid Username or Password");
    }

    // And return the user as the Authenticator expects it
    return user.id;
  }),
  FormStrategy.name
);

// authenticator.use(
//   new GoogleStrategy(
//     {
//       clientID: "YOUR_CLIENT_ID",
//       clientSecret: "YOUR_CLIENT_SECRET",
//       callbackURL: `http://localhost:3333/auth/${SocialsProvider.GOOGLE}/callback`,
//     },
//     async ({ profile }) => {
//       // here you would find or create a user in your database
//       return profile;
//     }
//   )
// );

// authenticator.use(
//   new FacebookStrategy(
//     {
//       clientID: "YOUR_CLIENT_ID",
//       clientSecret: "YOUR_CLIENT_SECRET",
//       callbackURL: `https://localhost:3333/auth/${SocialsProvider.FACEBOOK}/callback`,
//     },
//     async ({ profile }) => {
//       // here you would find or create a user in your database
//       return profile;
//     }
//   )
// );
