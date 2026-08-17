export default function AppFooter() {
  return (
    <footer className="app-footer">
      <p className="app-footer-hint">
        Click a cell to add a node. Drag between nodes to connect. Select a connection, then Style →
        Customize selected connection for neck/pinch. Right-click removes. Cmd/Ctrl+Z undoes. Keys
        1–4 set S/M/L/XL.
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
