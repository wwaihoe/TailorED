import { useState, useEffect, useRef } from "react";
import { useParams, useLoaderData, useFetcher, Link } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import Markdown from 'markdown-to-jsx'
import type { MetaFunction } from "@remix-run/node";
import { v4 as uuidv4 } from 'uuid';
import Accordion from "../components/accordion";


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
  reason: string | null;
  content: string;
};

type ChatLoadData = {
  messages: Message[];
}

type ChatResponse = {
  reason: string;
  answer: string;
  filenames: string[];
  timestamp: string;
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
  try {
    const response = await fetch(`${chatModuleURLServer}/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: inputMessagesJSON, chat_id: params.id, timestamp: message.timestamp }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log("Response generated successfully");
      return data as ChatResponse;
    }
    else {
      return { reason: "", answer: "Failed to generate response.", filenames: [], timestamp: "" } as ChatResponse;
    }
  } catch (error) {
    console.error(error);
    return { reason: "", answer: "Failed to generate response.", filenames: [], timestamp: "" } as ChatResponse;
  }

}

export default function Chat() {
  const params = useParams();
  const data = useLoaderData<typeof loader>() as ChatLoadData;

  const [messages, setMessages] = useState<Message[]>(data.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const message = { timestamp: new Date(Date.now()).toISOString(), role: "user", reason: null, content: input };
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
      const chatResponse = fetcher.data as ChatResponse;
      const message = { timestamp: chatResponse.timestamp, role: "assistant", reason: chatResponse.reason, content: chatResponse.answer }; 
      console.log("Assistant message: ", message);
      setMessages((prev) => [...prev, message]);
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

  const handleAccordionToggle = () => {
    const scrollDiv = scrollableDivRef.current;
    if (scrollDiv) {
        const scrollTopBefore = scrollDiv.scrollTop; // Get scroll position before accordion opens
        setTimeout(() => {
            scrollDiv.scrollTop = scrollTopBefore; // Restore scroll position after accordion opens (after re-render)
        }, 0); // Use setTimeout to execute after the accordion content is rendered
    }
  };


  return (
    <div className="flex flex-col h-full w-3/4 bg-zinc-900 mx-5">
      <div className="flex flex-col h-full w-full overflow-y-auto relative justify-between mx-5" ref={scrollableDivRef}>
        <div className="h-full w-3/4 self-center">
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
                    ? "bg-zinc-800"
                    : "bg-transparent border border-zinc-800"
                }`}
              >
                <div className="flex flex-col gap-2">
                  {msg.role === "assistant" && msg.reason &&
                    <Accordion text={msg.reason} onToggle={handleAccordionToggle} />
                  }
                  <div className="prose prose-zinc dark:prose-invert prose-base text-white">
                    <Markdown options={{ wrapper: 'article' }}>
                    {msg.content}
                    </Markdown>
                  </div>
                  {msg.role === "assistant" && msg.content !== "Failed to generate response." && 
                    <button onClick={() => navigator.clipboard.writeText(msg.content)} className="w-fit p-1 bg-transparent border border-zinc-700 hover:bg-zinc-600 hover:text-white rounded-md focus:outline-none focus:ring focus:ring-white select-none">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                      </svg>
                    </button>}
                </div>
              </div>
            </div>
          ))}
          {isSubmitting && <div className="flex select-none">
            <div className="rounded-full h-5 w-5 bg-blue-300 animate-ping"></div>
          </div>}
          <div ref={bottomRef} className="h-8 select-none"></div>
        </div>
      </div>
      <div className="flex flex-col ml-5">
        <div className="p-4 self-center w-full max-w-[75%] bg-zinc-800 border-t border-zinc-700 rounded-lg flex flex-row gap-3 justify-center">
          <Link to={`/fileupload/chat/${uuidv4()}`} reloadDocument className="p-3 rounded-md text-white hover:bg-zinc-600 hover:text-white focus:outline-none focus:ring focus:ring-white select-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
          <fetcher.Form method="post" preventScrollReset onSubmit={(e) => handleSubmit(e)} ref={formRef} className="w-full flex flex-row gap-3 select-none">
            {!isSubmitting ? 
            <textarea
              name="query"
              value={input}
              ref={inputRef}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 resize-none bg-zinc-700 text-gray-200 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400 w-full overflow-y-auto"
              placeholder="Type your message..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            /> :
            <textarea
              disabled
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 resize-none bg-zinc-700 text-gray-500 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400 w-full"
              placeholder="Type your message..."
              rows={1}
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
    </div>   
  );
}

