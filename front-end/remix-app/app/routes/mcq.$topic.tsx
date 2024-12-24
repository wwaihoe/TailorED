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
import type { MCQ } from "../types/types";


//const chatModuleURL = "http://chat-module:8001";
const chatModuleURL = "http://localhost:8001";


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
    const response = await fetch(`${chatModuleURL}/evaluate_mcq`, {
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
  const feedbackData = useActionData<MCQ>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const test_data = [
    { question: "What is the capital of France?", options: ["Paris", "London", "Berlin", "Madrid"], answer: "a" },
    { question: "What is the capital of Germany?", options: ["Paris", "London", "Berlin", "Madrid"], answer: "c" },
    { question: "What is the capital of Spain?", options: ["Paris", "London", "Berlin", "Madrid"], answer: "d" },
    { question: "What is the capital of UK?", options: ["Paris", "London", "Berlin", "Madrid"], answer: "b" },
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
          <h1 className="text-2xl font-bold m-auto text-gray-100">MCQ Practice - {params.topic}</h1>
        </header>

        <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
          <div className="w-screen max-w-5xl h-full">
            <Form method="post" ref={formRef} onSubmit={handleSubmit}>
              {test_data.map((question, index) => (
                <div key={index} className="mb-4 flex justify-center">
                  <div className="max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-700 text-white">
                    {question.question}
                    <ul className="list-inside">
                      {question.options.map((option, optionIndex) => (
                        <div className="flex flex-row justify-between">
                          <li key={optionIndex}>{(optionIndex + 10).toString(36).toUpperCase()}. {option}</li>
                          <input type="radio" id={(index*4+optionIndex).toString()} name={`mcq-${index}`} value={(optionIndex + 10).toString(36).toUpperCase()} />
                        </div>
                      ))} 
                    </ul>
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


