# Graph Report - Festival delta  (2026-06-01)

## Corpus Check
- 12 files · ~222,242 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 152 nodes · 149 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 7 edges
2. `The Bohemians Festival — Site` - 7 edges
3. `Deploy pe Fly.io` - 4 edges
4. `isoDate()` - 3 edges
5. `printTable()` - 3 edges
6. `tick()` - 3 edges
7. `daysAgo()` - 2 edges
8. `pct()` - 2 edges
9. `num()` - 2 edges
10. `saveCsv()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (24): animateDigit(), backToTop, cdInterval, cdWrap, elDays, elHours, elMins, emailBtn (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (19): ADMIN_PASS_HASH, app, bcrypt, compression, crypto, db, express, fs (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (13): days, daysAgo(), __dirname, endDate, env, isoDate(), num(), pct() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (13): dependencies, googleapis, name, private, scripts, countries, daily, devices (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (10): description, devDependencies, @flydotio/dockerfile, engines, node, main, name, scripts (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, better-sqlite3, compression, dotenv, express, express-session, helmet (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (10): Admin credentials, Admin panel, API Endpoints, Comenzi utile, Deploy după modificări de cod, Deploy pe Fly.io, Instalare, Rulare locală (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): Database, db, insertArtist, insertGallery, insertSetting, path

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (4): __dirname, env, sc, urls

### Community 10 - "Community 10"
Cohesion: 0.40
Nodes (4): auth, __dirname, env, sc

## Knowledge Gaps
- **103 isolated node(s):** `Database`, `path`, `db`, `insertSetting`, `insertArtist` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 5` to `Community 4`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `Database`, `path`, `db` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._