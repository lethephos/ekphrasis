export function NoMatch({ degraded }: { degraded: boolean }) {
  return <section><h2>We couldn't identify this artwork</h2><p>{degraded ? "Some museum sources were unavailable, so the result may be incomplete." : "There was not enough independent evidence to make a reliable identification."}</p></section>;
}