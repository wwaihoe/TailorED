import { useState } from "react";
import Markdown from 'markdown-to-jsx'


export default function Accordion({ text }: { text: string }) {
 const [open, setOpen] = useState(false);


 return (
   <div className="w-full flex flex-col gap-2">
     <input
       id="expandCollapse"
       type="checkbox"
       checked={open}
       className="peer sr-only"
     />
     <label
       htmlFor="expandCollapse"
       className="w-fit p-2 flex text-white rounded-lg border border-zinc-700 hover:bg-zinc-600 text-sm"
       onClick={() => setOpen(!open)}
     >
       {open ? (
        <div className="flex flex-row gap-3 items-center">
          <p>
            Reasoning
          </p>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 18.75 7.5-7.5 7.5 7.5" />
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 7.5-7.5 7.5 7.5" />
          </svg>
        </div>
        
       ) : (
        <div className="flex flex-row gap-3 items-center">
          <p>
            Reasoning
          </p>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5" />
          </svg> 
        </div>
       )}
     </label>
     <div
       className="w-full overflow-hidden max-h-0 peer-checked:max-h-[500px] peer-checked:overflow-y-auto transition-[max-height] duration-1000 ease-in-out"
     >
      <div className="prose prose-zinc dark:prose-invert prose-base text-gray-300 text-sm">
       <Markdown options={{ wrapper: 'article' }}>
         {text}
        </Markdown>
      </div>
     </div>
   </div>
 );
};