import { loginAction } from "@/app/login/actions";
import Link from "next/link";

const LoginPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold">Trekker Login</h1>
      <form
        action={loginAction}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <input
          type="text"
          name="email"
          placeholder="email"
          required
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Login
        </button>
      </form>
      <Link href="/register" className="text-blue-500 hover:underline mb-4">
        Register
      </Link>
    </div>
  );
};

export default LoginPage;
