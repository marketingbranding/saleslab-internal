
  ----------------------
  
  The Google Gen AI JavaScript SDK is designed for
> TypeScript and JavaScript developers to build applications powered by 
Gemini. The SDK
> supports both the [Gemini Developer 
API](https://ai.google.dev/gemini-api/docs)
  and [Vertex 
AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/overview).
  
> The Google Gen AI SDK is designed to work with Gemini 2.0+ features.
  
  > [!CAUTION]
  > **API Key Security:** Avoid exposing API keys in client-side code.
  
  ```typescript
  import {GoogleGenAI} from '@google/genai';
> const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
> const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
  
  async function main() {
    const response = await ai.models.generateContent({
>     model: 'gemini-2.5-flash',
      contents: 'Why is the sky blue?',
    });
    console.log(response.text);
  ## Initialization
  
  The Google Gen AI SDK provides support for both the
> [Google AI Studio](https://ai.google.dev/gemini-api/docs) and
  [Vertex 
AI](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/overview)
>  implementations of the Gemini API.
  
> ### Gemini Developer API
  
  For server-side applications, initialize using an API key, which can
  be acquired from [Google AI Studio](https://aistudio.google.com/apikey):
  
  ```typescript
  import { GoogleGenAI } from '@google/genai';
> const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
  ```
  
  #### Browser
  
  ```typescript
  import { GoogleGenAI } from '@google/genai';
> const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
  ```
  
  ### Vertex AI
  
  For NodeJS environments, you can create a client by configuring the necessary
  environment variables. Configuration setup instructions depends on whether
> you're using the Gemini Developer API or the Gemini API in Vertex AI.
  
> **Gemini Developer API:** Set `GOOGLE_API_KEY` as shown below:
  
  ```bash
  export GOOGLE_API_KEY='your-api-key'
  ```
  
> **Gemini API on Vertex AI:** Set `GOOGLE_GENAI_USE_VERTEXAI`,
  `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`, as shown below:
  
  ```bash
  });
  ```
  
> To set the API version to `v1alpha` for the Gemini Developer API:
  
  ```typescript
  const ai = new GoogleGenAI({
>     apiKey: 'GEMINI_API_KEY',
      apiVersion: 'v1alpha'
  });
  ```
    Upload `files` to the API and reference them in your prompts.
    This reduces bandwidth if you use a file many times, and handles files too
    large to fit inline with your prompt.
> - [`ai.live`](https://googleapis.github.io/js-genai/release_docs/classes/live
.Live.html):
>   Start a `live` session for real time interaction, allows text + audio + 
video
    input, and text or audio output.
  
  ## Samples
  
  ```typescript
  import {GoogleGenAI} from '@google/genai';
> const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
> const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
  
  async function main() {
    const response = await ai.models.generateContentStream({
>     model: 'gemini-2.5-flash',
      contents: 'Write a 100-word poem.',
    });
    for await (const chunk of response) {
  
  ### Function Calling
  
> To let Gemini to interact with external systems, you can provide
  `functionDeclaration` objects as `tools`. To use these tools it's a 4 step
  
  1. **Declare the function name, description, and parametersJsonSchema**
  
  ```typescript
  import {GoogleGenAI, FunctionCallingConfigMode, FunctionDeclaration, Type} 
from '@google/genai';
> const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  async function main() {
    const controlLightDeclaration: FunctionDeclaration = {
      },
    };
  
>   const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
    const response = await ai.models.generateContent({
>     model: 'gemini-2.5-flash',
      contents: 'Dim the lights so the room feels cozy and warm.',
      config: {
        toolConfig: {
  
  // Send request to the model with MCP tools
  const response = await ai.models.generateContent({
>   model: "gemini-2.5-flash",
    contents: `What is the weather in London in ${new 
Date().toLocaleDateString()}?`,
    config: {
      tools: [mcpToTool(client)],  // uses the session, will automatically 
call the tool using automatic function calling
  
  ```typescript
  import {GoogleGenAI} from '@google/genai';
> const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
> const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
  
  async function main() {
    await ai.models.generateContent({
  > **Warning:** The Interactions API is in **Beta**. This is a preview of an
  experimental feature. Features and schemas are subject to **breaking 
changes**.
  
> The Interactions API is a unified interface for interacting with Gemini 
models
  and agents. It simplifies state management, tool orchestration, and 
long-running
  tasks.
  
> See the [documentation 
site](https://ai.google.dev/gemini-api/docs/interactions)
  for more details.
  
  ### Basic Interaction
  
  ```typescript
  const interaction = await ai.interactions.create({
>     model: 'gemini-2.5-flash',
      input: 'Hello, how are you?',
  });
  console.debug(interaction);
  ```typescript
  // 1. First turn
  const interaction1 = await ai.interactions.create({
>     model: 'gemini-2.5-flash',
      input: 'Hi, my name is Amir.',
  });
  console.debug(interaction1);
  
  // 2. Second turn (passing previous_interaction_id)
  const interaction2 = await ai.interactions.create({
>   model: 'gemini-2.5-flash',
    input: 'What is my name?',
    previous_interaction_id: interaction1.id,
  });
  // const base64Image = ...;
  
  const interaction = await ai.interactions.create({
>   model: 'gemini-2.5-flash',
    input: [
      { type: 'text', text: 'Describe the image.' },
      { type: 'image', data: base64Image, mime_type: 'image/png' },
  
  // 2. Send the request with tools
  let interaction = await ai.interactions.create({
>   model: 'gemini-2.5-flash',
    input: 'What is the weather in Mountain View, CA?',
    tools: [
      {
  
      // Send result back to the model
      interaction = await ai.interactions.create({
>       model: 'gemini-2.5-flash',
        previous_interaction_id: interaction.id,
        input: [
          {
  
  ```typescript
  const interaction = await ai.interactions.create({
>   model: 'gemini-2.5-flash',
    input: 'Who won the last Super Bowl',
    tools: [{ type: 'google_search' }],
  });
  
  ```typescript
  const interaction = await ai.interactions.create({
>   model: 'gemini-2.5-flash',
    input: 'Calculate the 50th Fibonacci number.',
    tools: [{ type: 'code_execution' }],
  });
  import * as fs from 'fs';
  
  const interaction = await ai.interactions.create({
>   model: 'gemini-3-pro-image-preview',
    input: 'Generate an image of a futuristic city.',
    response_modalities: ['image'],
  });
  This SDK (`@google/genai`) is Google DeepmindΓÇÖs "vanilla" SDK for its 
generative
  AI offerings, and is where Google Deepmind adds new AI features.
  
> Models hosted either on the [Vertex AI platform](https://cloud.google.com/ver
tex-ai/generative-ai/docs/learn/overview) or the [Gemini Developer 
platform](https://ai.google.dev/gemini-api/docs) are accessible through this 
SDK.
  
  Other SDKs may be offering additional AI frameworks on top of this SDK, or 
may
  be targeting specific project environments (like Firebase).
  
  The `@google/generative_language` and `@google-cloud/vertexai` SDKs are 
previous
> iterations of this SDK and are no longer receiving new Gemini 2.0+ features.


