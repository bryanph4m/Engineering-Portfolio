// The one place a library is worth it: verifying QStash's JWT-based webhook
// signature by hand is a security-critical footgun, so @upstash/qstash's
// Receiver does the verification and its Client does the publish/cancel.
import { Client, Receiver } from '@upstash/qstash'

// The SDK defaults to QStash's EU endpoint; this account's token is
// provisioned in the US region, so the base URL has to be set explicitly.
const client = new Client({ token: process.env.QSTASH_TOKEN, baseUrl: 'https://qstash-us-east-1.upstash.io' })

export async function scheduleAt(url, body, notBefore) {
  const { messageId } = await client.publishJSON({
    url,
    body,
    notBefore: Math.floor(notBefore.getTime() / 1000),
  })
  return messageId
}

export async function cancelMessage(messageId) {
  if (!messageId) return
  try {
    await client.messages.delete(messageId)
  } catch {
    // Already delivered or already gone — cancellation is best-effort.
  }
}

export async function verifyQstashRequest(req, rawBody) {
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  })
  const signature = req.headers['upstash-signature']
  if (!signature) return false
  try {
    return await receiver.verify({ signature, body: rawBody })
  } catch {
    return false
  }
}
