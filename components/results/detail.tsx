export function Detail({ text }: { text?: string | null }) {
  return text ? <section className="result-section"><p className="eyebrow">THE DETAIL</p><p>{text}</p></section> : null;
}
