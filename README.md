# Metaball Brandmark Editor

Rekonstruierte, erweiterbare Quellfassung des Metaball-Editors von
`metaball-editor.vercel.app`. Aus dem ausgelieferten Production-Bundle
zurückgebaut (das Deployment enthält keine Sourcemaps) und gegen das
Original verifiziert.

```bash
npm install
npm run dev
```

## Verifikation gegen das Original

Bei identischem Dokument (Preset „Loop") stimmen überein:

| Artefakt | Original | Diese Fassung |
| --- | --- | --- |
| Gerendertes Canvas-SVG | 4830 Zeichen, Hash `2210835909` | identisch |
| Flatten-Export-Pfad | 4638 Zeichen, Hash `563663110` | identisch |

Der Flatten-Pfad ist der schärfste Test: Er durchläuft Rasterung, Blur,
Alpha-Schwellwert, Marching Squares, Douglas–Peucker und Catmull-Rom-Glättung.
Byte-Gleichheit heißt, dass diese Kette exakt reproduziert ist.

## Wie der Effekt funktioniert

Der „Metaball"-Look ist kein Physik-Solver, sondern ein zweistufiger Trick:

1. **Geometrie** (`src/lib/render.ts`): Jeder Node wird zu einem Kreis, jede
   Verbindung zu einer Kapsel (dicke Linie mit runden Enden). Der
   Kapselradius ist `neckFactor · (1 − pinch) · min(rA, rB)`.
2. **Goo-Filter** (`src/components/Canvas.tsx`): Die Gruppe läuft durch
   `feGaussianBlur` + `feColorMatrix`. Die Matrix lässt RGB unangetastet und
   spreizt nur Alpha: `alpha' = alpha · contrast − contrast/2`. Weiche
   Blur-Ränder werden dadurch wieder hart, und zwei benachbarte Blobs
   verschmelzen zu einer organischen Form.

Die vier Style-Regler greifen genau hier an:

| Regler | Feld | Wirkung |
| --- | --- | --- |
| Neck width | `tubeFactor` | Kapseldicke *vor* dem Blur |
| Blur | `gooStd` | `stdDeviation` — Breite der Verschmelzung |
| Contrast | `gooThreshold` | Alpha-Cutoff — höher = schärfere Taille |
| Pinch / merge | `inwardPull` | Blendet Kapseln aus (0 = Hantel, 1 = reiner Metaball) |

`inwardPull` verdünnt die Röhren; damit die Blobs trotzdem verschmelzen,
wird der Blur gegengerechnet: `gooStd · (1 + pinch · 0.65)`
(`effectiveBlur` in `src/lib/geometry.ts`). Jede Verbindung kann `tubeFactor`
und `inwardPull` lokal überschreiben (`edgeFactors` / `edgePulls`).

## Export

`Copy SVG` / `Export SVG` / `Export PNG` klonen das Live-SVG, entfernen die
`.editor-only`-Overlays und ersetzen im Metaball-Modus die gefilterte Gruppe
durch **einen einzigen `<path>`**. Denn ein SVG-Filter ist nicht überall
verlässlich — Illustrator, Schneidplotter und Stickmaschinen brauchen echte
Konturen. Der Weg dahin (`src/lib/flatten.ts`):

Canvas rastern → `ctx.filter = blur()` → Alpha-Kanal auf
`min(0.95, 0.5 + 0.5/contrast)` schwellen → Marching Squares → Ringe
stitchen → Douglas–Peucker vereinfachen → geschlossene Catmull-Rom-Spline als
kubische Béziers. `fill-rule="evenodd"` sorgt dafür, dass Löcher (z. B. im
„R") Löcher bleiben.

Die Vorschau-Overlay-Checkbox unter „Advanced export" zeigt diesen Pfad als
gestrichelte Linie über dem gefilterten Rendering — so sieht man vor dem
Export, wie gut die Kontur trifft.

> Abweichung vom Original (behoben): Dort blieben bei `Flatten res.` > 1 die
> Pfadkoordinaten im hochskalierten Pixelraum (0…584·res). Hier werden sie
> auf die ViewBox zurückgerechnet — höhere Auflösung bringt nur mehr
> Kontur-Detail, die Ausgabegröße bleibt gleich. Bei `Flatten res.` = 1 ist
> die Ausgabe weiterhin byte-identisch zum Original.

## Aufbau

```
src/
  lib/
    types.ts        Datenmodell (EditorDoc, Node, Edge, Theme)
    constants.ts    Grid-Maße, Größenfaktoren, Defaults
    geometry.ts     Zellraster, Node-Radien/Zentren, Keys, Clamps
    render.ts       Nodes+Edges → Kreise+Kapseln
    flatten.ts      Marching Squares + Glättung (Export-Pipeline)
    document.ts     Defaults, Presets→Doc, localStorage, JSON-I/O
    history.ts      Undo/Redo-Stack (50 Schritte)
    exportImage.ts  SVG/PNG/Clipboard-Export
    presets.ts      R, Loop, Sizes, Empty
  components/
    Canvas.tsx      SVG-Editor: Goo-Filter, Grid, Drag, Selektion
    Toolbar.tsx     Alle Bedienpanels
    Slider.tsx      Range+Zahlenfeld mit Commit-Semantik
    ColorField.tsx  Farbwähler
    Section.tsx     Panel-Überschrift
  App.tsx           State, Handler, Shortcuts, Persistenz
  styles.css        Design-System (Tokens aus theme.css des Originals)
```

### Geometrie

5×5-Grid, 100 px Zellen, 114 px Raster, 14 px Rand → ViewBox 584×584.
Nodes liegen standardmäßig nur im inneren 3×3; „Full grid" öffnet den
äußeren Ring. Größen: S 0.30, M 0.44, L 0.52, XL 0.64 (× 100 px), optional
durch einen freien Radius (20–70) überschreibbar. Pfeiltasten verschieben
einen Node um ±1 px innerhalb seiner Zelle (Shift: 5 px, Limit ±40 px).

### Undo/Redo

`src/lib/history.ts` hält Vergangenheit/Gegenwart/Zukunft mit 50 Schritten.
Wichtig ist die Unterscheidung in `App.tsx`:

- `mutate()` — jede Änderung ist ein eigener Undo-Schritt (Node hinzufügen,
  löschen, Preset).
- `coalesceUpdate()` — Änderungen verschmelzen zu **einem** Schritt, bis
  `commit()` läuft. Slider und Farbwähler nutzen das, damit ein Reglerzug
  nicht 200 Undo-Schritte erzeugt; `onCommit` feuert beim Loslassen.

### Persistenz

Das Dokument liegt unter `metaball-editor-document` im localStorage und wird
bei jeder Änderung geschrieben. `sanitizeDocument()` füllt fehlende Felder
mit Defaults, sodass ältere oder von Hand bearbeitete JSONs sauber laden.

## Erweitern

Der Code ist bewusst so geschnitten, dass die häufigsten Wünsche lokal
bleiben:

- **Neues Preset** → Eintrag in `src/lib/presets.ts`. Mehr braucht es nicht,
  die Toolbar rendert die Liste selbst.
- **Größeres Grid** → `GRID`, `PITCH`, `VIEWBOX` in `constants.ts`; `isInner`
  in `geometry.ts` legt fest, welcher Bereich ohne „Full grid" nutzbar ist.
- **Neuer Style-Parameter** → Feld in `EditorDoc` (`types.ts`), Default in
  `createDocument()` und `sanitizeDocument()` (`document.ts`), Slider in
  `Toolbar.tsx`, Auswertung in `render.ts` oder im Filter in `Canvas.tsx`.
- **Weitere Node-Form** (Quadrat, Raute) → `render.ts` liefert Primitive,
  `Canvas.tsx` zeichnet sie, `flatten.ts` rastert sie. Alle drei Stellen
  müssen die Form kennen, sonst weicht der Export vom Bild ab.
- **Andere Exportgröße** → `VIEWBOX` bestimmt die SVG-Koordinaten,
  `pngScale` nur die Rasterauflösung.

Der `/login`-PIN-Gate, der Footer und die Impressum/Datenschutz-Seiten des
Originals sind Deployment-Beiwerk und hier nicht enthalten.
