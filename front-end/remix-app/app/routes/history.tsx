import { useLoaderData, Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "Chat History" },
    { name: "description", content: "See Chat History" },
  ];
};


const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type ChatObj = {
  chatId: string;
  timestamp: string;
  role: string;
  content: string;
}


export async function loader() {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_chats/`);
    if (response.ok) {
      const data = await response.json();
      const chats = data.chats.map((chat: any) => { return { chatId: chat.chat_id, timestamp: chat.timestamp, role: chat.role, content: chat.content }; });
      console.log("Chats loaded successfully: ", chats);
      return chats as ChatObj[];
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
          <h1 className="m-auto mt-20 text-3xl font-bold text-gray-800 dark:text-gray-100">
              Jump back into a previous chat
          </h1>
        </div>
        <div className="flex flex-col max-w-5xl mb-20 gap-4 h-fit overflow-y-auto">
          {chats.map((chat) => <Chat key={chat.chatId} chatId={chat.chatId} timestamp={chat.timestamp} role={chat.role} content={chat.content} />)}
        </div>
      </main>
    </div>
  );
}


export function Chat({ chatId, timestamp, role, content }: ChatObj) {
  const displayContent = content.length > 50 ? content.substring(0, 50) + "..." : content;
  const offset = new Date().getTimezoneOffset();
  const displayTimestamp = new Date(new Date(timestamp).getTime() - offset * 60 * 1000).toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  return (
    <Link to={`/fileupload/chat/${chatId}`} className="p-3 flex flex-row gap-4 justify-between text-center bg-zinc-700 border-2 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400">
      <h2>{displayContent}</h2>
      <p>{displayTimestamp}</p>
    </Link>
  );
}