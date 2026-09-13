# The Bohemians Festival — thebohemiansociety.ro

## Regula EN/RO (obligatorie)

Site-ul are două limbi: engleză la `/` și română la `/ro/`, generate din același șablon.

- Textele NU se scriu direct în `views/index.html`. Orice text vizibil (inclusiv `alt`, `aria-label`, `title`, `placeholder`, meta description, FAQ din JSON-LD) e un placeholder `{{cheie}}` cu valoarea în `lang/en.json` și `lang/ro.json`.
- Orice text adăugat sau modificat în engleză se adaugă / modifică și în română **în același commit**. Română naturală, cu diacritice, adresare cu **„tu”**, ton relaxat-boem — nu traducere cuvânt cu cuvânt.
- Textele folosite din JS (`js.*`) și din emailuri (`email.*`) sunt tot în cele două fișiere.
- Conținutul din admin are coloane separate pentru română: `gallery.caption_ro`, `announcements.title_ro` / `body_ro` (fallback pe engleză dacă sunt goale).
- Nume proprii care rămân la fel în ambele limbi: `lang/same-ok.json`.
- `llms.txt` pentru AI se generează din `views/llms.en.md` + `views/llms.ro.md` (servite la `/llms.txt` și `/ro/llms.txt`); cele două trebuie să aibă aceleași placeholdere și aceeași structură. `/llms-full.txt` și `/ro/llms-full.txt` se generează automat din pagină (`llms.js`). Nu mai există `public/llms.txt`.
- Înainte de commit rulează `npm test` (= `node scripts/check-i18n.js`). Același check rulează în GitHub Actions și **blochează deploy-ul** dacă EN și RO nu sunt sincronizate.

## Deploy

Push pe `main` → GitHub Actions (check EN/RO, apoi `flyctl deploy`). După modificări în CSS/JS, crește `?v=` în `views/index.html` și în `public/sw.js`.
