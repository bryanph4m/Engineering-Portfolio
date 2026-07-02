import Document from './Document'
import { DOCUMENTS } from '../documents/registry'

// Lays out every interactive document on the desk. Order is irrelevant —
// each one owns its resting pose from the registry.
export default function Documents() {
  return (
    <group>
      {DOCUMENTS.map((doc) => (
        <Document key={doc.id} doc={doc} />
      ))}
    </group>
  )
}
