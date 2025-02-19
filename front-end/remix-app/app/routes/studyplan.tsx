import { useLoaderData, useFetcher } from "@remix-run/react";
import Markdown from 'markdown-to-jsx'
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "Study Plan" },
    { name: "description", content: "Get a Personalized Study Plan" },
  ];
};


const chatModuleURLServer = "http://chat-module:8001";
const dataModuleURLServer = "http://data-module:8003";
const chatModuleURLClient = "http://localhost:8001";
const dataModuleURLClient = "http://localhost:8003";


type CanGenerateStudyPlan = {
  can_generate: boolean;
}

type StudyPlanLoadData = {
  timestamp: string;
  study_plan: string;
}

type StudyPlanGenerateResponse = {
  study_plan: string;
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_study_plan/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Study plan data loaded successfully: ", data);
      if (data.study_plan === null) {
        try{
          const response = await fetch(`${dataModuleURLServer}/retrieve_all_topics/`);
          if (response.ok) {
            const data = await response.json();
            if (data.topics.length > 0) {
              return { can_generate: true };
            }
            else {
              return { can_generate: false };
            };
          }
        }
        catch (error) {
          console.error("Failed to check if study plan can be generated.");
          console.error(error);
          return null;
        }
      }
      else {
        return data;
      }
    }
    else {
      console.log("Failed to load study plan data.");
      return null;
    }
  }
  catch (error) {
    console.log("Failed to load study plan data.");
    console.error(error);
    return null;
  }
}

export async function action({
  params,
  request,
}: ActionFunctionArgs) {
  try {
    const response = await fetch(`${chatModuleURLServer}/generate_study_plan/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ timestamp: new Date(Date.now()).toISOString() }),
    });
    if (response.ok) {
      console.log("Study plan generated successfully.");
      const data = await response.json();
      return json(data);
    }
    else {
      console.error("Failed to generate study plan.");
      return null;
    }
  }
  catch (error) {
    console.error("Failed to generate study plan.");
    console.error(error);
    return null;
  }
}


export default function Summary() {
  const data = useLoaderData<typeof loader>() as StudyPlanLoadData | CanGenerateStudyPlan;
  const fetcher = useFetcher<StudyPlanGenerateResponse>();
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="flex w-full h-screen">
      {data && "study_plan" in data && data.study_plan ? (
        isSubmitting ? (
          <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center justify-center">
            <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
              <h1 className="text-4xl font-extrabold m-auto text-transparent">Creating a Study Plan Tailored for You</h1>
            </header>
            <main className="flex flex-col w-full items-center justify-center overflow-y-auto p-6 bg-zinc-900">
              <div className='select-none flex space-x-2 justify-center items-center'>
                <span className='sr-only'>Loading...</span>
                <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
                <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
                <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
              </div>
            </main>  
          </div>
        ) : (
          <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
            <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
              <h1 className="text-4xl font-extrabold m-auto text-transparent">Study Plan Tailored for You</h1>
            </header>
            <main className="flex flex-col w-full h-[80%] items-center bg-zinc-900">
              <div className="w-screen max-w-5xl h-full flex justify-center overflow-y-auto">
                <div className="prose prose-zinc dark:prose-invert prose-base">
                  <Markdown options={{ wrapper: 'article' }}>
                  {data.study_plan}
                  </Markdown>
                  <div className="h-10"></div>
                </div>
              </div>
            </main>
            <fetcher.Form method="post" className="flex h-[10%] justify-center items-center">
              <button type="submit" className="px-6 py-3 mb-3 bg-blue-400 rounded-xl border-2 border-zinc-300 text-xl text-white hover:bg-blue-500 hover:border-black focus:outline-none focus:ring focus:ring-blue-300">
                Generate a New Study Plan
              </button>
            </fetcher.Form>
          </div>
        )
      ) : (
        fetcher.data?.study_plan ? (
          <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
            <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
              <h1 className="text-4xl font-extrabold m-auto text-transparent">Study Plan Tailored for You</h1>
            </header>
            <main className="flex flex-col w-full h-[80%] items-center bg-zinc-900">
              <div className="w-screen max-w-5xl h-full flex justify-center overflow-y-auto">
                <div className="prose prose-zinc dark:prose-invert prose-base">
                  <Markdown options={{ wrapper: 'article' }}>
                  {(fetcher.data as StudyPlanGenerateResponse)?.study_plan}
                  </Markdown>
                  <div className="h-10"></div>
                </div>
              </div>
            </main>
            <fetcher.Form method="post" className="flex h-[10%] justify-center items-center">
              <button type="submit" className="px-6 py-3 mb-3 bg-blue-400 rounded-xl border-2 border-zinc-300 text-xl text-white hover:bg-blue-500 hover:border-black focus:outline-none focus:ring focus:ring-blue-300">
                Generate a New Study Plan
              </button>
            </fetcher.Form>
          </div>
          ) : (
          data && "can_generate" in data && data.can_generate ? (
            isSubmitting ? (
            <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center justify-center">
              <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
                <h1 className="text-4xl font-extrabold m-auto text-transparent">Creating a Study Plan Tailored for You</h1>
              </header>
              <main className="flex flex-col w-full items-center justify-center overflow-y-auto p-6 bg-zinc-900">
                <div className='select-none flex space-x-2 justify-center items-center'>
                  <span className='sr-only'>Loading...</span>
                  <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
                  <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
                  <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
                </div>
              </main>  
            </div>
            ) : (
            <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center justify-center">
              <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
                <h1 className="text-4xl font-extrabold m-auto text-transparent">Create a Study Plan Tailored for You</h1>
              </header>
              <fetcher.Form method="post">
                <button type="submit" className="px-6 py-3 mb-3 bg-blue-400 rounded-xl border-2 border-zinc-300 text-xl text-white hover:bg-blue-500 hover:border-black focus:outline-none focus:ring focus:ring-blue-300">
                  Generate Study Plan
                </button>
              </fetcher.Form>
            </div>
            ))
          : (
            <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center justify-center">
              <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
                <h1 className="text-4xl font-extrabold m-auto text-transparent">Creating a Study Plan Tailored for You</h1>
              </header>
              <div className="flex justify-center">
                <p className="text-lg font-bold mb-4">
                  You need to do some practices or create summaries before generating a study plan.
                </p>
              </div>
            </div>  
          )
        )
      )}
    </div>
  );
}