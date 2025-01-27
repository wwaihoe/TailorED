import { useState, useRef } from "react";
import {
  Form,
  useNavigation,
  useSubmit,
  Outlet 
} from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";


const chatModuleURLServer = "http://chat-module:8001";
const chatModuleURLClient = "http://localhost:8001";


export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();  
  const topic = formData.get("topic") as string;
  const difficulty = parseInt(formData.get("difficulty") as string);
  try {
      const response = await fetch(`${chatModuleURLServer}/generate_mcq/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic: topic, difficulty: difficulty }),
      });
      if (!response.ok) {
        console.log("Failed to create MCQs");
      }
    } catch (error) {
      console.error(error);
    }
    return redirect(`/mcq`);
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
      submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300">
        <h1 className="text-2xl font-bold m-auto text-black">Create MCQ</h1>
      </header>
      <main className="flex h-[90%] w-[90%] justify-center">
        <div className="m-5 flex flex-col bg-zinc-700 border-t border-zinc-500 rounded-lg p-5 max-w-2xl w-full h-fit">
          <Outlet />
          <Form method="post" preventScrollReset onSubmit={(e) => handleSubmit(e)} ref={formRef} className="flex flex-col justify-center content-center items-center h-fit p-3">
            <div className="flex flex-col gap-5 h-full w-full"> 
              {!isSubmitting? 
              <div className="flex flex-col gap-3">
                <div className="flex flex-row gap-3">
                  <input
                    disabled={isSubmitting}
                    type="text"
                    name="topic"
                    value={input}
                    ref={inputRef}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-2/3 flex bg-zinc-600 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400"
                    placeholder="Type the topic for MCQs..."
                  />
                  <select
                    disabled={isSubmitting}
                    name="difficulty"
                    className="w-1/3 flex bg-zinc-600 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400"
                  >
                    <option value="1">Easy</option>
                    <option value="2">Medium</option>
                    <option value="3">Hard</option>
                  </select>
                </div>
                <button type="submit"
                  className="px-6 py-3 bg-blue-400 rounded-md text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-white"
                >
                  Create MCQs
                </button>
              </div>
              :
              <div className='select-none flex space-x-2 justify-center items-center mt-5'>
                <span className='sr-only'>Loading...</span>
                <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
                <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
                <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
              </div>
              }
            </div>
          </Form> 
        </div>      
      </main>
    </div>
  );
}