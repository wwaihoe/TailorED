import { useRef, useState } from "react";
import { useLoaderData, useFetcher, useRevalidator, Outlet } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";


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
    <div className="flex flex-col w-full h-screen mx-auto bg-zinc-900 text-white items-center">
      <header className="flex w-full h-[10vh] justify-center content-center bg-gradient-to-r from-blue-300 to-red-300 bg-clip-text">
        <h1 className="text-4xl font-extrabold m-auto text-transparent">Chat</h1>
      </header>
      <main className="flex flex-row w-full h-[90vh] bg-zinc-900">
        <Outlet/>
        <div className="w-[22.5%] flex flex-col bg-zinc-800 m-3 rounded-lg p-3 items-start h-fit mt-6">
          
          <label htmlFor="document">Upload documents here:</label>
          {isUploading ? (
          <input disabled ref={inputRef} type="file" id="document" name="document" accept="application/pdf, text/plain, image/png, image/jpeg, audio/mpeg" className="mt-2 text-sm text-grey-500 truncate text-pretty
          file:mr-2 file:py-1 file:px-2
          file:rounded-lg file:border-0
          file:text-sm file:font-medium
          file:bg-blue-300 file:text-white"
          onChange={handleUpload} />
          ) : (
          <input ref={inputRef} type="file" id="document" name="document" accept="application/pdf, text/plain, image/png, image/jpeg, audio/mpeg" className="mt-2 text-sm text-grey-500 truncate text-pretty
          file:mr-2 file:py-1 file:px-2
          file:rounded-lg file:border-0
          file:text-sm file:font-medium
          file:bg-blue-400 file:text-white
          hover:file:cursor-pointer hover:file:bg-blue-500"
          onChange={handleUpload} />)}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">PDF, TXT, MP3, PNG, JPEG.</p>
          {isUploading && 
          <div className='flex mt-5 space-x-2 justify-center items-center'>
            <span className='sr-only'>Loading...</span>
            <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]'></div>
            <div className='h-5 w-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]'></div>
            <div className='h-5 w-5 bg-white rounded-full animate-bounce'></div>
          </div>}
          <ul>
            {files && files.map((file, index) => (
              <li key={index} className="mt-2 text-sm text-grey-500">
                <div className="flex flex-row gap-3 pl-1 border-2 border-zinc-400 rounded-xl justify-between">
                  <div className="flex flex-row justify-between w-7/8 grow gap-3 overflow-x-auto">
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
      </main>
    </div>
  );
}