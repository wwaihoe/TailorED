import { useRef, useState } from "react";
import { useLoaderData, useFetcher, useRevalidator } from "@remix-run/react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";


export const meta: MetaFunction = () => {
  return [
    { title: "Create Summaries" },
    { name: "description", content: "Create Summaries of Notes" },
  ];
};


const retrievalModuleURLServer = "http://retrieval-module:8000";
const retrievalModuleURLClient = "http://localhost:8000";

type FileListing = {
  id: string;
  name: string;
  size: number;
}

export async function loader() {
  try {
    const response = await fetch(`${retrievalModuleURLServer}/load/`);
    if (response.ok) {
      const data = await response.json();
      const filesizes = data.filesizes
      const files = filesizes.map((file: any) => {
        return { id: file.id, name: file.name, size: file.size };
      });
      const filenames = files.map((file: any) => file.name);
      console.log("Files loaded: " + filenames);
      return files;
    }
    else {
      console.error("Failed to load files.");
      return [];
    }
  } catch (error) {
    console.log("Failed to load files.");
    console.error(error);
    return [];
  } 
}

export async function action({
  request,
}: ActionFunctionArgs) {
  const formData = await request.formData();
  const file_id = formData.get("file_id");
  const filename = formData.get("filename");
  console.log("Deleting ID: " + file_id);
  try {
    const response = await fetch(`${retrievalModuleURLServer}/remove/${file_id}/`, {
      method: "DELETE",
    });
    if (response.ok) {
      console.log("File deleted: " + filename);
    }
    else {
      console.error("Failed to delete file: " + filename);
    }
  } catch (error) {
    console.error("Failed to delete file: " + filename);
    console.error(error);
  }
  return null;
};

export default function fileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const files = useLoaderData<typeof loader>() as FileListing[];
  const isRemoving = fetcher.state != "idle";
  const [isUploading, setIsUploading] = useState(false);
  const revalidator = useRevalidator();


  const handleUpload = async(event: any) => {
    event.preventDefault();
    setIsUploading(true);
    const file = event.target.files[0];
    console.log("Uploaded: " + file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${retrievalModuleURLClient}/upload/`, {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        console.log("File uploaded.");
        revalidator.revalidate();
      }
    } catch (error) {
      console.log("Failed to upload file.");
      console.error(error)
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setIsUploading(false);
  };


  return (
    <div className="flex flex-col rounded-lg p-3 items-start h-fit">
      <label htmlFor="document">Upload documents here:</label>
      {isUploading ? (
        <input disabled ref={inputRef} type="file" id="document" name="document" accept="application/pdf, text/plain, image/png, image/jpeg, audio/mpeg" className="w-full mt-2 text-sm text-grey-500 text-pretty
        file:mr-2 file:py-1 file:px-2
        file:rounded-lg file:border-0
        file:text-sm file:font-medium
        file:bg-blue-300 file:text-white"
        onChange={handleUpload} />
      ) : (
        <input ref={inputRef} type="file" id="document" name="document" accept="application/pdf, text/plain, image/png, image/jpeg, audio/mpeg" className="w-full mt-2 text-sm text-grey-500 text-pretty
        file:mr-2 file:py-1 file:px-2
        file:rounded-lg file:border-0
        file:text-sm file:font-medium
        file:bg-blue-400 file:text-white
        hover:file:cursor-pointer hover:file:bg-blue-500"
        onChange={handleUpload} />
      )}
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">PDF, TXT, MP3, PNG, JPEG.</p>
      {isUploading && 
      <div className='select-none flex space-x-2 justify-center items-center mt-5'>
        <span className='sr-only'>Loading...</span>
        <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
        <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
        <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
      </div>}
      <ul className="w-full">
        {files && files.map((file, index) => (
          <li key={index} className="mt-2 text-sm text-grey-500">
          <div className="flex flex-row gap-3 border-2 border-zinc-400 rounded-xl justify-between">
            <div className="flex flex-row justify-between ml-1 w-7/8 grow gap-3 overflow-x-auto">
              <p>{file.name}</p>
              <p>{file.size} Chars</p>
            </div>
            <fetcher.Form method="post" className="flex w-1/8 justify-end">
              <input type="hidden" name="file_id" value={file.id}/>
              <input type="hidden" name="filename" value={file.name}/>
              {isRemoving ?
              <div className="flex justify-center items-center">
                <div className="rounded-full h-5 w-5 bg-white animate-ping"></div>
              </div>
              : 
              <button type="submit" className="flex text-center h-fit select-none pb-0.5 px-2 rounded-full text-white hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-300">
                x
              </button>
              }
            </fetcher.Form>
          </div>
          </li>
        ))}
      </ul>
    </div>
  );
}