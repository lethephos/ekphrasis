export function SourceAnnotation({ name, url }: { name: string; url: string | null }) {
  return <p className="source-annotation">{url ? <a href={url} target="_blank" rel="noreferrer">Source · {name}</a> : <>Source · {name}</>}</p>;
}