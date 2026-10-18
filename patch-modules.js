const fs = require('fs');
let c = fs.readFileSync('src/data/encyclopediaCurriculum.ts', 'utf8');
// Replace the first module's fields to add full data (only tokenization-basics missing quiz/flashcards/keyNumbers)
const marker = '    relatedModuleIds: ["tokenization-basics", "embeddings-vector-db", "rag-patterns"],';
const replacement = `    relatedModuleIds: ["tokenization-basics", "embeddings-vector-db", "rag-patterns"],
    interactiveVisual: "none",
    flashcards: [
      { cardId: "tok-1", front: "What does BPE stand for?", back: "Byte Pair Encoding — the subword tokenizer used by most open LLMs.", conceptTag: "tokenization-basics", moduleId: "tokenization-basics" },
      { cardId: "tok-2", front: "Why is vocabulary size a design trade-off?", back: "Small vocab creates shorter sequences; large vocab improves representation of rare languages.", conceptTag: "tokenization-basics", moduleId: "tokenization-basics" },
    ],
    quiz: [
      { id: "tok-q1", prompt: "What does BPE stand for?", options: [{ id: "a", text: "Byte Pair Encoding", correct: true }, { id: "b", text: "Binary Pair Encoding", correct: false }, { id: "c", text: "Base Pair Encoding", correct: false }], explanation: "Byte Pair Encoding is the standard subword tokenizer.", conceptTag: "tokenization-basics" },
      { id: "tok-q2", prompt: "What trade-off does vocabulary size create?", options: [{ id: "a", text: "Sequence length vs language coverage", correct: true }, { id: "b", text: "CPU vs memory only", correct: false }, { id: "c", text: "Speed vs reliability", correct: false }], explanation: "Smaller vocab = shorter sequences; larger vocab = broader language coverage.", conceptTag: "tokenization-basics" },
    ],
    keyNumbers: [
      { value: "32k", label: "Typical vocabulary size (GPT-style)", note: "Balances sequence length and language coverage." },
      { value: "128-256", label: "Virtual nodes per server", note: "Even spread improves load balance on small fleets." },
      { value: "~1.05x", label: "Arc spread at scale", note: "Near-perfect load balance with consistent hashing at scale." },
    ],`;
// Only replace the first occurrence (tokenization-basics module)
const firstIndex = c.indexOf(marker);
if (firstIndex !== -1) {
  c = c.substring(0, firstIndex) + replacement + c.substring(firstIndex + marker.length);
}
fs.writeFileSync('src/data/encyclopediaCurriculum.ts', c);
console.log('patched first module');
