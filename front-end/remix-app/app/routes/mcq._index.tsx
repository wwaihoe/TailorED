import { useLoaderData, Link, useFetcher } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "MCQ Practice" },
    { name: "description", content: "Practice MCQs" },
  ];
};


const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type Topic = {
  question_set_id: number;
  topic: string;
  image_prompt: string | null;
}

type TopicObj = {
  question_set_id: number;
  topic: string;
  route: string;
  image_prompt: string | null;
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

export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();
  const question_set_id = formData.get("question_set_id");
  const topic = formData.get("topic");
  try {
    const response = await fetch(`${dataModuleURLServer}/delete_mcq/${question_set_id}/`, {
      method: "DELETE",
    });
    if (response.ok) {
      console.log("Topic deleted: " + topic);
    }
    else {
      console.error("Failed to delete topic: " + topic);
    }
  }
  catch (error) {
    console.error("Failed to delete topic: " + topic);
    console.error(error);
  }
  return null;
}


export default function MCQ() {
  const topics = useLoaderData<typeof loader>() as Topic[];
  
  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
        <h1 className="text-4xl font-extrabold m-auto text-transparent">MCQ Practice</h1>
      </header>
      <main className="flex flex-col justify-center content-center items-center h-[90%] w-[90%] m-5 gap-6">
        <div className="rounded-md bg-zinc-700 border-t border-zinc-500 h-full w-full p-4">
          <p className="text-xl font-bold mb-4">
            Choose a topic to practice MCQs
          </p>
          <div className="grid grid-cols-3 grid-rows-4 gap-4 w-full h-full">
            {topics.map((topic) => <TopicObj key={topic.question_set_id} question_set_id={topic.question_set_id} topic={topic.topic} route={`/mcq/${topic.question_set_id}`} image_prompt={topic.image_prompt} />)}
          </div>
        </div>
        <Link to={"/mcq/create/fileupload"} className="px-6 py-3 mb-3 bg-blue-400 rounded-xl border-2 border-zinc-300 text-xl text-white hover:bg-blue-500 hover:border-black focus:outline-none focus:ring focus:ring-blue-300">
          Create MCQs
        </Link>
      </main>
    </div>
  );
}

function TopicObj({ question_set_id, topic, route, image_prompt }: TopicObj) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="w-full h-full relative text-center bg-zinc-800 border-4 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400 hover:border-zinc-300 flex flex-col items-center">
      {isSubmitting ? 
      <div>
        <button className="w-full h-full relative p-3 text-center bg-zinc-800 border-4 border-zinc-600 rounded-xl text-lg text-white flex flex-col items-center">
          <img 
          src={`https://image.pollinations.ai/prompt/${image_prompt ? image_prompt : `An illustration of the topic: ${topic}`}?width=1024&height=376&model=flux&seed=23&nologo=true&private=true`} 
          alt={topic}
          className="absolute inset-0 w-full h-full object-cover rounded-xl"
          />
          <div className="overflow-y-auto pt-3">
            <h1 className="relative z-10 bg-black bg-opacity-60 px-2 py-1 rounded font-semibold">{topic}</h1>
          </div>
          
        </button>
        <button disabled type="submit" className="text-sm absolute top-0 right-0 flex text-center select-none bg-black bg-opacity-80 pb-0.5 px-2 rounded-full text-white hover:bg-red-400 focus:outline-none focus:ring focus:ring-red-300">
          x
        </button>
      </div>
      :
      <div>
        <Link to={route ? route : "/"} className="p-3">
          <img 
          src={`https://image.pollinations.ai/prompt/${image_prompt ? image_prompt : `An illustration of the topic: ${topic}`}?width=1024&height=376&model=flux&seed=23&nologo=true&private=true`} 
          alt={topic}
          className="absolute inset-0 w-full h-full object-cover rounded-xl"
          />
          <div className="overflow-y-auto pt-3">
            <h1 className="relative z-10 bg-black bg-opacity-60 px-2 py-1 rounded font-semibold">{topic}</h1>
          </div>
        </Link>
        <fetcher.Form method="post" className="absolute top-0 right-0">
          <input type="hidden" name="question_set_id" value={question_set_id}/>
          <input type="hidden" name="topic" value={topic}/>
          <button type="submit" className="text-sm flex text-center select-none bg-black bg-opacity-80 pb-0.5 px-2 rounded-full text-white hover:bg-red-400 focus:outline-none focus:ring focus:ring-red-300">
            x
          </button>
        </fetcher.Form>
      </div>
      }
    </div>
  );
}