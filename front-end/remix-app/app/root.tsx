import {
  Links,
  Link, 
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  MetaFunction,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { v4 as uuidv4 } from 'uuid';

import styles from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: styles,
  },
];

export const meta: MetaFunction = () => {
  return [
    { name: "TailorED", content: "Personalised Education with AI" },
  ]
};


export default function App() {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap" rel="stylesheet"/>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="flex flex-row">
          <nav className="navbar w-[12.5%] flex flex-col pt-10 gap-7 bg-zinc-800 font-sans text-white items-center">
            <Link to="/">
              <div className="flex flex-row select-none">
                <p className="text-3xl font-light text-white">
                  Tailor
                </p>
                <p className="text-3xl font-bold text-red-200">
                  ED
                </p>
              </div>
            </Link>
            <div className="flex flex-col items-center">
              <Link to="/about" className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">About</Link>
              <Link to={`/fileupload/chat/${uuidv4()}`} className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">Chat</Link>
              <Link to="/history" className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">Chat History</Link>
              <Link to="/mcq" className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">MCQ</Link>
              <Link to="/saq" className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">SAQ</Link>
              <Link to="summarize" className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">Summarize</Link>
              <Link to="/studyplan" className="w-fit text-lg text-center font-semibold hover:text-blue-400 p-3 rounded-xl">Study Plan</Link>
            </div>
            </nav>
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  
  );
}
