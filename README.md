This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Folder structure


src/
  app/
    layout.tsx
    page.tsx                         // mounts <Scene/>
    api/
      latency/route.ts               // server route: proxy/normalize latency source
      exchanges/route.ts             // static JSON passthrough (cached)
      regions/route.ts               // static JSON passthrough (cached)
  components/
    scene/
      Scene.tsx                      // <Canvas> root, lights, controls
      Globe.tsx                      // sphere + landmass wireframe
      ExchangeMarkers.tsx            // instanced mesh of exchange points
      CloudRegionMarkers.tsx         // instanced mesh of cloud regions
      LatencyArcs.tsx                // animated arcs between pairs
      HoverLayer.tsx                 // raycasting + tooltip portal
    ui/
      Sidebar.tsx
      FilterPanel.tsx
      LatencyLegend.tsx
      TooltipPortal.tsx
      charts/                        // future: recharts/visx for historical
  lib/
    geo/
      projection.ts                  // latLngToVector3, greatCircleArc
      landmass.ts                    // geojson → line segments loader
    data/
      exchanges.ts                   // typed static list
      regions.ts                     // typed static list (AWS/GCP/Azure)
      latencySource.ts               // fetch + normalize from public source
    store/
      useWorldStore.ts               // zustand: selections, filters, UI
      useLatencyStore.ts             // zustand: latest metrics (ref-driven)
      useHistoryStore.ts             // future: time-series buffer
    hooks/
      useLatencyStream.ts            // 5–10s polling w/ visibility + backoff
      useFrameThrottle.ts            // throttle R3F useFrame
  workers/
    latency.worker.ts                // parsing/normalizing off main thread
  types/
    domain.ts                        // Exchange, CloudRegion, LatencySample, Pair
  styles/
    globals.css

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
