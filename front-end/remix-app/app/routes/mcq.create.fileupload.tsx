import { useRef, useState } from "react";
import { useLoaderData, useFetcher, useRevalidator } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";


//const retrievalModuleURL = "http://retrieval-module:8000";
const retrievalModuleURL = "http://localhost:8000";

type FileListing = {
  name: string;
  size: number;
}

export async function loader() {
  try {
    const response = await fetch(`${retrievalModuleURL}/load/`);
    if (response.ok) {
      const data = await response.json();
      const filesizes = data.filesizes
      const files = filesizes.map((file: any) => {
        return { name: file.name, size: file.size };
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
  const filename = formData.get("filename");
  try {
    const response = await fetch(`${retrievalModuleURL}/remove/${filename}/`, {
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
      const response = await fetch(`${retrievalModuleURL}/upload/`, {
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
      <input disabled={isUploading} ref={inputRef} type="file" id="document" name="document" accept="application/pdf" className="mt-2 text-sm text-grey-500 truncate text-pretty
      file:mr-2 file:py-1 file:px-2
      file:rounded-lg file:border-0
      file:text-sm file:font-medium
      file:bg-red-400 file:text-white
      hover:file:cursor-pointer hover:file:bg-red-500"
      onChange={handleUpload} />
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">PDF or TXT.</p>
      {isUploading && 
      <div className='select-none flex space-x-2 justify-center items-center mt-5'>
        <span className='sr-only'>Loading...</span>
        <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
        <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
        <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
      </div>}
      <ul>
        {files && files.map((file, index) => (
          <li key={index} className="mt-2 text-sm text-grey-500">
          <div className="flex flex-row gap-1 border-2 border-zinc-400 rounded-xl justify-between">
            <div className="flex flex-row gap-32 ml-1">
              <p>{file.name}</p>
              <p>{file.size} Chars</p>
            </div>
            <fetcher.Form method="post">
              <input type="hidden" name="filename" value={file.name}/>
              {isRemoving ?
              <div className="flex justify-center items-center">
                <div className="rounded-full h-5 w-5 bg-white animate-ping"></div>
              </div>
              : 
              <button type="submit" className="flex text-center select-none pb-0.5 px-2 bg-red-400 rounded-full text-white hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-400">
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