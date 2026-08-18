/** Raw request body as a string — needed wherever a signature is verified
 *  against the exact bytes (see send-reminder.js), since Vercel's automatic
 *  JSON body parsing would otherwise consume the stream first. */
export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
