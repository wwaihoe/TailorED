import type { MetaFunction } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "TailorED" },
    { name: "description", content: "About TailorED!" },
  ];
};


export default function About() {
  return (
    <div className="flex w-screen h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-5">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading mt-10 text-2xl font-bold text-gray-800 dark:text-white">
            About TailorED
          </h1>
        </header>
        <div className="flex flex-col max-w-3xl items-center justify-center gap-8 rounded-3xl border border-zinc-700 p-10 bg-zinc-900 shadow-lg">
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
              <h2 className="text-4xl font-extrabold m-auto text-transparent tracking-tight mb-2">
                Welcome to TailorED: Your Personalized Learning Journey
              </h2>
            </div>
            <p className="mt-1 text-xl italic text-gray-600 dark:text-gray-400">
              Revolutionizing University Education with AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="leading-7 text-gray-700 dark:text-white mb-6">
                TailorED is your intelligent study companion, designed to revolutionize
                your university learning experience. Harnessing the power of generative
                AI, TailorED provides personalized support to help you master your
                coursework and achieve your academic goals.
              </p>
              <p className="leading-7 text-gray-700 dark:text-white">
                Imagine having a dedicated AI assistant available 24/7 to clarify
                complex concepts, generate practice questions, and summarize key
                topics. With TailorED, you can:
              </p>
            </div>
            <div>
              <ul className="list-disc pl-5 space-y-4">
                <li className="leading-7 text-gray-700 dark:text-white">
                  <span className="font-semibold text-gray-800 dark:text-gray-300">Dive deep into your course materials</span>: Our RAG chat function allows you to ask questions and engage in discussions directly related to your readings and lectures, ensuring a thorough understanding of the subject matter. {/* Slightly darker/lighter font-semibold */}
                </li>
                <li className="leading-7 text-gray-700 dark:text-white">
                  <span className="font-semibold text-gray-800 dark:text-gray-300">Sharpen your knowledge with practice</span>: Effortlessly create Multiple Choice Questions (MCQs) and Short Answer Questions (SAQs) on any topic to test your comprehension and prepare for exams. {/* Slightly darker/lighter font-semibold */}
                </li>
                <li className="leading-7 text-gray-700 dark:text-white">
                  <span className="font-semibold text-gray-800 dark:text-gray-300">Conquer information overload</span>: Quickly generate concise summaries of lengthy notes or complex topics, saving you time and focusing your study efforts. {/* Slightly darker/lighter font-semibold */}
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <p className="leading-7 text-lg text-gray-700 dark:text-white">
              TailorED is more than just an app; it's your personalized pathway to
              academic success, empowering you to learn smarter, not harder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}