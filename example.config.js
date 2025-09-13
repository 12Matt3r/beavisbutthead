// example.config.js
//
// This file is an example of the configuration needed for the application.
// To use the application, you must:
//
// 1. RENAME this file to `config.js`.
//
// 2. CONFIGURE the settings below with your own API keys and endpoints.
//
// IMPORTANT:
// DO NOT commit `config.js` to version control, as it will contain your
// secret API keys. The `.gitignore` file is already set up to ignore
// `config.js` for you.

// This global object will be used to configure the application.
window.APP_CONFIG = {
  // --------------------------------------------------------------------------
  // ELEVENLABS CONFIGURATION
  //
  // This is your ElevenLabs API key, which is required for the text-to-speech
  // feature to work. You can get a free API key at https://elevenlabs.io/.
  //
  // IMPORTANT: This is a SECRET key. Do not share it with anyone.
  // --------------------------------------------------------------------------
  elevenLabsApiKey: "YOUR_ELEVENLABS_API_KEY",

  // --------------------------------------------------------------------------
  // LARGE LANGUAGE MODEL (LLM) CONFIGURATION
  //
  // The application uses a large language model (LLM) to generate commentary
  // from Beavis and Butt-Head. It is compatible with any LLM that exposes an
  // OpenAI-compatible API endpoint.
  //
  // For more information on how to set up a local LLM, see:
  // https://github.com/websim-ai/engine
  //
  // --------------------------------------------------------------------------
  llmApi: {
    // The base URL of the LLM API endpoint.
    baseUrl: "http://127.0.0.1:8008/v1",

    // The API key for the LLM API, if required.
    apiKey: "not-needed",
  },
};
