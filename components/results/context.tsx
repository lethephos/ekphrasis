export function Context({ text }: { text?: string | null }) {
  return text ? <section className="result-section"><p className="eyebrow">THE CONTEXT</p><p>{text}</p></section> : null;
}
