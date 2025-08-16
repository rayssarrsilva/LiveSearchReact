// LiveSearch.js  (carregado via <script type="text/babel" src="LiveSearch.js">)

const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

function highlight(text, q) {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{p}</mark>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function LiveSearch() {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [active, setActive] = React.useState(0);
  const debounced = useDebounced(q, 350);

  React.useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResults([]);
      setError("");
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true); setError("");

        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(debounced)}&limit=12`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Falha ao buscar livros");
        const data = await res.json();

        const mapped = (data.docs || []).map(d => {
          const title = d.title || "Sem título";
          const author = (d.author_name && d.author_name[0]) || "Autor desconhecido";
          const year = d.first_publish_year || "—";
          const workUrl = d.key ? `https://openlibrary.org${d.key}` : "https://openlibrary.org";
          // imagem de capa (quando disponível)
          const cover = d.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
            : null;

          return { title, author, year, url: workUrl, cover };
        });

        setResults(mapped);
        setActive(0);
      } catch (e) {
        if (e.name !== "AbortError") setError("Não foi possível carregar os resultados.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debounced]);

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % results.length); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(i => (i - 1 + results.length) % results.length); }
    if (e.key === "Enter")     { window.open(results[active].url, "_blank"); }
  };

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="p-5 border-b">
        <label htmlFor="search" className="sr-only">Buscar livros</label>
        <input
          id="search"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Busque títulos, autores… (ex.: javascript, design, romance)"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-2">↑/↓ navega • Enter abre • mínimo 2 letras</p>
      </div>

      {loading && <p className="p-5 text-gray-600">Carregando…</p>}
      {error && <p className="p-5 text-red-600">{error}</p>}

      {!loading && !error && (
        <ul className="divide-y">
          {results.length ? results.map((r, i) => (
            <li key={r.url+i}
                className={`p-5 cursor-pointer ${i===active ? "bg-indigo-50" : ""}`}
                onMouseEnter={()=>setActive(i)}
                onClick={()=>window.open(r.url, "_blank")}>
              <div className="flex gap-4">
                <div className="w-12 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                  {r.cover
                    ? <img src={r.cover} alt={`Capa de ${r.title}`} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full grid place-items-center text-gray-400 text-xs">sem capa</div>}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{highlight(r.title, debounced)}</h3>
                  <p className="text-gray-600">
                    {highlight(r.author, debounced)} {r.year !== "—" && <>• <span className="text-gray-500">{r.year}</span></>}
                  </p>
                </div>
              </div>
            </li>
          )) : debounced.length >= 2 ? (
            <li className="p-6 text-gray-700">Nada encontrado para “{q}”.</li>
          ) : (
            <li className="p-6 text-gray-500">Digite ao menos 2 caracteres…</li>
          )}
        </ul>
      )}
    </section>
  );
}

// expõe o componente no escopo global para o index.html
window.LiveSearch = LiveSearch;
