# Nevermind landing page

A static HTML/CSS/JavaScript site. No build or dependency installation needed.

Extract the whole ZIP, then double-click `index.html`. The page and animated
3D mascot work directly from disk, without a server. Keep the files and folders
together. The separate `nevermind-standalone.html` download contains everything
in one file and can be opened or moved on its own.

For GitHub Pages, upload the folder contents into the publishing directory,
with `index.html` at its root. No build step is required.
Optional local HTTP preview: `python3 -m http.server 4173`.

- `index.html`: content and accessible HTML.
- `style.css`: layout, responsive styles and reveal transitions.
- `site.js`: native-scroll timeline, four chapter stops, task demo and floating-motion toggle.
- `mascot.js`: floating 3D mascot, pointer response and completion reaction.
- `assets/mascot.bundle.js`: ready-to-use classic script with Three.js and mesh included, compatible with direct file opening and hosting.
- `build-portable.py`: optional Python 3 build script; regenerates the bundle and standalone HTML after source changes.
- `assets/mascot.bin`: precomputed mesh, derived from the app's existing mascot.
- `bake-mascot.mjs`: optional mesh source; regenerate with Node.js.
- `screens/02-dump.jpg`, `01-one-task.jpg`, `05-momentum.jpg`: three topic-only crops, shown sequentially inside the pinned viewport. Status bars and navigation remain outside the crops.

The story pins below the navigation for roughly five screenfuls of native scrolling. Screens enter from alternating directions, reverse when scrolling back, then release naturally into the FAQ. Chapter buttons offer direct navigation.

Reduced-motion preferences switch to a readable, unpinned sequence. The floating mascot can be paused independently.
An image fallback remains available if WebGL or asset loading fails.
The example task interaction is a demo and stores no data.

The App Store status is intentionally not a download button until a real
listing URL is provided. Privacy links retain the existing production domain.

Current visual direction: warm cream mascot with dark eyes, clean chapter-tinted backgrounds, and larger rounded supporting type. The mascot shrinks through a full scroll-driven flip between chapters 01 and 02. Between 02 and 03 it crosses to the right as the progress screen moves left and its copy moves right. On mobile, copy remains stacked and the horizontal travel is reduced.
