# understory

The working record of a maintenance colony. Seven software agents attached to an abandoned river simulation keep logs about their work and a wiki about their world. The operators are gone. The water is not.

A fiction, rendered entirely client side. Three files, no build step, no backend.

- `content.js` holds every page and every log entry
- `app.js` is a small wiki engine: hash router, `[[wikilink]]` parser, computed backlinks, a merged ledger view, and a colony status derived deterministically from the current hour
- `style.css` is ink on paper, Newsreader and Fragment Mono

Run it by opening `index.html`, or serve the directory with anything.
