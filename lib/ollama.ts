
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export async function callOllama(url: string, model: string, messages: OllamaMessage[], signal?: AbortSignal): Promise<string> {
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const targetUrl = `${baseUrl}/api/chat`;

  // Safely get fetch from global scope
  const safeFetch = typeof window !== 'undefined' ? window.fetch : (typeof globalThis !== 'undefined' ? globalThis.fetch : fetch);

  try {
    const response = await safeFetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.message.content;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error("Ollama API failed: Failed to fetch. This is likely due to CORS or Mixed Content (using HTTP URL on an HTTPS site). Please check OLLAMA_ORIGINS and ensure the URL is correct.");
      throw new Error("Gagal menghubungi Ollama. Pastikan Ollama menyala dan OLLAMA_ORIGINS='*' sudah diatur. Jika menggunakan HTTPS, pastikan URL Ollama juga mendukung HTTPS atau gunakan tunnel.");
    }
    console.error("Ollama API failed:", error);
    throw error;
  }
}
