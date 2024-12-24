import { useState, useEffect, useRef } from "react";
import {
  Link,
  Form,
  useActionData,
  useNavigation,
  useSubmit 
} from "@remix-run/react";
import type { MCQ } from "../types/types";


//const chatModuleURL = "http://chat-module:8001";
//const retrievalModuleURL = "http://retrieval-module:8002";
const chatModuleURL = "http://0.0.0.0:8001";
const retrievalModuleURL = "http://0.0.0.0:8002";

type TopicObj = {
  name: string;
  route?: string;
}

type FileListing = {
  name: string;
  size: number;
}

export default function MCQ() {
  const [input, setInput] = useState("");
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [files, setFiles] = useState<FileListing[]>([]);

  const handleUpload = async(event: any) => {
    event.preventDefault();
    const file = event.target.files[0];
    console.log("Uploaded: " + file.name);
    const formData = new FormData();
    formData.append("document", file);
    try {
      const response = await fetch(`${retrievalModuleURL}/upload`, {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        console.log("File uploaded.");
      }
    } catch (error) {
      console.log("Failed to upload file.");
      console.error(error)
    }
  };

  const handleSubmit = (event: any) => {
    event.preventDefault();
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      submitFormData.append("userID", "ABC123");
      submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-yellow-400 to-red-400">
        <h1 className="text-2xl font-bold m-auto text-gray-100">Create MCQ</h1>
      </header>
      <main className="h-[90%] w-[90%] m-5 justify-center flex">
        <Form method="post" preventScrollReset onSubmit={handleSubmit} ref={formRef} className="flex flex-col justify-center content-center items-center max-w-4xl w-full h-fit">
          {!isSubmitting? 
          <div className="flex flex-col gap-5 w-full bg-zinc-700 m-5 border-t border-zinc-500 rounded-lg p-3 h-full">
            <div className="p-4 w-full h-fit bg-zinc-800 border-t border-zinc-700 rounded-lg mx-auto flex flex-col gap-3">
              <label htmlFor="document">Upload documents here:</label>
              <input type="file" id="document" name="document" accept="application/pdf" className="mt-2 text-sm text-grey-500 truncate text-pretty
              file:mr-2 file:py-2 file:px-3
              file:rounded-full file:border-0
              file:text-sm file:font-medium
              file:bg-red-400 file:text-white
              hover:file:cursor-pointer hover:file:bg-red-500"
              onChange={handleUpload}/>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">PDF or TXT.</p>
              <ul>
                {files.map((file, index) => (
                  <li key={index} className="mt-2 text-sm text-grey-500">{file.name} ({file.size} bytes)</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="query"
                value={input}
                ref={inputRef}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-zinc-600 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-red-400 w-full max-w-4xl"
                placeholder="Type the topic for MCQs..."
              />
              <button type="submit"
                className="px-6 py-3 bg-red-400 rounded-md text-white hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-400"
              >
                Create MCQs
              </button>
            </div>
          </div>
            :
          <div>
            <input
              disabled
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-zinc-700 text-gray-500 rounded-md p-3 focus:outline-none focus:ring focus:ring-red-400 w-full max-w-4xl"
              placeholder="Type the topic for MCQs..."
            />
            <button disabled 
            className="px-6 py-3 bg-gray-700 rounded-md text-white"
            >
              Create MCQs
            </button>
          </div>
          }
        </Form>        
      </main>
    </div>
  );
}