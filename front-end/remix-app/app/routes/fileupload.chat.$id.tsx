import { useState, useEffect, useRef } from "react";
import { useParams, useLoaderData, useFetcher, Link } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import Markdown from 'markdown-to-jsx'
import type { MetaFunction } from "@remix-run/node";
import { v4 as uuidv4 } from 'uuid';


export const meta: MetaFunction = () => {
  return [
    { title: "TailorED Chat" },
    { name: "description", content: "Chat with TailorED!" },
  ];
};


const chatModuleURLServer = "http://chat-module:8001";
const chatModuleURLClient = "http://localhost:8001";
const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type Message = {
  timestamp: string;
  role: string;
  content: string;
};

type ChatLoadData = {
  messages: Message[];
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_messages/${params.id}/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Messages loaded successfully: ", data.messages);
      return data;
    }
    else {
      console.error("Failed to load messages.");
      return [];
    }
  }
  catch (error) {
    console.error("Failed to load messages.");
    console.error(error);
    return [];
  }
}


export async function action({
  request,
  params
}: ActionFunctionArgs) {
  const formData = await request.formData(); 
  const inputMessages = formData.get("messages");
  const inputMessagesJSON = inputMessages ? JSON.parse(inputMessages as string) : [];
  console.log("Input messages: ", inputMessagesJSON);

  // save message to db
  const message = inputMessagesJSON[inputMessagesJSON.length - 1];
  const saveMessageBody = { chat_id: params.id, timestamp: message.timestamp, role: message.role, content: message.content };
  console.log("Save message body: ", saveMessageBody);
  try {
    const response = await fetch(`${dataModuleURLServer}/save_message/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(saveMessageBody),
    });
    if (!response.ok) {
      console.error("Failed to save message.");
    }
    else {
      console.log("User message saved successfully.");
    }
  }
  catch (error) {
    console.error("Failed to save message.");
    console.error(error);
  }
  
  // generate response
  console.log("Generating response...");
  // include only role and content
  inputMessagesJSON.forEach((message: any) => {
    delete message.timestamp;
  });
  try {
    const response = await fetch(`${chatModuleURLServer}/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: inputMessagesJSON, chat_id: params.id, timestamp: new Date(Date.now()).toISOString() }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log("Response generated successfully");
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
  const params = useParams();
  const data = useLoaderData<typeof loader>() as ChatLoadData;
  

  const [messages, setMessages] = useState<Message[]>(data.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const message = { timestamp: new Date(Date.now()).toISOString(), role: "user", content: input };
    console.log("User message: ", message);
    setMessages((prev) => [...prev, message]);
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      const requestMessages = [...messages, message];
      submitFormData.append("messages", JSON.stringify(requestMessages));
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
        { timestamp: (fetcher.data as Message).timestamp, role: (fetcher.data as Message).role, content: (fetcher.data as Message).content },
      ]);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!isSubmitting) {
      setInput("");
      inputRef.current?.focus();
    }
  }, [isSubmitting]);


  return (
    <div className="flex flex-col w-3/4 mx-5 overflow-y-auto p-6 bg-zinc-900">
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
                  ? "bg-zinc-700"
                  : "bg-gray-700"
              }`}
            >
              <div className="prose prose-zinc dark:prose-invert prose-base text-white">
                <Markdown options={{ wrapper: 'article' }}>
                {msg.content}
                </Markdown>
              </div>
              
            </div>
          </div>
        ))}
        {isSubmitting && <div className="flex select-none">
          <div className="rounded-full h-5 w-5 bg-blue-300 animate-ping"></div>
        </div>}
        <div ref={bottomRef} className="h-28 select-none"></div>
      </div>
      <div className="p-4 self-center w-full max-w-[50%] bg-zinc-800 border-t border-zinc-700 rounded-lg flex flex-row gap-3 absolute bottom-0 justify-center">
        <Link to={`/fileupload/chat/${uuidv4()}`} reloadDocument className="p-3 rounded-md text-white hover:bg-zinc-600 hover:text-blue-500 focus:outline-none focus:ring focus:ring-white select-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
        <fetcher.Form method="post" preventScrollReset onSubmit={(e) => handleSubmit(e)} ref={formRef} className="w-full flex flex-row gap-3 select-none">
          {!isSubmitting ? 
          <input
            type="text"
            name="query"
            value={input}
            ref={inputRef}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-zinc-700 text-gray-200 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400 w-full"
            placeholder="Type your message..."
          /> :
          <input
            disabled
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-zinc-700 text-gray-500 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400 w-full"
            placeholder="Type your message..."
          />
          }
          {!isSubmitting ? 
          <button type="submit"
            className="px-6 py-3 bg-blue-400 rounded-md text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button> :
          <button disabled 
          className="px-6 py-3 bg-gray-700 rounded-md text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
          }
        </fetcher.Form>            
      </div>
    </div>   
  );
}

