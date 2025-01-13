import { useState, useEffect, useRef } from "react";
import {
  Link,
} from "@remix-run/react";

type SummaryObj = {
  name: string;
  route?: string;
}

export default function Summarize() {
  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-yellow-400 to-red-400">
        <h1 className="text-2xl font-bold m-auto text-gray-100">Summarize</h1>
      </header>
      <main className="flex flex-col justify-center content-center items-center h-[90%] w-[90%] m-5 gap-6">
        <div className="grid grid-cols-4 gap-4">
          {summaries.map((summary) => <SummaryTile key={summary.name} name={summary.name} route={summary.route} />)}
        </div>
        <Link to={"/summarize/create"} className="px-6 py-3 bg-red-400 rounded-xl border-2 border-zinc-300 text-white hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-400">
          Summarize Your Notes
        </Link>
      </main>
    </div>
  );
}

export function SummaryTile({ name, route }: SummaryObj) {
  return (
    <Link to={route? route: "/"} className="p-3 text-center bg-zinc-700 border-2 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-red-400">
      <h1>{name}</h1>
    </Link>
  );
}

const summaries = [
  {name: "Linear Algebra AY23/24", route: "/summarize/linearalgebraay2324"},
  {name: "Quantum Physics", route: "/summarize/quantumphysics"},
  {name: "Financial Services", route: "/summarize/financialservices"},
]