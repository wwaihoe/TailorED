import { useLoaderData, Link, useFetcher, Outlet } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "Study Plans" },
    { name: "description", content: "Receive Tailored Study Plans" },
  ];
};


const dataModuleURLServer = "http://data-module:8003";
const dataModuleURLClient = "http://localhost:8003";


type StudyPlanSubjectObj = {
  studyPlanId: string;
  timestamp: string;
  subject: string;
}


export async function loader() {
  try {
    const response = await fetch(`${dataModuleURLServer}/retrieve_study_plan_subjects/`);
    if (response.ok) {
      const data = await response.json();
      const subjects = data.subjects.map((subject: any) => { return { studyPlanId: subject.id, timestamp: subject.timestamp, subject: subject.subject }; });
      console.log("Study plans loaded successfully: ", subjects);
      return subjects as StudyPlanSubjectObj[];
    }
    else {
      console.error("Failed to load study plans.");
      return [];
    }
  }
  catch (error) {
    console.error("Failed to load study plans.");
    console.error(error);
    return [];
  }
}

export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData(); 
  const studyPlanId = formData.get("studyPlanId");
  try {
    const response = await fetch(`${dataModuleURLServer}/delete_study_plan/${studyPlanId}/`, {
      method: "DELETE",
    });
    if (response.ok) {
      console.log("Study plan deleted: " + studyPlanId);
    }
    else {
      console.error("Failed to delete study plan.");
    }
  }
  catch (error) {
    console.error("Failed to delete study plan.");
    console.error(error);
  } 
  return null;
}


export default function StudyPlans() {
  const studyPlanSubjects = useLoaderData<typeof loader>() as StudyPlanSubjectObj[];

  return (
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10%] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
        <h1 className="text-4xl font-extrabold m-auto text-transparent">Study Plans</h1>
      </header>
      <main className="flex flex-row h-[90%] justify-center w-full">
        {studyPlanSubjects.length > 0 &&
        <div className="flex w-2/3 h-full gap-4">
          <div className="flex flex-col max-w-3xl w-full h-full gap-4 items-center m-auto">
            <header className="flex w-full">
              <h1 className="text-lg font-extrabold text-white mx-3">Previously generated plans</h1>
            </header>
            <div className="flex flex-col w-full gap-4 overflow-y-auto mb-20">
              {studyPlanSubjects.map((subject) => <Subject key={subject.studyPlanId} studyPlanId={subject.studyPlanId} timestamp={subject.timestamp} subject={subject.subject} />)}
            </div>
          </div>
        </div>}
        <Outlet />
      </main>
    </div>
  );
}


export function Subject({ studyPlanId, timestamp, subject }: StudyPlanSubjectObj) {
  const displayContent = subject.length > 50 ? subject.substring(0, 50) + "..." : subject;
  const offset = new Date().getTimezoneOffset();
  const displayTimestamp = new Date(new Date(timestamp).getTime() - offset * 60 * 1000).toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  
  const fetcher = useFetcher();

  return (
    <div className="relative">
      <Link to={`/studyplan/${studyPlanId}`} className="py-3 pl-3 pr-9 flex flex-row gap-4 justify-between text-center bg-zinc-800 border-2 border-zinc-600 rounded-xl text-lg text-white hover:bg-zinc-900 hover:text-blue-400">
        <h2>{displayContent}</h2>
        <div className="flex flex-row gap-1 text-sm text-center items-center">
          <p>{displayTimestamp}</p>
        </div>
      </Link>
      <fetcher.Form method="post" className="flex absolute top-0 right-0 p-3 mt-1 text-sm text-center items-center">
        <input type="hidden" name="studyPlanId" value={studyPlanId} />
        <button type="submit" className="text-center items-center select-none pb-0.5 px-2 rounded-full text-white hover:bg-red-400 focus:outline-none focus:ring focus:ring-red-300">x</button> 
      </fetcher.Form>
    </div>
  );
}