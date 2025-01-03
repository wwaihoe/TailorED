import { useState, useEffect, useRef } from "react";
import {
  Link,
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  Outlet 
} from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";


//const chatModuleURL = "http://chat-module:8001";
//const retrievalModuleURL = "http://retrieval-module:8002";
const chatModuleURL = "http://localhost:8001";
const retrievalModuleURL = "http://localhost:8002";


export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();  
  const topic = formData.get("topic") as string;
  try {
      const response = await fetch(`${chatModuleURL}/generate_mcq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic: topic }),
      });
      if (response.ok) {
        const data = await response.json();
        return;
      }
      else {
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
}

export default function MCQCreate() {
  const [input, setInput] = useState("");
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  

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
          <div className="flex flex-col gap-5 w-full bg-zinc-700 m-5 border-t border-zinc-500 rounded-lg p-5 h-full">
            <Outlet />
            {!isSubmitting? 
            <div className="flex flex-col gap-3">
              <input
                disabled={isSubmitting}
                type="text"
                name="topic"
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
            :
            <div className='select-none flex space-x-2 justify-center items-center mb-5'>
              <span className='sr-only'>Loading...</span>
              <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
              <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
              <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
            </div>
            }
          </div>
        </Form>        
      </main>
    </div>
  );
}