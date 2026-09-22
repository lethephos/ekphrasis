export function RelatedReading({ items }: { items?: Array<{title:string;url:string}> }) {
  if (!items?.length) return null;
  return <section className="result-section"><p className="eyebrow">RELATED READING</p><ul>{items.map((item) => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></li>)}</ul></section>;
}
