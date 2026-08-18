export default function AppFooter() {
  return (
    <footer className="app-footer">
      <p className="app-footer-hint">
        Graph: click a cell to add, drag between nodes to connect, right-click to remove. Form:
        style and export the mark; a selected connection can override neck/pinch. Cmd/Ctrl+Z undoes.
      </p>

      <div className="app-footer-links">
        <p className="app-footer-meta">
          <a className="text-link" href="/impressum">
            Impressum
          </a>
          {' · '}
          <a className="text-link" href="/datenschutz">
            Datenschutz
          </a>
          {' · '}
          <a
            className="text-link"
            href="https://www.ruhmetc.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ruhm etc.
          </a>
          {' · '}
          <a className="text-link" href="/api/logout">
            Log out
          </a>
        </p>
      </div>
    </footer>
  );
}
