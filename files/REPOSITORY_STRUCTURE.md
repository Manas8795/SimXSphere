# REPOSITORY_STRUCTURE

```
simxsphere/
├─ README.md                  (copy of docs/README.md or short pointer)
├─ docs/                      the 15 documents + evidence/
├─ package.json  tsconfig.json  vite.config.ts  playwright.config.ts  .gitignore
├─ src/
│  ├─ main.tsx  App.tsx
│  ├─ core/
│  │  ├─ simulations/
│  │  │  ├─ probability.ts    pure sim + validation
│  │  │  ├─ projectile.ts     pure sim + validation
│  │  │  └─ prng.ts           mulberry32
│  │  ├─ experiment/
│  │  │  ├─ types.ts  schema.ts  serialize.ts (canonical JSON)
│  │  └─ simxpack/
│  │     ├─ zip.ts            wrapper over ZIP library
│  │     ├─ export.ts  import.ts  validate.ts  checksum.ts  stats.ts  csv.ts
│  ├─ storage/
│  │  ├─ StorageAdapter.ts    interfaces
│  │  ├─ localAdapter.ts
│  │  └─ awsAdapter.ts        (Milestone 7; talks to the API only; no secrets)
│  └─ ui/
│     ├─ pages/  Home.tsx  Probability.tsx  Projectile.tsx  Experiments.tsx
│     └─ components/  Histogram.tsx  TrajectoryChart.tsx  ParamForm.tsx  ExportPanel.tsx  ImportPanel.tsx
├─ tests/
│  ├─ unit/  integration/  e2e/  fixtures/ (valid + hostile ZIPs)
├─ infra/                     (Milestone 7 only)
│  ├─ template.yaml           SAM/CloudFormation
│  └─ lambda/                 api handler + tests
└─ scripts/                   optional: generate hostile test archives
```

## Responsibilities
| Path | Rule |
|---|---|
| `core/*` | No React/DOM imports; pure and unit-tested |
| `storage/*` | Only place that knows where data lives |
| `ui/*` | Rendering and wiring only; no formulas |
| `infra/*` | Created only after the cost gate; never auto-run |
| `tests/fixtures` | Small, committed, no secrets |
