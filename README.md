# Latency Topology Visualizer

Latency Topology Visualizer is a globe-centered operations dashboard for exploring latency between cryptocurrency exchanges and cloud regions in a dense, command-center style interface built with Next.js and TypeScript.

## Overview

The application combines a central 3D globe with telemetry rails, a top status strip, and a bottom data dock so operators can inspect routes, filter visible links, and compare latency behavior from one integrated view.
The current build emphasizes a production-style dashboard shell, shared filtering behavior, truthful counts, and performance-aware rendering patterns rather than a generic admin layout.

## Features

- Globe-first dashboard composition with a framed operations-board layout.
- Shared visibility/filtering model across globe arcs, markers, counts, and table views.
- Top telemetry strip with live status and route summary surfaces.
- Left and right contextual rails for controls, route details, and summary panels.
- Bottom dock with sortable route table and synchronized selection behavior.
- TypeScript-based Next.js App Router structure suitable for scalable frontend organization.

## Stack

- Next.js App Router for the application shell and routing conventions.
- TypeScript for stronger safety and maintainable frontend code organization.
- React-based UI and scene integration for dashboard surfaces and interactions.
- A modular project structure with app, components, hooks, lib, and types directories consistent with scalable Next.js frontend practices.

## Project structure

```text
src/
  app/                # App Router entry points and page mounting
  components/         # Layout, scene, panel, table, and UI components
  hooks/              # Custom hooks for snapshots, filters, and integration logic
  lib/                # Shared domain logic, scene helpers, data shaping, and stores
  styles/             # Global styling and design tokens
  types/              # Shared TypeScript domain types
  tests/              # Functional, render, DOM, and regression checks
```

This structure keeps routing, reusable components, shared logic, and domain types separated, which is a common recommendation for maintainable Next.js applications.

## Getting started

### Prerequisites

- Node.js 22+ or a newer LTS runtime.
- npm, pnpm, or yarn.

### Install

```bash
git clone <your-repository-url>
cd <your-project-folder>
npm install
```

A good README should provide copy-paste-ready setup instructions so new contributors can reproduce the local environment quickly.

### Run locally

```bash
npm run dev
```

Then open the local development URL printed by Next.js in the terminal.

### Production build

```bash
npm run build
npm run start
```

## Usage

Use the dashboard as a live exploration surface:

- Rotate and inspect the globe-centered route topology.
- Filter by provider, band, exchange, or layer visibility.
- Select a route from the table or visualization to inspect synced contextual details.
- Use the bottom dock to sort and compare visible routes.

READMEs are most useful when they explain both what the project does and how someone should interact with it after setup.[6]

## Development notes

The intended architecture keeps hot-path visualization updates separate from slower DOM updates so the dashboard remains responsive as telemetry changes.
The project should continue to prefer shared domain logic, centralized visibility rules, and narrowly scoped UI updates over duplicated panel-specific logic.[7]

## Scripts

```bash
npm run dev        # Start local development server
npm run build      # Create production build
npm run start      # Run production server
npm run test       # Run test suite (if configured in this repo)
npm run check      # Run combined verification / checks (if configured)
```

Keep this section aligned with the actual package scripts in the repository so the README stays trustworthy and reproducible.

## Quality checklist

Before merging major changes, verify:

- Filters stay consistent across globe, panels, counts, and table.
- Selection and deselection work from every supported path.
- Visible counts match actual rendered/visible data.
- Layout still preserves the globe-first command-center composition.
- No unnecessary scene re-renders or cleanup regressions are introduced.

Clear, updated README guidance reduces onboarding friction and helps preserve project quality over time.[6]

## Contributing

When contributing, prefer small focused changes, keep naming domain-specific, avoid duplicating filtering logic, and update the README whenever setup, scripts, or architecture assumptions change.[6]

## License

Add the project license here, for example MIT, Apache-2.0, or the appropriate internal/proprietary notice for the repository.[6]