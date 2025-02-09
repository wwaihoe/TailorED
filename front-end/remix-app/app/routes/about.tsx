import type { MetaFunction } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "TailorED" },
    { name: "description", content: "About TailorED!" },
  ];
};


export default function About() {
  return (
    <div className="flex w-screen h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
            About TailorED
          </h1>
        </header>
        <nav className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
          <p className="leading-6 text-gray-700 dark:text-gray-200">
            What is TailorED?
          </p>
        </nav>
      </div>
    </div>
  );
}