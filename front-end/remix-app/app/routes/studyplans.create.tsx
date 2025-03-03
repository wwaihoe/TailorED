import { useLoaderData, useFetcher, Outlet } from "@remix-run/react";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";


export const meta: MetaFunction = () => {
  return [
    { title: "Generate Study Plan" },
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

type StudyPlanGenerateResponse = {
  success: boolean;
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
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

export async function action({
  params,
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData(); 
  const subject = formData.get("subject");
  try {
    const response = await fetch(`${chatModuleURLServer}/generate_study_plan/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ subject: subject, timestamp: new Date(Date.now()).toISOString() }),
    });
    if (response.ok) {
      console.log("Study plan generated successfully.");
      return { success: true };
    }
    else {
      console.error("Failed to generate study plan.");
      return { success: false };
    }
  }
  catch (error) {
    console.error("Failed to generate study plan.");
    console.error(error);
    return { success: false };
  }
}


export default function Summary() {
  const data = useLoaderData<typeof loader>() as CanGenerateStudyPlan;
  const fetcher = useFetcher<StudyPlanGenerateResponse>();
  const isSubmitting = fetcher.state !== "idle";
    

  return (
    <div className="flex w-1/3">
      {data && "can_generate" in data && data.can_generate ? (
        isSubmitting ? (
        <div className="flex flex-col w-full mx-auto bg-zinc-900 text-white items-center gap-5 mt-5">
          <main className="flex flex-col w-full items-center justify-center overflow-y-auto p-6 bg-zinc-900">
          <p className="text-xl font-bold mb-4">
            Creating a study plan tailored just for you.
          </p>
            <div className='select-none flex space-x-2 justify-center items-center'>
              <span className='sr-only'>Loading...</span>
              <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
              <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
              <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
            </div>
          </main>  
        </div>
        ) : (
        <div className="m-5 flex flex-col bg-zinc-800 rounded-lg p-5 max-w-2xl w-full h-fit">
          <Outlet />
          <fetcher.Form method="post" className="flex flex-row gap-3 max-w-2xl w-full p-3">
            <input type="text" name="subject" required className="w-3/4 flex bg-zinc-700 text-gray-100 rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400" placeholder="Enter the subject for the study plan" />
            <button type="submit" className="w-1/4 p-2 bg-blue-400 rounded-md text-white hover:bg-blue-500 focus:outline-none focus:ring focus:ring-white">
              Generate
            </button>
          </fetcher.Form>
        </div>
        )
      ) : (
      <div className="flex flex-col w-full mx-auto bg-zinc-900 text-white items-center justify-center gap-5">
        <div className="flex justify-center">
          <p className="text-xl font-bold mb-4">
            You need to do some practices or create some summaries before generating a study plan.
          </p>
        </div>
      </div>  
      )}
    </div>
  );
}
