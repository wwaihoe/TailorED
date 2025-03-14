import { useLoaderData } from "@remix-run/react";
import Markdown from 'markdown-to-jsx'
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "Summaries" },
    { name: "description", content: "Summary of Notes" },
  ];
};


const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type SummaryLoadData = {
  topic: string;
  summary: string;
}


export async function loader({
  params,
}: LoaderFunctionArgs) {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_summary/${params.id}/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Summary data loaded successfully: ", data);
      return data;
    }
    else {
      console.log("Failed to load summary data.");
      return null;
    }
  }
  catch (error) {
    console.log("Failed to load summary data.");
    console.error(error);
    return null;
  }
}


export default function Summary() {
  const data = useLoaderData<typeof loader>() as SummaryLoadData;

  return (
    <div className="flex w-full h-screen">
      {data && data.summary.length > 0 ? (
        <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

          <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
            <h1 className="text-4xl font-extrabold m-auto text-transparent">Summary - {data.topic}</h1>
          </header>

          <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
            <div className="w-screen max-w-5xl h-full flex justify-center">
              <div className="prose prose-zinc dark:prose-invert prose-base">
                <Markdown options={{ wrapper: 'article' }}>
                {data.summary}
                </Markdown>
                <div className="h-10"></div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex bg-zinc-900 w-full h-screen items-center justify-center">
          <h1 className="text-4xl font-extrabold">Summary Not Found</h1>
        </div>
      )}
    </div>
  );
}


