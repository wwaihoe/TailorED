import { useState, useEffect, useRef } from "react";
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useParams,
  useSubmit 
} from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { SAQ } from "../types/types";


//const chatModuleURL = "http://chat-module:8001";
//const retrievalModuleURL = "http://retrieval-module:8002";
const chatModuleURL = "http://localhost:8001";
const retrievalModuleURL = "http://localhost:8002";


export async function loader({
  params,
}: LoaderFunctionArgs) {
  return 1;
}


export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();  
  const questions = formData.get("questions") as string;
  const questionsJSON = JSON.parse(questions);
  const length = formData.get("length") as string;
  const inputs = [];
  for (let i = 0; i < parseInt(length); i++) {
    const entry = {question: questionsJSON[i].question, options: questionsJSON[i].options, answer: questionsJSON[i].answer, response: formData.get(`mcq-${i}`)};
    inputs.push(entry);
  }
  try {
    const response = await fetch(`${chatModuleURL}/evaluate_saq/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: inputs }),
    });
    if (response.ok) {
      const data = await response.json();
      return json(data);
    }
    else {
      alert("Failed to generate feedback.");
      return null;
    }
  } catch (error) {
    console.error(error);
    alert("Failed to generate feedback.");
    return null;
  }

}

export default function MCQ() {
  const params = useParams();
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackData = useActionData<SAQ>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const test_data = [
    { question: "What is the capital of France?", answer: "Paris"},
    { question: "What is the capital of Germany?", answer: "Berlin"},
    { question: "What is the capital of Spain?", answer: "Madrid"},
    { question: "What is the capital of UK?", answer: "London"},
  ]

  const handleSubmit = (event: any) => {
    event.preventDefault()
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      submitFormData.append("questions", JSON.stringify(test_data));
      submitFormData.append("length", test_data.length.toString());
      submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

        <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-yellow-400 to-red-400">
          <h1 className="text-2xl font-bold m-auto text-gray-100">SAQ Practice - {params.topic}</h1>
        </header>

        <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
          <div className="w-screen max-w-5xl h-full">
            <Form method="post" ref={formRef} onSubmit={handleSubmit}>
              {test_data.map((question, index) => (
                <div key={index} className="mb-4 flex justify-center">
                  <div className="flex flex-col gap-2 max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-700 text-white">
                    {question.question}
                    <input type="text" name={`saq-${index}`} className="p-2 bg-zinc-800 rounded-md mt-2 text-lg" />
                  </div>
                </div>
              ))}
              <div className="mb-4 flex justify-center">
                <button type="submit" className="p-2 bg-red-400 rounded-md mt-2 text-lg">Get feedback</button>
              </div>
            </Form>
          </div>
        </main>
    </div>
  );
}


