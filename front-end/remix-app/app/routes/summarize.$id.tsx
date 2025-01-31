import { useRef, useState } from "react";
import {
  useLoaderData,
  useParams,
  useFetcher 
} from "@remix-run/react";
import Markdown from 'markdown-to-jsx'
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import type { SAQ } from "../types/types";


const chatModuleURLServer = "http://chat-module:8001";
const dataModuleURLServer = "http://data-module:8003";
const chatModuleURLClient = "http://localhost:8001";
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
  const prompt = `A relevant and detailed illustration of the topic: ${data.topic}`;

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">

        <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
          <h1 className="text-4xl font-extrabold m-auto text-transparent">Summary - {data.topic}</h1>
        </header>

        <main className="flex flex-col w-full h-[90%] items-center justify-center overflow-y-auto p-6 bg-zinc-900">
          <div className="w-screen max-w-5xl h-full flex justify-center">
            <div className="prose prose-zinc dark:prose-invert lg:prose-xl">
              <Markdown options={{ wrapper: 'article' }}>
              {data.summary}
              </Markdown>
            </div>
          </div>
        </main>
    </div>
  );
}


