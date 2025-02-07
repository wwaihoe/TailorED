import { useLoaderData, Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};


const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type ChatObj = {
  chatId: string;
  timestamp: string;
  message: string;
}


export async function loader() {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_chats/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Chats loaded successfully: ", data.chats);
      return data.chats;
    }
    else {
      console.error("Failed to load chats.");
      return [];
    }
  }
  catch (error) {
    console.error("Failed to load chats.");
    console.error(error);
    return [];
  }
}


export default function History() {
  const chats = useLoaderData<typeof loader>() as ChatObj[];

  return (
    <div className="flex w-screen h-screen items-center justify-center bg-zinc-900">
      <main className="flex flex-col items-center justify-center gap-10">
        <div className="flex flex-col gap-7">
          <h1 className="leading text-3xl font-bold text-gray-800 dark:text-gray-100">
              Jump back into a previous chat
          </h1>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {chats.map((chat) => <Chat key={chat.chatId} chatId={chat.chatId} timestamp={chat.timestamp} message={chat.message} />)}
        </div>
      </main>
    </div>
  );
}


export function Chat({ chatId, timestamp, message }: ChatObj) {
  return (
    <Link to={`/chat/${chatId}`} className="p-3 text-center bg-zinc-700 border-2 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400">
      <h2>{message}</h2>
    </Link>
  );
}