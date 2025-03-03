import { useLoaderData } from "@remix-run/react";
import Markdown from 'markdown-to-jsx'
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";


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


type StudyPlanLoadData = {
  timestamp: string;
  subject: string;
  study_plan: string;
}

export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_study_plan/${params.id}/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Study plan loaded successfully: ", data);
      return data as StudyPlanLoadData;
    }
    else {
      console.log("Failed to load study plan: ", params.id);
      return null;
    }
  }
  catch (error) {
    console.log("Failed to load study plan: ", params.id);
    console.error(error);
    return null;
  }
}


export default function Summary() {
  const data = useLoaderData<typeof loader>() as StudyPlanLoadData | null;

  return (
    <div className="flex w-full h-screen">
      {data && data.study_plan ? (
        <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
          <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
            <h1 className="text-4xl font-extrabold m-auto text-transparent">Study Plan Tailored for You</h1>
          </header>
          <main className="flex flex-col w-full h-[90%] items-center bg-zinc-900">
            <div className="w-screen max-w-5xl h-full flex justify-center overflow-y-auto">
              <div className="prose prose-zinc dark:prose-invert prose-base">
                <Markdown options={{ wrapper: 'article' }}>
                {data.study_plan}
                </Markdown>
                <div className="h-10"></div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex bg-zinc-900 w-full h-screen items-center justify-center">
          <h1 className="text-4xl font-extrabold">Study Plan Not Found</h1>
        </div>
      )}
    </div>
  );
}