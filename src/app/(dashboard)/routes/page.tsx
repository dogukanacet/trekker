import { prisma } from "@/lib/prisma";
import * as routeActions from "@/app/(dashboard)/routes/actions";
import RouteRow from "@/app/(dashboard)/routes/RouteRow";
import Link from "next/link";
import { auth } from "@/lib/auth";

const RoutesPage = async () => {
  const session = await auth();
  const depotList = await prisma.depot.findMany({
    where: { tenantId: session?.user?.tenantId },
  });
  const routeList = await prisma.route.findMany({
    where: { depot: { tenantId: session?.user?.tenantId } },
  });

  const routes = routeList.map((route) => (
    <RouteRow key={route.id} route={route} depotList={depotList} />
  ));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Link href="/" className="text-blue-500 hover:underline mb-4">
        Home
      </Link>
      <h1 className="text-3xl font-bold">Trekker Routes</h1>
      <div className="mt-2 text-gray-600">
        route list:{" "}
        {routes.length ? <ul className="list-disc pl-5">{routes}</ul> : "No routes found."}
      </div>
      <form
        action={routeActions.createRoute}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="name"
          placeholder="Route Name"
          required
        />
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="depotId"
          required
        >
          {depotList.map((depot) => (
            <option key={depot.id} value={depot.id}>
              {depot.name}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Add Route
        </button>
      </form>
    </main>
  );
};

export default RoutesPage;
