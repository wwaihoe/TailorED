import {
  Link,
} from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};


type TaskObj = {
  name: string;
  route?: string;
}

export default function Index() {
  return (
    <div className="flex w-screen h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col gap-9">
          <h1 className="leading text-3xl font-bold text-gray-800 dark:text-gray-100">
            Welcome to <span className="sr-only">TailorED</span>
          </h1>
          <div className="items-start">
            <div className="size-24 flex flex-row items-center">
              <img
                src="/logo.png"
                alt="TailorED"
                className="block w-full object-cover"
              />
              <p className="text-3xl font-light text-white">
                Tailor
              </p>
              <p className="text-3xl font-bold text-red-200">
                ED
              </p>
            </div>
          </div>
        </header>
        <main>
          <div className="grid grid-cols-4 gap-4">
            {tasks.map((task) => <Task key={task.name} name={task.name} route={task.route} />)}
          </div>
        </main>
      </div>
    </div>
  );
}


export function Task({ name, route }: TaskObj) {
  return (
    <Link to={route? route: "/"} className="p-3 text-center bg-zinc-700 border-2 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400">
      <h1>{name}</h1>
    </Link>
  );
}


const tasks = [
  {name: "Chat", route: "/chat/fileupload"},
  {name: "MCQ Practice", route: "/mcq"},
  {name: "SAQ Practice", route: "/saq/create/fileupload"},
  {name: "Summarize Notes", route: "/summarize"},
]