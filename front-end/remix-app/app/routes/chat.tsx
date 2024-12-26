import { useState, useEffect, useRef } from "react";
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  useLoaderData, 
  useFetcher,
  Outlet,
} from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

//const chatModuleURL = "http://chat-module:8001";
//const retrievalModuleURL = "http://retrieval-module:8002";
const chatModuleURL = "http://localhost:8001";
const retrievalModuleURL = "http://localhost:8000";

type Message = {
  role: string;
  content: string;
};


export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();  
  const query = formData.get("query") as string;
  const prevMessages = formData.get("messages");
  const prevMessageJSON = prevMessages ? JSON.parse(prevMessages as string) : [];
  const inputMessages = [...prevMessageJSON, { role: "user", content: query }];
  try {
    const response = await fetch(`${chatModuleURL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: inputMessages }),
    });
    if (response.ok) {
      const data = await response.json();
      return json({ role: "assistant", content: data.output.answer, filenames: data.filenames });
    }
    else {
      return json({ role: "assistant", content: "Failed to generate response.", filenames: [] });
    }
  } catch (error) {
    console.error(error);
    return json({ role: "assistant", content: "Failed to generate response.", filenames: [] });
  }

}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      submitFormData.append("messages", JSON.stringify(messages));
      fetcher.submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  useEffect(() => {
    if (fetcher.data) {
      setMessages((prev) => [
        ...prev,
        { role: (fetcher.data as Message).role, content: (fetcher.data as Message).content },
      ]);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (!isSubmitting) {
      setInput("");
      inputRef.current?.focus();
    }
  }, [isSubmitting]);


  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

        <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-yellow-400 to-red-400">
          <h1 className="text-2xl font-bold m-auto text-gray-100">Chat</h1>
        </header>

        <main className="flex flex-row w-full h-[90%] bg-zinc-900">
          <div className="flex flex-col w-2/3 mx-5 overflow-y-auto p-6 bg-zinc-900">
            <div className="h-full w-5/6 self-center">
              {messages.length === 0 && (
                <p className="text-center text-gray-400">
                  No messages yet. Start chatting!
                </p>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-screen-md p-4 rounded-md ${
                      msg.role === "user"
                        ? "bg-zinc-700 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSubmitting && <div className="flex select-none">
                <div className="rounded-full h-5 w-5 bg-white animate-ping"></div>
              </div>}
            </div>
            <div className="p-4 self-center w-full max-w-[50%] bg-zinc-800 border-t border-zinc-700 rounded-lg flex flex-row absolute bottom-0 justify-center">
              <fetcher.Form method="post" preventScrollReset onSubmit={handleSubmit} ref={formRef} className="w-full flex flex-row gap-3">
                {!isSubmitting? 
                <input
                  type="text"
                  name="query"
                  value={input}
                  ref={inputRef}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-zinc-700 text-gray-200 rounded-md p-3 focus:outline-none focus:ring focus:ring-red-400 w-full"
                  placeholder="Type your message..."
                /> :
                <input
                  disabled
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-zinc-700 text-gray-500 rounded-md p-3 focus:outline-none focus:ring focus:ring-red-400 w-full"
                  placeholder="Type your message..."
                />
                }
                {!isSubmitting? 
                <button type="submit"
                  className="px-6 py-3 bg-red-400 rounded-md text-white hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-400"
                >
                  Send
                </button> :
                <button disabled 
                className="px-6 py-3 bg-gray-700 rounded-md text-white"
                >
                  Send
                </button>
                }
              </fetcher.Form>            
            </div>
          </div>
          <Outlet/>
          
        </main>
        
    </div>
  );
}

