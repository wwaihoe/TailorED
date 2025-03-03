import { useRef, useState, useEffect } from "react";
import { useLoaderData, useParams, useFetcher } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import type { SAQ } from "../types/types";


export const meta: MetaFunction = () => {
  return [
    { title: "SAQ Practice" },
    { name: "description", content: "Practice SAQs" },
  ];
};


const chatModuleURLServer = "http://chat-module:8001";
const dataModuleURLServer = "http://data-module:8003";
const chatModuleURLClient = "http://localhost:8001";
const dataModuleURLClient = "http://localhost:8003";


type SAQFeedback = {
  question_id: number;
  input_answer: string;
  feedback: string;
  score: number;
}

type SAQLoadData = {
  topic: string;
  saqs: SAQ[];
  feedbacks: SAQFeedback[];
  total_score: number;
}

type SAQEvaluation = {
  saq: SAQ;
  input_answer: string;
  feedback: string;
  score: number;
}

type EvaluateSAQResponse = {
  responses: SAQEvaluation[];
  total_score: number;
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_saq/${params.id}/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Retrieved SAQ data: ", data);
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
  const additional_info = formData.get("additional_info");
  const evaluate_saqs_request = [];
  for (let i = 0; i < parseInt(length); i++) {
    const saq = {id: saqsJSON[i].id, question: saqsJSON[i].question, reason: saqsJSON[i].reason, correct_answer: saqsJSON[i].correct_answer};  
    const evaluate_saq_request = {saq: saq, input_answer: formData.get(`saq-${i}`), additional_info: additional_info !== null ? true : false};
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
      return data;
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
  const fetcher = useFetcher<EvaluateSAQResponse>();
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

  useEffect(() => {
      if (fetcher.data) {
        setShowFeedback(true);
      }
    }, [fetcher.data]);
  

  return (
    <div className="flex w-full h-screen">
      {data && data.saqs && data.saqs.length > 0 ? (
        <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
          
            <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
              <h1 className="text-4xl font-extrabold m-auto text-transparent">SAQ Practice - {data.topic}</h1>
            </header>

            <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
              <div className="w-screen max-w-5xl h-full">
                {(fetcher.data || data.feedbacks) && 
                <div className="flex justify-center mb-4">
                  <button onClick = {() => setShowFeedback(!showFeedback)} className="p-2 bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-400 rounded-lg text-md">
                    {showFeedback? "Hide Feedback" : "Show Previously Submitted Response"}
                  </button>
                </div>}
                {showFeedback ?
                <div className="mb-10 overflow-y-auto">
                  <div className="flex justify-center mb-4">
                    <p className="font-bold">Score: {fetcher.data ? fetcher.data.total_score : data.total_score}/{5*data.saqs.length}</p>
                  </div>
                  {data.saqs.map((question, index) => (
                    <div key={index} className="mb-4 flex justify-center">
                      <div className="w-full max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-800 text-white">
                        {question.question}
                        <textarea rows={3} value={fetcher.data ? fetcher.data.responses[index].input_answer : data.feedbacks[index].input_answer} disabled name={`saq-${index}`} className="w-full mt-3 bg-zinc-700 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400" placeholder="Type your answer here..."/>
                        <div className="mt-4 flex flex-col gap-1.5">
                          <div>
                            <p className="font-bold">
                              Correct Answer: 
                            </p>
                            <p className="font-bold">
                              {question.correct_answer}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold">
                              Explanation: 
                            </p>
                            <p>
                              {question.reason}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold">
                              Feedback: 
                            </p>
                            <p>
                              {fetcher.data ? fetcher.data.responses[index].feedback : data.feedbacks[index].feedback}
                            </p>
                          </div>
                          <p className="font-bold">
                            Score: {fetcher.data ? fetcher.data.responses[index].score : data.feedbacks[index].score}/5
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                :
                <fetcher.Form method="post" ref={formRef} onSubmit={handleSubmit} className="mb-10 overflow-y-auto">
                  {fetcher.data && <div className="flex justify-center mb-4">
                    <p className="font-bold">Score: {fetcher.data.total_score}/{5*data.saqs.length}</p>
                  </div>}
                  {data.saqs.map((question, index) => (
                    <div key={index} className="mb-4 flex justify-center">
                      <div className="w-full max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-800 text-white">
                        {question.question}
                        <textarea rows={3} required disabled={isSubmitting} name={`saq-${index}`} className="w-full mt-3 bg-zinc-700 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400" placeholder="Type your answer here..."></textarea>
                      </div>
                    </div>
                  ))}
                  {!isSubmitting ?
                  <div className="mt-10 flex flex-row justify-center items-center gap-4 mb-10">
                    <div className="flex flex-row gap-1">
                      <input disabled={isSubmitting} type="checkbox" id="additional_info" name="additional_info" value="true"/>
                      <label htmlFor="additional_info">Additional information</label>
                    </div>
                    <button disabled={isSubmitting} type="submit" className="p-2 bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-400 rounded-lg text-md">Get feedback</button>
                  </div>
                  :
                  <div className="mt-10 justify-center items-center flex flex-row gap-1 select-none mb-10">
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
      ) : (
        <div className="flex bg-zinc-900 w-full h-screen items-center justify-center">
          <h1 className="text-4xl font-extrabold">SAQ Practice Not Found</h1>
        </div>
      )}
    </div>
  );
}


