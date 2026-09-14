# The Bohemians Festival — thebohemiansociety.ro

## Regula EN/RO (obligatorie)

Site-ul are două limbi: engleză la `/` și română la `/ro/`, generate din aceleași șabloane (`views/index.html`, `views/cookie-policy.html`, `views/404.html`).

- Textele NU se scriu direct în `views/index.html`. Orice text vizibil (inclusiv `alt`, `aria-label`, `title`, `placeholder`, meta description, FAQ din JSON-LD) e un placeholder `{{cheie}}` cu valoarea în `lang/en.json` și `lang/ro.json`.
- Orice text adăugat sau modificat în engleză se adaugă / modifică și în română **în același commit**. Română naturală, cu diacritice, adresare cu **„tu”**, ton relaxat-boem — nu traducere cuvânt cu cuvânt.
- Textele folosite din JS (`js.*`) și din emailuri (`email.*`) sunt tot în cele două fișiere.
- Conținutul din admin are coloane separate pentru română: `gallery.caption_ro`, `announcements.title_ro` / `body_ro` (fallback pe engleză dacă sunt goale).
- Nume proprii care rămân la fel în ambele limbi: `lang/same-ok.json`.
- `llms.txt` pentru AI se generează din `views/llms.en.md` + `views/llms.ro.md` (servite la `/llms.txt` și `/ro/llms.txt`); cele două trebuie să aibă aceleași placeholdere și aceeași structură. `/llms-full.txt` și `/ro/llms-full.txt` se generează automat din pagină (`llms.js`). Nu mai există `public/llms.txt`.
- Înainte de commit rulează `npm test` (= `node scripts/check-i18n.js`). Același check rulează în GitHub Actions și **blochează deploy-ul** dacă EN și RO nu sunt sincronizate.

## Ani și ediții (obligatoriu)

- Nu scrie niciodată un an sau un număr de ediție direct în texte (`2027`, `5th`, `a V-a`, `four editions`). Folosește tokenurile din `edition.js`: `{{year}}`, `{{edition}}`, `{{editionRoman}}`, `{{prevYear}}`, `{{prevEdition}}`, `{{pastCount}}`, `{{pastYears}}`, `{{lineupYear}}`, `{{lineupEdition}}`, `{{recapYear}}`, `{{recapEdition}}`, `{{recapVideoId}}`, `{{eventDates}}`, `{{datesLabel}}`, `{{copyrightYear}}`. Merg în `lang/*.json`, `views/*.html` și `views/llms.*.md`. `npm test` pică dacă găsește un an / o ediție scrisă de mână (excepție: `cookiePage.subtitle`).
- Valorile vin din admin → Setări: anul și numărul ediției următoare, anul artiștilor din Lineup, anul + linkul YouTube al aftermovie-ului, data festivalului (prima zi, festivalul ține 4 zile). Default-urile sunt în `edition.js` (`DEFAULTS`).
- Data festivalului în anul ediției următoare → pe site apar datele exacte și apare JSON-LD `MusicEvent` pentru ediția nouă. Până atunci blocul `<!--event:start/end-->` nu se afișează (un eveniment trecut i-ar spune unui bot că festivalul a avut deja loc).
- Thumbnail aftermovie: `public/images/aftermovie-<an>-thumbnail.jpg/.webp` dacă există, altfel se ia automat de pe YouTube.
- Rollover anual (după festival): ediția următoare +1 și anul +1; când vine aftermovie-ul, anul + linkul lui; când se anunță lineup-ul nou, anul Lineup.

## Poze

- Nume de fișier descriptive în engleză, un singur fișier pentru ambele limbi (`bohemians-festival-…`). Uploadurile din admin primesc automat nume din caption / numele artistului.
- `alt`-urile se traduc (lang files); galeria și artiștii primesc sufixe din `js.photoAltSuffix` / `js.artistAlt`.
- `/sitemap.xml` e generat de server (pagini EN/RO cu hreflang + toate pozele din pagină și din DB). Dacă redenumești o poză veche, adaugă redirect în `RENAMED_IMAGES` din `server.js`.

## Deploy

Push pe `main` → GitHub Actions (check EN/RO, apoi `flyctl deploy`). După modificări în CSS/JS, crește `?v=` în `views/index.html` și în `public/sw.js`.
