import { useRef, useState } from "react";
import {
  useLoaderData,
  useParams,
  useFetcher 
} from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { SAQ } from "../types/types";


const chatModuleURLServer = "http://chat-module:8001";
const dataModuleURLServer = "http://data-module:8003";
const chatModuleURLClient = "http://localhost:8001";
const dataModuleURLClient = "http://localhost:8003";


type SAQFeedback = {
  question_id: number;
  input_answer: string;
  feedback: string;
}

type SAQLoadData = {
  topic: string;
  saqs: SAQ[];
  feedbacks: SAQFeedback[];
}

type EvaluateSAQResponse = {
  saq: SAQ;
  input_answer: string;
  feedback: string;
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_saq/${params.id}/`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    else {
      console.log("Failed to load SAQ data.");
      return null;
    }
  }
  catch (error) {
    console.log("Failed to load SAQ data.");
    console.error(error);
    return null;
  }
}


export async function action({
  params,
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();  
  const saqs = formData.get("saqs") as string;
  const saqsJSON = JSON.parse(saqs);
  const length = formData.get("length") as string;
  const additional_info = formData.get("additional_info") as string;
  const evaluate_saqs_request = [];
  for (let i = 0; i < parseInt(length); i++) {
    const saq = {id: saqsJSON[i].id, question: saqsJSON[i].question, correct_answer: saqsJSON[i].correct_answer};  
    const evaluate_saq_request = {saq: saq, input_answer: formData.get(`saq-${i}`), additional_info: additional_info === "true"? true : false};
    evaluate_saqs_request.push(evaluate_saq_request);
  }
  const body = {
    "question_set_id": params.id,
    "evaluate_saqs_request": evaluate_saqs_request
  };
  console.log(body);
  try { 
    const response = await fetch(`${chatModuleURLServer}/evaluate_saqs/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const data = await response.json();
      return json(data);
    }
    else {
      console.log("Failed to generate feedback.");
      return null;
    }
  } catch (error) {
    console.error(error);
    console.log("Failed to generate feedback.");
    return null;
  }

}

export default function SAQ() {
  const data = useLoaderData<typeof loader>() as SAQLoadData;
  const params = useParams();
  const formRef = useRef<HTMLFormElement>(null);
  const fetcher = useFetcher<{ responses: EvaluateSAQResponse[] }>();
  const isSubmitting = fetcher.state === "submitting";

  const [showFeedback, setShowFeedback] = useState<Boolean>(false);

  const handleSubmit = (event: any) => {
    event.preventDefault()
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      submitFormData.append("saqs", JSON.stringify(data.saqs));
      submitFormData.append("length", data.saqs.length.toString());
      fetcher.submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

        <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300">
          <h1 className="text-3xl font-bold m-auto text-black">SAQ Practice - {data.topic}</h1>
        </header>

        <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
          <div className="w-screen max-w-5xl h-full">
            {data.feedbacks && 
              <div className="flex justify-center mb-4">
                <button onClick = {() => setShowFeedback(!showFeedback)} className="p-2 bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-400 rounded-lg text-md">
                  {showFeedback? "Hide Feedback" : "Show Previously Submitted Response"}
                </button>
            </div>}
            {showFeedback ?
            <div>
              {data.saqs.map((question, index) => (
                <div key={index} className="mb-4 flex justify-center">
                  <div className="w-full max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-700 text-white">
                    {question.question}
                    <input type="text" value={data.feedbacks[index].input_answer} disabled name={`saq-${index}`} className="w-full mt-3 bg-zinc-600 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400" placeholder="Type your answer here..."/>
                    <div className="mt-4 flex flex-col gap-1">
                      <div>
                        <p className="">
                          Your answer: {data.feedbacks[index].input_answer}
                        </p>
                        <p className="font-bold">
                          Correct Answer: {question.correct_answer}
                        </p>
                      </div>
                      <p>
                        {data.feedbacks[index].feedback}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            :
            <fetcher.Form method="post" ref={formRef} onSubmit={handleSubmit}>
              {data.saqs.map((question, index) => (
                <div key={index} className="mb-4 flex justify-center">
                  <div className="w-full max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-700 text-white">
                    {question.question}
                    <input type="text" disabled={isSubmitting} name={`saq-${index}`} className="w-full mt-3 bg-zinc-600 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400" placeholder="Type your answer here..."/>
                    {fetcher.data? <div className="mt-4 flex flex-col gap-1">
                      <div>
                        <p className="">
                          Your answer: {fetcher.data.responses[index].input_answer}
                        </p>
                        <p className="font-bold">
                          Correct Answer: {question.correct_answer}
                        </p>
                      </div>
                      <p>
                        {(fetcher.data.responses as any)[index].feedback}
                      </p>
                    </div>: 
                    null}
                  </div>
                </div>
              ))}
              {!isSubmitting ?
              <div className="pb-14 mt-10 flex flex-row justify-center items-center gap-4">
                <div className="flex flex-row gap-1">
                  <input disabled={isSubmitting} type="checkbox" id="additional_info" name="additional_info" value="true"/>
                  <label htmlFor="additional_info">Additional information</label>
                </div>
                <button disabled={isSubmitting} type="submit" className="p-2 bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-400 rounded-lg text-md">Get feedback</button>
              </div>
              :
              <div className="mt-10 pb-14 justify-center items-center flex flex-row gap-1 select-none mb-10">
                <p>Getting Feedback</p>
                <span className="relative flex h-5 w-5 justify-center items-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-white"></span>
                </span>
              </div>}
            </fetcher.Form>
            }
          </div>
        </main>
    </div>
  );
}


