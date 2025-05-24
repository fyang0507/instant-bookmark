import React from 'react';
import {
  ActionPanel,
  Action,
  List,
  Form,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
  closeMainWindow,
  Clipboard,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fetch from "node-fetch";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { useState } from "react";
import os from "os"; // For tmpdir

interface IngestBase {
  type: 'url' | 'image';
  url?: string;
  data_b64?: string;
  thoughts?: string;
}

interface IngestDataAutoGenerate {
  autoGenerate: true;
  // title and summary should not be sent by the client
}

interface IngestDataManual {
  autoGenerate: false;
  title: string;
  summary: string;
}

type IngestBody = IngestBase & (IngestDataAutoGenerate | IngestDataManual);

const API_URL = "https://instant-bookmark.fredyang0507.workers.dev/api/ingest";

interface Preferences {
  apiKey: string;
}

async function ingestData(body: IngestBody) {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  if (!apiKey) {
    await showToast(Toast.Style.Failure, "API Key Not Set", "Please set your API key in the extension preferences.");
    return;
  }

  try {
    await showToast(Toast.Style.Animated, "Processing...", "Saving your data.");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      await showToast(Toast.Style.Failure, "API Error", errorText.slice(0, 200));
    } else {
      await showToast(Toast.Style.Success, "Success!", "Your data has been saved.");
      await closeMainWindow({ clearRootSearch: true });
    }
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, "Request Failed", "Could not connect to the API.");
  }
}

function isValidHttpUrl(string: string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:";
}

async function handleClipboardImage(push: (view: React.ReactElement) => void) {
  try {
    await showToast(Toast.Style.Animated, "Processing Clipboard...", "Reading from clipboard.");
    const clipboardContent = await Clipboard.read();

    if (clipboardContent && clipboardContent.file) {
      const imagePathURI = clipboardContent.file;
      // Convert file URI to a file path
      let imagePath: string;
      try {
        const url = new URL(imagePathURI);
        if (url.protocol === "file:") {
          imagePath = url.pathname;
          // On Windows, pathname might start with an extra '/' like /C:/Users/...
          // Also, decode URI components like %20 for spaces
          imagePath = decodeURIComponent(imagePath);
          if (process.platform === "win32" && imagePath.startsWith("/")) {
            imagePath = imagePath.substring(1);
          }
        } else {
          // Not a local file URI, perhaps treat as a remote URL to download?
          // For now, let's show an error or let it fall through to AppleScript
          await showToast(
            Toast.Style.Failure,
            "Not a Local File",
            "The copied file path is not a local file. Trying AppleScript method..."
          );
          // Trigger fallback to AppleScript by throwing a specific error or returning
          throw new Error("Not a local file URI");
        }
      } catch (e) {
        console.error("Error parsing file URI from clipboard:", e);
        await showToast(
          Toast.Style.Failure,
          "Invalid File Path",
          "Could not understand the copied file path. Trying AppleScript method..."
        );
        // Trigger fallback to AppleScript
        throw e; // Re-throw to let the outer catch handle the AppleScript fallback logic
      }

      const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
      const fileExtension = path.extname(imagePath).toLowerCase();

      if (imageExtensions.includes(fileExtension)) {
        await showToast(Toast.Style.Animated, "Processing Image File...", `Found file: ${path.basename(imagePath)}`);
        const data = await readFile(imagePath);
        const base64Data = data.toString("base64");
        push(<AddThoughtsForm baseImageData={{ type: "image", data_b64: base64Data }} />);
        return;
      } else {
        await showToast(
          Toast.Style.Failure,
          "Not an Image File",
          "The file in the clipboard doesn't appear to be an image. Trying AppleScript method..."
        );
      }
    }

    // If no file path on clipboard or it wasn't an image, try AppleScript method for raw image data
    const tempDir = os.tmpdir();
    const tempImageFilename = `raycast_clipboard_image_${Date.now()}.png`;
    const tempImagePath = path.join(tempDir, tempImageFilename);

    const appleScript = `
      set tempFilePOSIX to (POSIX path of "${tempImagePath}")
      try
        set imgData to the clipboard as «class PNGf»
        set fRef to open for access tempFilePOSIX with write permission
        write imgData to fRef
        close access fRef
        return "success"
      on error
        try
          close access tempFilePOSIX
        end try
        return "error"
      end try
    `;

    await showToast(Toast.Style.Animated, "AppleScript...", "Attempting to save clipboard image via AppleScript.");
    const scriptResult = await runAppleScript(appleScript);

    if (scriptResult === "success") {
      await showToast(Toast.Style.Animated, "Processing Saved Image...", "Reading temporary image file.");
      try {
        const data = await readFile(tempImagePath);
        const base64Data = data.toString("base64");
        push(<AddThoughtsForm baseImageData={{ type: "image", data_b64: base64Data }} />);
      } catch (readError) {
        console.error("Error reading temp image file:", readError);
        await showToast(Toast.Style.Failure, "Read Error", "Could not read the temporary image file.");
      } finally {
        try {
          await unlink(tempImagePath); // Clean up the temporary file
        } catch (unlinkError) {
          console.error("Error deleting temp image file:", unlinkError);
          // Not a critical error to show to user, but log it.
        }
      }
    } else {
      console.error("AppleScript error or no PNG on clipboard:", scriptResult);
      await showToast(
        Toast.Style.Failure,
        "No Image Data",
        "Could not get image data from clipboard via AppleScript. Ensure image is copied."
      );
    }
  } catch (error) {
    console.error("Clipboard processing error:", error);
    await showToast(Toast.Style.Failure, "Clipboard Error", "Failed to process image from clipboard.");
  }
}

function SaveUrlForm() {
  const { pop } = useNavigation();
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  async function handleSubmit(values: { url: string; thoughts?: string }) {
    if (!isValidHttpUrl(values.url)) {
      await showToast(Toast.Style.Failure, "Invalid URL", "Please enter a valid HTTP/HTTPS URL.");
      return;
    }

    let payload: IngestBody;
    if (autoGenerate) {
      payload = {
        type: "url",
        url: values.url,
        thoughts: values.thoughts,
        autoGenerate: true,
      };
    } else {
      if (!title.trim() || !summary.trim()) {
        await showToast(Toast.Style.Failure, "Missing Fields", "Title and Summary are required when auto-generation is off.");
        return;
      }
      payload = {
        type: "url",
        url: values.url,
        thoughts: values.thoughts,
        autoGenerate: false,
        title,
        summary,
      };
    }
    await ingestData(payload);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://example.com" />
      <Form.TextArea id="thoughts" title="Thoughts (Optional)" placeholder="Enter any notes here..." />
      <Form.Checkbox id="autoGenerate" label="Auto-generate Title & Summary" value={autoGenerate} onChange={setAutoGenerate} />
      {!autoGenerate && (
        <>
          <Form.TextField id="title" title="Title" placeholder="Enter title" value={title} onChange={setTitle} />
          <Form.TextArea id="summary" title="Summary" placeholder="Enter summary" value={summary} onChange={setSummary} />
        </>
      )}
    </Form>
  );
}

function SaveImageForm() {
  const { pop } = useNavigation();
  const [filePath, setFilePath] = useState<string[]>([]);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  async function handleSubmit(values: { thoughts?: string }) {
    if (filePath.length === 0) {
      await showToast(Toast.Style.Failure, "No File Selected", "Please select an image file.");
      return;
    }
    const selectedPath = filePath[0];
    try {
      const data = await readFile(selectedPath);
      const base64Data = data.toString("base64");

      let payload: IngestBody;
      if (autoGenerate) {
        payload = {
          type: "image",
          data_b64: base64Data,
          thoughts: values.thoughts,
          autoGenerate: true,
        };
      } else {
        if (!title.trim() || !summary.trim()) {
          await showToast(Toast.Style.Failure, "Missing Fields", "Title and Summary are required when auto-generation is off.");
          return;
        }
        payload = {
          type: "image",
          data_b64: base64Data,
          thoughts: values.thoughts,
          autoGenerate: false,
          title,
          summary,
        };
      }
      await ingestData(payload);
      pop();
    } catch (error) {
      console.error(error);
      await showToast(Toast.Style.Failure, "Error Reading File", "Could not read the image file. Check the path.");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="imagePath"
        title="Image File"
        allowMultipleSelection={false}
        onChange={setFilePath}
        info="Select an image file (PNG, JPG, GIF, etc.)"
        canChooseDirectories={false}
      />
      <Form.TextArea id="thoughts" title="Thoughts (Optional)" placeholder="Enter any notes here..." />
      <Form.Checkbox id="autoGenerate" label="Auto-generate Title & Summary" value={autoGenerate} onChange={setAutoGenerate} />
      {!autoGenerate && (
        <>
          <Form.TextField id="title" title="Title" placeholder="Enter title" value={title} onChange={setTitle} />
          <Form.TextArea id="summary" title="Summary" placeholder="Enter summary" value={summary} onChange={setSummary} />
        </>
      )}
    </Form>
  );
}

// New component for adding thoughts to clipboard image
interface AddThoughtsFormProps {
  baseImageData: {
    type: "image";
    data_b64: string;
  };
}

function AddThoughtsForm({ baseImageData }: AddThoughtsFormProps) {
  const { pop } = useNavigation();
  const [thoughts, setThoughts] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  async function handleSubmit() {
    let payload: IngestBody;
    if (autoGenerate) {
      payload = {
        ...baseImageData,
        thoughts: thoughts || undefined,
        autoGenerate: true,
      };
    } else {
      if (!title.trim() || !summary.trim()) {
        await showToast(Toast.Style.Failure, "Missing Fields", "Title and Summary are required when auto-generation is off.");
        return;
      }
      payload = {
        ...baseImageData,
        thoughts: thoughts || undefined,
        autoGenerate: false,
        title,
        summary,
      };
    }
    await ingestData(payload);
    pop(); 
    pop(); 
  }

  async function handleSaveWithoutThoughts() {
    let payload: IngestBody;
    if (autoGenerate) {
      payload = {
        ...baseImageData,
        autoGenerate: true,
      };
    } else {
      if (!title.trim() || !summary.trim()) {
        await showToast(Toast.Style.Failure, "Missing Fields", "Title and Summary are required when auto-generation is off.");
        return;
      }
      payload = {
        ...baseImageData,
        autoGenerate: false,
        title,
        summary,
      };
    }
    await ingestData(payload);
    pop();
    pop();
  }

  return (
    <Form
      navigationTitle="Add Thoughts & Details"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Image" onSubmit={handleSubmit} />
          <Action
            title="Save Image Without Thoughts"
            icon={Icon.ChevronRight}
            onAction={handleSaveWithoutThoughts}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="thoughts" title="Thoughts (Optional)" placeholder="Enter any notes here..." value={thoughts} onChange={setThoughts} />
      <Form.Checkbox id="autoGenerate" label="Auto-generate Title & Summary" value={autoGenerate} onChange={setAutoGenerate} />
      {!autoGenerate && (
        <>
          <Form.TextField id="title" title="Title" placeholder="Enter title" value={title} onChange={setTitle} />
          <Form.TextArea id="summary" title="Summary" placeholder="Enter summary" value={summary} onChange={setSummary} />
        </>
      )}
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Instant Bookmark">
      <List.Item
        title="Save URL"
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <Action
              title="Enter URL"
              icon={Icon.TextInput}
              onAction={() => push(<SaveUrlForm />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Save Image from File"
        icon={Icon.Image}
        actions={
          <ActionPanel>
            <Action
              title="Select Image File"
              icon={Icon.Finder}
              onAction={() => push(<SaveImageForm />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Save Image from Clipboard"
        icon={Icon.Clipboard}
        actions={
          <ActionPanel>
            <Action
              title="Process Clipboard"
              icon={Icon.Clipboard}
              onAction={() => handleClipboardImage(push)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
