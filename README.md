# nativeTemplate — Simple Expo / React Native Layout

A minimal, file-based React Native app layout scaffolded with Expo. This README explains the repository structure, how the layout and routing are organized, and quick steps to run and extend the app.

**Live demo:** Local development via Expo (see Getting started).

**Stack:** Expo, React Native, TypeScript (config present), Expo Router (file-based routing)

## Project Overview

- **Purpose:** Provide a small, opinionated app layout that demonstrates a top-level layout, route pages, shared components, styles, and asset organization.
- **Target audience:** Developers starting a new Expo app who want a compact, easy-to-read structure to extend.

## Key Files & Layout

Top-level app directory layout (simplified):

- `app/` — primary app source (file-based routing)
  - `_layout.tsx` — app shell / shared layout used by routes
  - `index.tsx` — root route / entry screen
  - `components/` — reusable UI components
  - `pages/` — route pages (extra routes live here)
  - `default.tsx` — fallback route or default content
  - `styles/` — shared style tokens and global styles
  - `types/` — shared TypeScript types

- `assets/` — images and static assets used by the app

This layout favors clarity over complexity: the `_layout.tsx` defines common chrome (header, nav, safe-area) and each route file under `app/` becomes a navigable page.

## Getting started

1. Install dependencies

```bash
npm install
```

2. Start the Expo dev server

```bash
npx expo start
```

3. Open on device/emulator using the QR code or emulator options shown by Expo.

Notes:
- Use the Expo client, a simulator, or a development build for native modules.
- The project uses file-based routing — add files under `app/` to create new routes.

## Development tips

- Add UI components to `app/components` and import them into routes or into `_layout.tsx`.
- Keep global style tokens in `app/styles` and small per-component styles alongside components.
- Put shared TypeScript interfaces in `app/types` to keep props and data shapes consistent.

## Scripts

- `npm install` — install dependencies
- `npx expo start` — start the dev server

(Other scripts from the original template remain available if present in `package.json`.)

## Extending the Template

- Add new routes: create `app/yourRoute.tsx` (or a folder with `index.tsx`).
- Add nested layouts: create additional `_layout.tsx` files inside subfolders to scope layout behavior.
- Add assets to `assets/images` and reference via `import` or `Expo.Asset`.

## Contributing

Contributions are welcome for improvements and small examples. Open an issue or PR with changes.

## License

This template is provided as-is. Add a LICENSE file to clarify usage if you plan to publish.

---

README updated to document the simple app layout and how to work with the project. See the `app/` directory for route and layout code.
