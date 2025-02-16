import { useRef, useState } from "react";
import { useLoaderData, useParams, useFetcher } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { MCQ } from "../types/types";
import { c } from "vite/dist/node/types.d-aGj9QkWt";


export const meta: MetaFunction = () => {
  return [
    { title: "MCQ Practice" },
    { name: "description", content: "Practice MCQs" },
  ];
};


const chatModuleURLServer = "http://chat-module:8001";
const dataModuleURLServer = "http://data-module:8003";
const chatModuleURLClient = "http://localhost:8001";
const dataModuleURLClient = "http://localhost:8003";


type MCQFeedback = {
  question_set_id: number;
  question_id: number;
  chosen_option: string;
  feedback: string;
}

type MCQLoadData = {
  topic: string;
  mcqs: MCQ[];
  feedbacks: MCQFeedback[] | null;
  num_correct: number | null;
}

type MCQEvaluation = {
  mcq: MCQ;
  chosen_option: string;
  feedback: string;
}

type EvaluateMCQResponse = {
  responses: MCQEvaluation[];
  num_correct: number;
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_mcq/${params.id}/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Retrieved MCQ data: ", data);
      return data;
    }
    else {
      console.log("Failed to load MCQ data.");
      return null;
    }
  }
  catch (error) {
    console.log("Failed to load MCQ data.");
    console.error(error);
    return null;
  }
}


export async function action({
  params,
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();  
  const mcqs = formData.get("mcqs") as string;
  const mcqsJSON = JSON.parse(mcqs);
  const length = formData.get("length") as string;
  const additional_info = formData.get("additional_info");
  const evaluate_mcqs_request = [];
  for (let i = 0; i < parseInt(length); i++) {
    const mcq = {id: mcqsJSON[i].id, question: mcqsJSON[i].question, option_a: mcqsJSON[i].option_a, option_b: mcqsJSON[i].option_b, option_c: mcqsJSON[i].option_c, option_d: mcqsJSON[i].option_d, reason: mcqsJSON[i].reason, correct_option: mcqsJSON[i].correct_option};  
    const evaluate_mcq_request = {mcq: mcq, chosen_option: formData.get(`mcq-${i}`), additional_info: additional_info !== null ? true : false};
    evaluate_mcqs_request.push(evaluate_mcq_request);
  }
  const body = {
    "question_set_id": params.id,
    "evaluate_mcqs_request": evaluate_mcqs_request
  };
  console.log(body);
  try { 
    const response = await fetch(`${chatModuleURLServer}/evaluate_mcqs/`, {
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

export default function MCQ() {
  const data = useLoaderData<typeof loader>() as MCQLoadData;
  const params = useParams();
  const formRef = useRef<HTMLFormElement>(null);
  const fetcher = useFetcher<EvaluateMCQResponse>();
  const isSubmitting = fetcher.state === "submitting";

  const [showFeedback, setShowFeedback] = useState<Boolean>(false);

  const handleSubmit = (event: any) => {
    event.preventDefault()
    if (formRef.current) {
      const submitFormData = new FormData(formRef.current);
      submitFormData.append("mcqs", JSON.stringify(data.mcqs));
      submitFormData.append("length", data.mcqs.length.toString());
      fetcher.submit(
        submitFormData,
        { method: "post" }
      );
    }
  };

  

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

        <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
          <h1 className="text-4xl font-extrabold m-auto text-transparent">MCQ Practice - {data.topic}</h1>
        </header>

        <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
          <div className="w-screen max-w-5xl h-full">
            {data.feedbacks && 
            <div className="flex justify-center mb-4">
              <button onClick = {() => setShowFeedback(!showFeedback)} className="p-2 bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-400 rounded-lg text-md">
                {showFeedback? "Hide Feedback" : "Show Previously Submitted Response"}
              </button>
            </div>}
            {showFeedback?
            <div className="mb-10 overflow-y-auto">
              <div className="flex justify-center mb-4">
                <p className="font-bold">Score: {data.num_correct}/{data.mcqs.length}</p>
              </div>
              {data.mcqs.map((question, index) => (
                <div key={index} className="mb-4 flex justify-center">
                  <div className="w-full max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-700 text-white">
                    {question.question}
                    <ul className="list-inside">
                      <div className="flex flex-row justify-between">
                        <li key={0}>{(10).toString(36).toLowerCase()}. {question.option_a}</li>
                        <input disabled type="radio" id={(index*4+0).toString()} name={`mcq-${index}`} value={(10).toString(36).toLowerCase()} checked={data.feedbacks?.[index]?.chosen_option === "a"}/>
                      </div>
                      <div className="flex flex-row justify-between">
                        <li key={1}>{(11).toString(36).toLowerCase()}. {question.option_b}</li>
                        <input disabled type="radio" id={(index*4+1).toString()} name={`mcq-${index}`} value={(11).toString(36).toLowerCase()} checked={data.feedbacks?.[index]?.chosen_option === "b"}/>
                      </div>
                      <div className="flex flex-row justify-between">
                        <li key={2}>{(12).toString(36).toLowerCase()}. {question.option_c}</li>
                        <input disabled type="radio" id={(index*4+2).toString()} name={`mcq-${index}`} value={(12).toString(36).toLowerCase()} checked={data.feedbacks?.[index]?.chosen_option === "c"}/>
                      </div>
                      <div className="flex flex-row justify-between">
                        <li key={3}>{(13).toString(36).toLowerCase()}. {question.option_d}</li>
                        <input disabled type="radio" id={(index*4+3).toString()} name={`mcq-${index}`} value={(13).toString(36).toLowerCase()} checked={data.feedbacks?.[index]?.chosen_option === "d"}/>
                      </div>
                    </ul>
                    <div className="mt-4 flex flex-col gap-1.5">
                      {data.feedbacks?.[index]?.chosen_option === question.correct_option?
                      <p className="font-bold text-green-400">
                        Chosen Option: {data.feedbacks[index].chosen_option}
                      </p>:
                      <div>
                        <p className="font-bold text-red-400">
                          Chosen Option: {data.feedbacks?.[index].chosen_option}
                        </p>
                        <p className="font-bold">
                          Correct Option: {question.correct_option}
                        </p>
                      </div>}
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
                          {data.feedbacks?.[index].feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            :
            <fetcher.Form method="post" ref={formRef} onSubmit={handleSubmit} className="mb-10 overflow-y-auto">
              {fetcher.data && 
              <div className="flex justify-center mb-4">
                <p className="font-bold">Score: {fetcher.data.num_correct}/{data.mcqs.length}</p>
              </div>}
              {data.mcqs.map((question, index) => (
                <div key={index} className="mb-4 flex justify-center">
                  <div className="w-full max-w-screen-md pl-4 pr-10 py-4 rounded-md bg-zinc-700 text-white">
                    {question.question}
                    <ul className="list-inside">
                      <div className="flex flex-row justify-between">
                        <li key={0}>{(10).toString(36).toLowerCase()}. {question.option_a}</li>
                        <input disabled={isSubmitting} type="radio" id={(index*4+0).toString()} name={`mcq-${index}`} value={(10).toString(36).toLowerCase()} required/>
                      </div>
                      <div className="flex flex-row justify-between">
                        <li key={1}>{(11).toString(36).toLowerCase()}. {question.option_b}</li>
                        <input disabled={isSubmitting} type="radio" id={(index*4+1).toString()} name={`mcq-${index}`} value={(11).toString(36).toLowerCase()} required/>
                      </div>
                      <div className="flex flex-row justify-between">
                        <li key={2}>{(12).toString(36).toLowerCase()}. {question.option_c}</li>
                        <input disabled={isSubmitting} type="radio" id={(index*4+2).toString()} name={`mcq-${index}`} value={(12).toString(36).toLowerCase()} required/>
                      </div>
                      <div className="flex flex-row justify-between">
                        <li key={3}>{(13).toString(36).toLowerCase()}. {question.option_d}</li>
                        <input disabled={isSubmitting} type="radio" id={(index*4+3).toString()} name={`mcq-${index}`} value={(13).toString(36).toLowerCase()} required/>
                      </div>
                    </ul>
                    {fetcher.data? <div className="mt-4 flex flex-col gap-1.5">
                      {fetcher.data.responses[index].chosen_option === question.correct_option?
                        <p className="font-bold text-green-400">
                          Chosen Option: {fetcher.data.responses[index].chosen_option}
                        </p>:
                        <div>
                        <p className="font-bold text-red-400">
                          Chosen Option: {fetcher.data.responses[index].chosen_option}
                        </p>
                        <p className="font-bold">
                          Correct Option: {question.correct_option}
                        </p>
                      </div>}
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
                          {(fetcher.data.responses as any)[index].feedback}
                        </p>
                      </div>
                    </div>: 
                    null}
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
  );
}


