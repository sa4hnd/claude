const ASSEMBLYAI_API_KEY = '625d9311c9a8442ca0254b88ea25796a';
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

export interface TranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string | null;
  error?: string;
}

export async function uploadAudio(audioData: string): Promise<string> {
  console.log('[AssemblyAI] Uploading audio...');

  const base64Data = audioData.includes(',') ? audioData.split(',')[1] : audioData;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`);
  }

  const data = await response.json();
  console.log('[AssemblyAI] Upload completed, URL:', data.upload_url);
  return data.upload_url;
}

export async function createTranscription(audioUrl: string): Promise<string> {
  console.log('[AssemblyAI] Creating transcription for:', audioUrl);

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed: ${await response.text()}`);
  }

  const data = await response.json();
  console.log('[AssemblyAI] Transcription ID:', data.id);
  return data.id;
}

export async function getTranscriptionStatus(transcriptId: string): Promise<TranscriptionResult> {
  console.log('[AssemblyAI] Checking status for:', transcriptId);

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
    method: 'GET',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.status,
    text: data.text,
    error: data.error,
  };
}

export async function transcribeAudio(
  audioUrl: string,
  onProgress?: (status: string) => void
): Promise<string> {
  const transcriptId = await createTranscription(audioUrl);
  onProgress?.('Processing...');

  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const result = await getTranscriptionStatus(transcriptId);

    if (result.status === 'completed') {
      console.log('[AssemblyAI] Transcription completed');
      return result.text || '';
    }

    if (result.status === 'error') {
      throw new Error(result.error || 'Transcription failed');
    }

    onProgress?.(result.status === 'queued' ? 'Queued...' : 'Processing...');
    attempts++;
  }

  throw new Error('Transcription timeout');
}

export async function transcribeFromBase64(
  base64Audio: string,
  onProgress?: (status: string) => void
): Promise<string> {
  onProgress?.('Uploading...');
  const uploadUrl = await uploadAudio(base64Audio);
  return transcribeAudio(uploadUrl, onProgress);
}
