export class RequestBodyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RequestBodyError'
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyError('Ukuran request terlalu besar.')
  }
  if (!request.body) throw new RequestBodyError('Body request tidak valid.')

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel()
        throw new RequestBodyError('Ukuran request terlalu besar.')
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof RequestBodyError) throw error
    throw new RequestBodyError('Body request tidak valid.')
  } finally {
    reader.releaseLock()
  }
}
