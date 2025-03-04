import { useLoaderData, Link, useFetcher } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";


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

export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData(); 
  const chatId = formData.get("chatId");
  try {
    const response = await fetch(`${dataModuleURLServer}/delete_chat/${chatId}/`, {
      method: "DELETE",
    });
    if (response.ok) {
      console.log("Chat deleted: " + chatId);
    }
    else {
      console.error("Failed to delete chat.");
    }
  }
  catch (error) {
    console.error("Failed to delete chat.");
    console.error(error);
  } 
  return null;
}


export default function History() {
  const chats = useLoaderData<typeof loader>() as ChatObj[];

  return (
    <div className="flex flex-col w-screen h-screen items-center bg-zinc-900">
      <main className="flex flex-col items-center gap-10 h-full">
        <header className="bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
          <h1 className="m-auto mt-20 text-3xl font-bold text-transparent">
            Jump back into a previous chat
          </h1>
        </header>
        <div className="flex flex-col max-w-3xl w-full mb-20 gap-4 overflow-y-auto">
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
  
  const fetcher = useFetcher();

  return (
    <div className="relative">
      <Link to={`/fileupload/chat/${chatId}`} className="py-3 pl-3 pr-9 flex flex-row gap-4 justify-between text-center bg-zinc-800 border border-zinc-700 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400">
        <h2>{displayContent}</h2>
        <div className="flex flex-row gap-1 text-sm text-center items-center">
          <p>{displayTimestamp}</p>
        </div>
      </Link>
      <fetcher.Form method="post" className="flex absolute top-0 right-0 p-3 mt-1 text-sm text-center items-center">
        <input type="hidden" name="chatId" value={chatId} />
        <button type="submit" className="text-center items-center select-none pb-0.5 px-2 rounded-full text-white hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-300">x</button> 
      </fetcher.Form>
    </div>
  );
}