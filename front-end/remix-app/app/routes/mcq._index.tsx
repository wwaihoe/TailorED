import {
  useLoaderData,
  Link,
} from "@remix-run/react";
import { c } from "node_modules/vite/dist/node/types.d-aGj9QkWt";


const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type Topic = {
  question_set_id: number;
  topic: string;
}

type TopicObj = {
  topic: string;
  route: string;
}


export async function loader() {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_mcq_topics/`);
    if (response.ok) {
      const data = await response.json();
      console.log("Topics loaded successfully: ", data.topics);
      return data.topics;
    }
    else {
      console.error("Failed to load topics.");
      return [];
    }
  }
  catch (error) {
    console.error("Failed to load topics.");
    console.error(error);
    return [];
  }
}


export default function MCQ() {
  const topics = useLoaderData<typeof loader>() as Topic[];
  
  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300">
        <h1 className="text-3xl font-bold m-auto text-black">MCQ Practice</h1>
      </header>
      <main className="flex flex-col justify-center content-center items-center h-[90%] w-[90%] m-5 gap-6">
        <div className="rounded-md bg-zinc-700 border-t border-zinc-500 h-full w-full p-4">
          <p className="text-xl font-bold mb-4">
            Choose a topic to practice MCQs
          </p>
          <div className="grid grid-cols-4 gap-4">
            {topics.map((topic) => <MCQTopic key={topic.question_set_id} topic={topic.topic} route={`/mcq/${topic.question_set_id}`} />)}
          </div>
        </div>
        <Link to={"/mcq/create/fileupload"} className="px-6 py-3 mb-3 bg-blue-400 rounded-xl border-2 border-zinc-300 text-xl text-white hover:bg-blue-500 hover:border-black focus:outline-none focus:ring focus:ring-blue-300">
          Create MCQs
        </Link>
      </main>
    </div>
  );
}

export function MCQTopic({ topic, route }: TopicObj) {
  return (
    <Link to={route? route: "/"} className="p-3 text-center bg-zinc-800 border-4 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400 hover:border-zinc-300">
      <h1>{topic}</h1>
    </Link>
  );
}

const topics = [
  {name: "Math", route: "/mcq/math"},
  {name: "Science", route: "/mcq/science"},
  {name: "History", route: "/mcq/history"},
  {name: "English", route: "/mcq/english"},
]