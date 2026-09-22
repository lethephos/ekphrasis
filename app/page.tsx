export default function HomePage() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">EKPHRASIS</p>
        <h1 id="page-title">Identify a painting from a photograph.</h1>
        <p className="lede">
          Upload an artwork photo and Ekphrasis will compare visual and catalog evidence
          before returning a sourced match.
        </p>
        <div className="upload-placeholder" aria-label="Image upload area">
          <strong>Image upload</strong>
          <span>API wiring comes next.</span>
        </div>
      </section>
    </main>
  );
}
