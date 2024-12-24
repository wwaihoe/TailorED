import { useState, useEffect, useRef } from "react";
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  useLoaderData, 
  useFetcher,
} from "@remix-run/react";
import type { ActionFunctionArgs   } from "@remix-run/node";
import { json } from "@remix-run/node";

//const chatModuleURL = "http://chat-module:8001";
//const retrievalModuleURL = "http://retrieval-module:8002";
const chatModuleURL = "http://localhost:8001";
const retrievalModuleURL = "http://localhost:8000";

type Message = {
  role: string;
  content: string;
};

type FileListing = {
  name: string;
  size: number;
}

type FileObjectProps = {
  name: string;
  size: number;
}

export async function loader() {
  try {
    const response = await fetch(`${retrievalModuleURL}/load`);
    if (response.ok) {
      const data = await response.json();
      const filesizes = data.filesizes
      console.log("Files loaded: " + filesizes);
      const files = filesizes.map((file: any) => {
        return { name: file.name, size: file.size };
      });
      return files;
    }
    else {
      console.error("Failed to load files.");
      return [];
    }
  } catch (error) {
    console.log("Failed to load files.");
    console.error(error);
    return [];
  } 
}

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
      return json({ role: "assistant", content: data.content, filenames: data.filenames });
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
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const data = useActionData<Message>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const initialFiles = useLoaderData<FileListing[]>();
  const [files, setFiles] = useState<FileListing[]>(initialFiles);
  const fetcher = useFetcher();
  useEffect(() => {
    if (fetcher.data) {
      setFiles(fetcher.data as FileListing[]);
    }
  }, [fetcher.data]);

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      submitFormData.append("messages", JSON.stringify(messages));
      submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  useEffect(() => {
    if (data) {
      setMessages((prev) => [
        ...prev,
        { role: data.role, content: data.content },
      ]);
    }
  }, [data]);

  useEffect(() => {
    if (!isSubmitting) {
      setInput("");
      inputRef.current?.focus();
    }
  }, [isSubmitting]);

  const [fileInput, setFileInput] = useState<string | null>(null);
  const handleFileInput = (event: any) => {
    event.preventDefault();
    const file = event.target.files[0];
    console.log("Selected: " + file.name);
    setFileInput(file.name);
  };

  const handleUpload = async(event: any) => {
    event.preventDefault();
    const file = event.target.files[0];
    console.log("Uploaded: " + file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${retrievalModuleURL}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data"
        },
        body: formData
      });
      if (response.ok) {
        console.log("File uploaded.");
      }
    } catch (error) {
      console.log("Failed to upload file.");
      console.error(error)
    }
    setFileInput(null);
  };


  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

        <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-yellow-400 to-red-400">
          <h1 className="text-2xl font-bold m-auto text-gray-100">Chat</h1>
        </header>

        <main className="flex flex-row w-full h-[90%] bg-zinc-900">
          <div className="flex flex-col w-4/5 mx-5 overflow-y-auto p-6 bg-zinc-900">
            <div className="h-full">
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
            </div>
            <div className="p-4 w-full max-w-[60%] bg-zinc-800 border-t border-zinc-700 rounded-lg flex absolute bottom-0 ">
              <Form method="post" preventScrollReset onSubmit={handleSubmit} ref={formRef} className="w-full max-w-5xl flex flex-row gap-3">
                {!isSubmitting? 
                <input
                  type="text"
                  name="query"
                  value={input}
                  ref={inputRef}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-zinc-700 text-gray-200 rounded-md p-3 focus:outline-none focus:ring focus:ring-red-400 w-full max-w-4xl"
                  placeholder="Type your message..."
                /> :
                <input
                  disabled
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-zinc-700 text-gray-500 rounded-md p-3 focus:outline-none focus:ring focus:ring-red-400 w-full max-w-4xl"
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
              </Form>            
            </div>
          </div>
          <div className="w-1/5 bg-zinc-700 m-3 border-t border-zinc-500 rounded-lg p-3 items-start h-fit mt-6">
            <label htmlFor="document">Upload documents here:</label>
            <input type="file" id="document" name="document" accept="application/pdf" className="mt-2 text-sm text-grey-500 truncate text-pretty
            file:mr-2 file:py-2 file:px-3
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-red-400 file:text-white
            hover:file:cursor-pointer hover:file:bg-red-500"
            onChange={handleFileInput} />
            {fileInput &&
            <button onClick={handleUpload} className="mt-2 py-2 px-3 text-sm font-medium bg-red-400 rounded-lg text-white hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-400">
              Upload File
            </button>
            }
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">PDF or TXT.</p>
            <ul>
              {files.map((file, index) => (
                <li key={index} className="mt-2 text-sm text-grey-500"><FileObject name={file.name} size={file.size}/></li>
              ))}
            </ul>
          </div>
        </main>
        
    </div>
  );
}

export function FileObject( {name, size}: FileObjectProps ) {
  const deleteFile = async(filename: string) => {
    try {
      const response = await fetch(`${retrievalModuleURL}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ filename: filename })
      });
      if (response.ok) {
        console.log("File deleted: " + filename);
      }
      else {
        console.error("Failed to delete file: " + filename);
      }
    } catch (error) {
      console.error("Failed to delete file: " + filename);
      console.error(error);
    }
  }
  
  return (
    <div>
      <p>{name}</p>
      <p>{size}</p>
      <button onClick={() => deleteFile(name)}>X</button>
    </div>
  );
}