'use client';

import { useState } from 'react';
import { Uploader } from '../components/upload/uploader';
import { MatchCard } from '../components/results/match-card';
import { Context } from '../components/results/context';
import { Detail } from '../components/results/detail';
import { RelatedReading } from '../components/results/related-reading';
import { NoMatch } from '../components/results/no-match';

export default function HomePage() {
  const [result, setResult] = useState<any>(null);
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">EKPHRASIS</p>
        <h1 id="page-title">Identify a painting from a photograph.</h1>
        <p className="lede">Ekphrasis compares visual and catalog evidence before returning a sourced match.</p>
        <Uploader onResult={setResult} />
      </section>
      {result?.status === 'match' ? <section className="results">
        <MatchCard result={result} />
        <Context text={result.context} />
        <Detail text={result.detail} />
        <RelatedReading items={result.related_reading} />
      </section> : result?.status === 'no_match' ? <section className="results"><NoMatch /></section> : null}
    </main>
  );
}
