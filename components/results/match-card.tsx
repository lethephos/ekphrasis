export function MatchCard({ result }: { result: any }) {
  return <article className="result-card">
    <img src={result.source.imageUrl} alt={result.artwork.title} />
    <div className="result-copy">
      <p className="eyebrow">THE MATCH</p>
      <h2>{result.artwork.title}</h2>
      <dl>
        <div><dt>Artist</dt><dd>{result.artwork.artist}</dd></div>
        <div><dt>Year</dt><dd>{result.artwork.year ?? 'Unknown'}</dd></div>
        <div><dt>Medium</dt><dd>{result.artwork.medium ?? 'Unknown'}</dd></div>
        {result.artwork.style ? <div><dt>Style</dt><dd>{result.artwork.style}</dd></div> : null}
      </dl>
      <a href={result.source.artworkUrl} target="_blank" rel="noreferrer">View source</a>
    </div>
  </article>;
}
