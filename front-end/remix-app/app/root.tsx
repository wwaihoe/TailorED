import {
  Links,
  Link, 
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  LiveReload
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

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


export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {process.env.NODE_ENV === 'development' ? <LiveReload/> : null}
        <div className="flex flex-row">
          <nav className="navbar w-1/6 flex flex-col pt-10 gap-3 bg-zinc-800 border-r-2 border-e-yellow-400 font-sans text-white items-center">
            <div className="size-24">
              <img
                src="/logo.png"
                alt="TailorED"
                className="block w-full object-cover"
              />
            </div>
            <Link to="/" className="text-xl text-center font-semibold hover:bg-zinc-900 hover:text-red-400 p-3 rounded-xl">Home</Link>
            <Link to="/about" className="text-xl text-center font-semibold hover:bg-zinc-900 hover:text-red-400 p-3 rounded-xl">About</Link>
            <Link to="/history" className="text-xl text-center font-semibold hover:bg-zinc-900 hover:text-red-400 p-3 rounded-xl">History</Link>
          </nav>
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  
  );
}
