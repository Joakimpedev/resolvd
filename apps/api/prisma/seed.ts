import { PrismaClient, UserRole } from '@prisma/client';
import { auth } from '../src/auth.js';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var for seed: ${name}. Add it to the environment before running db:seed.`);
  return v;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

type LessonSeed = { title: string; body: string; readingMinutes: number };
type ModuleSeed = { title: string; order: number; lessons: LessonSeed[] };
type CourseSeed = { title: string; description: string; everyone: boolean; modules: ModuleSeed[] };

async function ensureCourse(adminId: string, c: CourseSeed) {
  const existing = await prisma.course.findFirst({ where: { title: c.title } });
  if (existing) return;
  const course = await prisma.course.create({
    data: { title: c.title, description: c.description, everyone: c.everyone },
  });
  for (const m of c.modules) {
    const mod = await prisma.module.create({
      data: { courseId: course.id, title: m.title, order: m.order },
    });
    for (let i = 0; i < m.lessons.length; i++) {
      const l = m.lessons[i];
      await prisma.post.create({
        data: {
          kind: 'LESSON',
          everyone: true,
          title: l.title,
          body: l.body,
          readingMinutes: l.readingMinutes,
          moduleId: mod.id,
          moduleOrder: i + 1,
          publishedAt: new Date(),
          authorUserId: adminId,
        },
      });
    }
  }
}

const COURSES: CourseSeed[] = [
  {
    title: 'API integrering gjort enkelt',
    description: 'Forstå hva APIer er og når integrasjoner lønner seg, uten teknisk sjargong. For deg som vil vite nok til å be om det riktige.',
    everyone: true,
    modules: [
      {
        title: 'Hva er en API?',
        order: 1,
        lessons: [
          {
            title: 'API forklart uten teknisk språk',
            readingMinutes: 3,
            body: `API står for *Application Programming Interface*. Navnet hjelper ingenting. Her er en bedre måte å tenke på det.

## Kelneren på restaurant

Du går ikke inn på kjøkkenet for å lage maten selv. Du gir bestillingen til **kelneren**, som snakker med kjøkkenet og kommer tilbake med maten.

En API er akkurat det — en mellommann mellom to systemer. Du spør etter noe, API-en henter det, og leverer det tilbake.

## Hvorfor bry seg?

Fordi nesten alt digitalt snakker sammen via APIer:

- Vipps-betaling → banken din
- Google Maps → kart på nettsiden din
- Faktura som hopper fra regnskapssystemet og inn i nettbanken

## Det du trenger å huske

1. APIer kobler to systemer sammen
2. Data flyter automatisk i stedet for manuelt
3. Du trenger ikke forstå hvordan de fungerer teknisk

I neste leksjon ser vi på konkrete eksempler du allerede er omgitt av.`,
          },
          {
            title: 'Eksempler du allerede bruker',
            readingMinutes: 4,
            body: `Du bruker APIer hver dag uten å tenke over det. Her er eksempler som gjør det tydelig.

## Betaling med Vipps eller Klarna

Når kunden trykker *"Betal med Vipps"* på nettsiden din, starter en kjede:

1. Nettsiden sender beløpet til Vipps via API
2. Vipps sender videre til kundens bank
3. Banken godkjenner eller avviser
4. Svaret kommer tilbake samme vei

Alt dette tar sekunder. Uten API hadde noen måttet godkjenne hver transaksjon manuelt.

## Kart på nettsiden

Et kart som viser hvor verkstedet ditt ligger, er Google Maps' API. Nettsiden din spør om kartet for en gitt adresse, og Google sender bildet.

## Regnskap som ordner seg selv

Moderne regnskapssystemer som **Tripletex** og **Fiken** snakker med:

- Banken din (henter transaksjoner)
- Nettbutikken din (henter salg)
- Lønnssystemet (sender utbetalinger)

Alt via APIer. **Resultatet:** du slipper å taste inn tall manuelt.

> Hvis du har sett uttrykket *"integrasjon mellom X og Y"*, er det nesten alltid snakk om en API.`,
          },
          {
            title: 'Tegn på at bedriften din trenger en integrasjon',
            readingMinutes: 4,
            body: `Sjelden er "vi bør integrere systemene" den første tanken. Her er tegn på at tiden er moden.

## 1. Du kopierer samme data flere steder

Hvis noen på kontoret:

- Taster inn bestillinger fra e-post til regnskapssystemet
- Overfører kundelister fra ett verktøy til et annet
- Fyller inn samme info i to skjemaer

...gjør de jobben til en API.

## 2. Ting glipper mellom systemene

- En bestilling når aldri frem til verkstedet
- En kunde blir fakturert to ganger
- Nettbutikken viser noe som faktisk er utsolgt

Dette er klassiske *"mellom-rom"*-problemer. En integrasjon fjerner dem.

## 3. Rapportene dine er alltid utdaterte

Hvis du manuelt samler tall fra tre verktøy hver fredag, betaler du med tiden din. APIer henter tall på sekundet.

## 4. Du bruker mer enn tre verktøy daglig

Jo flere systemer, jo mer kopiering. **Tommelfingerregel:** Tre eller flere daglig brukte verktøy = minst én integrasjon vil gi tilbakebetaling.

## Det neste steget

Skriv ned tre manuelle oppgaver du gjør ofte, og hvor lang tid de tar til sammen per uke. Den listen er det du tar med til utvikleren.`,
          },
        ],
      },
      {
        title: 'Integrasjoner som lønner seg',
        order: 2,
        lessons: [
          {
            title: 'Betaling og fakturering',
            readingMinutes: 4,
            body: `Dette er ofte den første integrasjonen en bedrift faktisk ser avkastning på. Her er de vanligste.

## Betalingsløsninger

De tre store i Norge:

- **Vipps** — lokalt, rask betaling, bra for tjenester
- **Stripe** — internasjonalt, fleksibelt, bra for nettbutikker
- **Klarna** — *"kjøp nå, betal senere"*

Alle tre har åpne APIer. En utvikler kan koble dem på nettsiden din på få dager.

## Fakturering automatisk

Kobler du nettbutikken eller booking-systemet mot regnskapssystemet, skjer dette:

1. Kunden gjennomfører kjøp
2. Ordren hopper inn i regnskapssystemet
3. Faktura genereres uten at noen rører den
4. Tall synkroniseres til Altinn ved periodens slutt

## Spør utvikleren om

1. **Hvor ofte synkroniseres dataene?** Sanntid, hver time, eller hver natt?
2. **Hva skjer ved feil?** Blir det prøvd på nytt? Får noen varsel?
3. **Hva koster det månedlig?** Ikke bare oppsett.

## Typisk tidsbesparelse

For en bedrift med 20–50 transaksjoner i uken: **5–10 timer spart per måned** som ellers gikk til manuell dataregistrering.`,
          },
          {
            title: 'Booking og kalendere',
            readingMinutes: 4,
            body: `Har kundene dine behov for å booke tid hos deg? Dette er en av de mest verdifulle integrasjonene du kan få.

## Problemet uten integrasjon

1. Kunden ringer eller sender e-post
2. Du sjekker kalenderen
3. Du foreslår tid
4. Kunden svarer
5. Du booker manuelt

**Dette tar 10–15 minutter per booking.** Og dobbeltbooking er en reell risiko.

## Med integrasjon

- Kunden velger tid selv på nettsiden
- Tiden blokkeres i kalenderen din med en gang
- Automatisk bekreftelse på e-post
- Påminnelse 24 timer før
- Avbestillinger frigjør tiden automatisk

## Vanlige verktøy

- **Google Calendar** — gratis, god API
- **Outlook / Microsoft 365** — bra hvis dere bruker det fra før
- **Bokamera, SimplyBook, TimeEdit** — ferdige booking-systemer

## Regnestykket

Sparer du 10 bookinger i uken à 15 minutter, er det **2,5 timer per uke**. Med timelønn på 500 kr blir det 5 000 kr i måneden. Investeringen tjener seg ofte inn på første måned.`,
          },
          {
            title: 'Hva du bør spørre utvikleren om',
            readingMinutes: 5,
            body: `Du trenger ikke å programmere. Du trenger å stille riktige spørsmål.

## Før arbeidet begynner

**1. Finnes det en ferdig kobling?**

Ofte finnes det en plugin eller offisiell integrasjon. Det sparer ofte **80%** av tiden.

**2. Hva er begrensningene?**

Noen APIer gir deg full kontroll. Andre er mer begrensede. Vit dette før du planlegger noe stort.

**3. Hvordan er sikkerheten?**

- Lagrer vi kortnummer selv? (Svar bør være *nei*.)
- Hvem har tilgang til data?
- Hva skjer ved angrep?

## Under utvikling

**4. Hva hvis den andre siden er nede?**

Integrasjonen avhenger av at begge systemer funker. Utvikleren må ha en plan for nedetid.

**5. Kan jeg se at det virker, uten å være utvikler?**

Be om en enkel oversikt — for eksempel *"antall ordrer gjennom i dag"*.

## Etter lansering

**6. Hvem varsles ved feil?**

Noen må få beskjed. Deg, utvikleren, eller et varslingssystem.

**7. Hva koster vedlikehold per år?**

APIer endrer seg. Forvent **10–20%** av original kostnad i årlig vedlikehold.

## Sjekkliste å ta med

> - Ferdig kobling eller skreddersøm?
> - Oppsettskostnad og månedlig kostnad?
> - Hva skjer ved feil?
> - Hvem varsles?
> - Årlig vedlikehold?`,
          },
        ],
      },
    ],
  },
  {
    title: 'Digital markedsføring i 2026',
    description: 'Kort og praktisk om hvordan du bruker Google og Meta for å få flere kunder i 2026. Ikke teori — bare det som funker.',
    everyone: true,
    modules: [
      {
        title: 'Google',
        order: 1,
        lessons: [
          {
            title: 'SEO-grunnlaget',
            readingMinutes: 4,
            body: `SEO står for *search engine optimization* — måter du hjelper Google med å finne og anbefale siden din. Her er bare det viktigste.

## Hva Google ser etter

- **Relevant innhold** — siden matcher hva folk søker etter
- **Hastighet** — siden laster raskt (under 2 sekunder)
- **Mobilvennlighet** — siden fungerer på mobil
- **Troverdighet** — andre sider lenker til deg

## Det du kan gjøre uten utvikler

1. **Bruk ord kundene bruker.** Ikke *"termoklimaoptimalisering"* hvis folk søker etter *"varmepumpe installasjon Oslo"*.
2. **Gi hver side én klar jobb.** En side for priser, en for kontakt, en for hver hovedtjeneste.
3. **Skriv sider som faktisk hjelper.** Google belønner innhold som får folk til å bli.

## Det utvikleren bør gjøre

- Raske sider (komprimerte bilder, lite JavaScript)
- *Meta-beskrivelser* og *alt-tekster* på plass
- Strukturerte data (så Google forstår innholdet)

## Hvor lang tid tar det?

SEO er ikke rask. Forvent **3–6 måneder** før du ser resultater. Men resultatene er gratis trafikk, år etter år.

> Viktig å vite: SEO slår nesten alltid ut i lengden. Det er som å bygge mur, ikke som å leie telt.`,
          },
          {
            title: 'Google Ads 101',
            readingMinutes: 4,
            body: `Google Ads er annonser som vises på toppen av søkeresultatene. Du betaler per klikk.

## Når det lønner seg

- Tjeneste med **høy hastverk** — rørlegger, låsesmed, tauing
- **Høy verdi per kunde** — en jobb er verdt mer enn annonsen koster
- **Nytt nettsted** som ikke har SEO ennå

## Når det *ikke* lønner seg

- Lav margin per kunde
- Allerede god SEO på samme søkeord
- Konkurrenter som byr veldig høyt på de samme ordene

## Hvordan det fungerer, kort

1. Du velger søkeord — f.eks. *"rørlegger Oslo akutt"*
2. Du setter et maksbud per klikk (ofte **10–50 kr**)
3. Når noen søker, konkurrerer du mot andre annonsører
4. Den med best kombinasjon av bud og kvalitet vinner

## Kvalitetspoeng betyr alt

Google gir deg **kvalitetspoeng** basert på:

- Om annonsen er relevant
- Om siden kunden lander på matcher annonsen
- Om folk faktisk klikker

**Høy kvalitet = lavere pris per klikk.** Dårlige annonser straffes med doble priser.

## Start lite

Sett dagsbudsjett på **100–200 kr** i starten. Se hvilke søkeord som faktisk gir kunder, og skaler opp derfra.`,
          },
          {
            title: 'Google Business-profilen',
            readingMinutes: 4,
            body: `Den viktigste *gratis* synligheten en lokal bedrift kan ha. Setter du den opp riktig, ser du ofte flere kunder innen en uke.

## Hva det er

Det er panelet som vises til høyre når noen Googler bedriften din. Åpningstider, adresse, bilder, anmeldelser — alt på ett sted.

## Hva som må være på plass

- **Navn** og kategori (riktig bransje)
- **Adresse** som matcher nettsiden
- **Telefon** og **nettside**
- **Åpningstider** (inkludert helligdager)
- **Bilder** — minst 5, helst 10+
- **Beskrivelse** — hva du gjør, på 750 tegn

## Det folk glemmer

1. **Oppdater åpningstider** ved høytider
2. **Svar på anmeldelser** — alle, både gode og dårlige
3. **Legg til nye bilder** minst én gang i måneden
4. **Publiser innlegg** — tilbud, nyheter, oppdateringer

## Hvordan du får anmeldelser

- Spør **fornøyde** kunder direkte
- Send en lenke via SMS etter jobben: *"Hvordan gikk det?"*
- Gjør det enkelt — lenken skal føre rett til skjemaet

## Taktikk som funker

> Bedrifter med **20+ anmeldelser** og **4,5+ stjerner** rangeres høyere i lokalsøk enn konkurrenter med bedre SEO, men få anmeldelser.

Dette er den raskeste veien til lokalsøk på Google.`,
          },
        ],
      },
      {
        title: 'Meta (Facebook og Instagram)',
        order: 2,
        lessons: [
          {
            title: 'Meta Ads 101',
            readingMinutes: 4,
            body: `Meta eier Facebook og Instagram. Annonser kjøres via samme plattform — Meta Ads Manager.

## Hva Meta er bra til

- **Bilde- og videobaserte bedrifter** — frisører, interiør, mat, kunst
- **Impulskjøp** — ting folk ikke vet de trenger før de ser det
- **Bygge lokalkjennskap** — få naboer til å se bedriften din

## Hvordan det skiller seg fra Google

| | Google Ads | Meta Ads |
|---|---|---|
| Når vises annonsen? | Når noen **søker aktivt** | Når noen **scroller passivt** |
| Intensjon | Høy — de vil ha noe | Lav — de oppdager noe |
| Egner seg for | Hastejobber, løsninger | Merkevare, produkter |

## Målgrupper

Meta gir deg tre valg:

1. **Demografi** — alder, kjønn, sted, jobbtype
2. **Interesser** — hva folk følger og liker
3. **Lookalike** — folk som ligner dine eksisterende kunder

Start alltid med en **lookalike** basert på kundelisten din.

## Budsjett

Start med **50–100 kr per dag**. Kjør i **minst 7 dager** før du vurderer resultater — algoritmen trenger data.

## Viktig å huske

- **Video slår bilder** de fleste steder
- **Første 3 sekundene** må fange oppmerksomhet
- **Tekst i bildet** — hold til under 20% av flaten`,
          },
          {
            title: 'Retargeting',
            readingMinutes: 4,
            body: `*Retargeting* betyr å vise annonser til folk som allerede har vært innom nettsiden din. De husker deg — annonsen minner dem på å fullføre det de startet.

## Hvorfor det funker

- **97%** av første gangs besøkende på en nettside kjøper ikke noe
- Av de som kommer tilbake senere, konverterer **3–5x** flere
- Retargeting er vanligvis **2–4x billigere** per kunde enn vanlig annonsering

## Hvordan det settes opp

1. **Installer Meta Pixel** på nettsiden
2. Pikselen sporer hvem som besøker
3. I Meta Ads: lag en målgruppe som heter f.eks. *"Besøkte prisside siste 30 dager"*
4. Kjør annonse kun mot den gruppen

## Kreative eksempler

- Noen så på *"trepleie Oslo"* men ringte ikke → vis annonse for *"Gratis befaring denne uken"*
- Noen la varer i handlekurven → vis annonse med *"10% rabatt hvis du fullfører i dag"*

## Hva du trenger av utvikler

- Meta Pixel lagt inn i hver side
- Event-sporing (hva kunden gjorde — så på pris, la i handlekurv, startet skjema)

## Fallgruver

1. **Ikke jag kunder som allerede har kjøpt.** Ekskluder dem fra målgruppen.
2. **Hold kampanjen kort** — 7–14 dager er nok. Etter det blir du irriterende.
3. **Bytt kreativt ofte** — samme bilde hver dag gjør kunden blind.`,
          },
          {
            title: 'Organisk innhold som funker',
            readingMinutes: 4,
            body: `*Organisk* = gratis innlegg på Facebook og Instagram. Det betales med tid, ikke penger.

## Hva som ikke lenger funker

- Lange salgsinnlegg
- Bilder av *"teamet i dag"* uten kontekst
- Tre emojier og *"Ring oss!"*

Dette ignorerer algoritmen.

## Hva som faktisk funker

1. **Video først** — spesielt **Reels** og **Stories**
2. **Bak kulissene** — ekte jobb, ekte mennesker
3. **Før/etter-bilder** — funker spesielt for fagbedrifter
4. **Kundens stemme** — sitat eller intervju

## Tommelfingerregler

- **Vis mer enn du forteller.** En video av en jobb er bedre enn en beskrivelse.
- **Post regelmessig, ikke mye.** To innlegg i uken, stabilt, slår ti innlegg en helg og ingenting neste måned.
- **Svar på kommentarer.** Algoritmen bryr seg om engasjement.

## Om hashtags

Bruk **3–5 spesifikke**, ikke 30 generiske. *#rørleggeroslo* slår *#work*.

## Det viktigste å vite

> Organisk rekkevidde er **5–10%** av dine følgere. Hvis du har 1000 følgere, ser cirka 50–100 hvert innlegg. Tenk på innleggene som informasjon til stamkunder — ikke som massemarkedsføring.

Vil du nå flere, må du betale for det. Men organisk bygger relasjonen som gjør annonser mer effektive senere.`,
          },
        ],
      },
    ],
  },
  {
    title: 'Moderne verktøy for rørleggere',
    description: 'Digitale verktøy som faktisk sparer tid og gir fornøyde kunder. For rørleggere som vil jobbe smartere uten å bli sin egen IT-avdeling.',
    everyone: true,
    modules: [
      {
        title: 'Kunderelasjoner',
        order: 1,
        lessons: [
          {
            title: 'Digital booking',
            readingMinutes: 4,
            body: `La kundene velge tid selv i stedet for å spille telefontag. Er blant de mest umiddelbare tidsbesparelsene en rørlegger kan få.

## Hvorfor ringer ikke kunder?

- **30%** av henvendelser kommer utenom arbeidstid
- Folk i 20- og 30-årene *hater* å ringe
- Du bruker 5–10 minutter bare på å finne tid

## Hva et booking-system gjør

- Viser dine ledige tider på nettsiden
- Lar kunden velge adresse og type jobb
- Bekrefter automatisk på SMS/e-post
- Sender påminnelse dagen før

## Verktøy som funker for rørleggere

- **Bokamera** — norsk, bra for små team
- **Calenso** — enkelt, billig
- **SimplyBook.me** — mange funksjoner, mer å lære
- **Calendly** — gratisversjon nok for enkeltpersonforetak

## Hva du trenger fra utvikler

- Kobling mellom booking og kalenderen din (Google/Outlook)
- En side på nettsiden hvor kunden kan bestille
- SMS-tjeneste for påminnelser

## Tall som overbeviser

Basert på rørleggerbedrifter vi har hjulpet:

1. **30% flere henvendelser** gjennomføres (fordi kunder booker på kvelden)
2. **50% færre no-shows** med SMS-påminnelse
3. **2–3 timer spart** per uke på telefontid`,
          },
          {
            title: 'Kundekommunikasjon',
            readingMinutes: 4,
            body: `Rask, profesjonell kommunikasjon bygger tillit. Her er verktøyene som faktisk hjelper.

## WhatsApp Business

Over **90%** av nordmenn har WhatsApp. Business-kontoen gir deg:

- **Automatisk svar** utenfor arbeidstid
- **Katalog** med tjenester og priser
- **Etiketter** for å organisere kunder
- **Sluttrapporter** fra hver samtale

Setter seg opp på 15 minutter. Gratis.

## SMS-verktøy

For varsling og informasjon er SMS fortsatt konge. Åpningsraten er **98%**.

- **SMS.no** — norsk, koster per melding
- **Twilio** — internasjonalt, integreres med det meste

Typisk bruk:

1. Bekreftelse etter booking
2. Påminnelse 24 timer før
3. *"På vei — ankommer 15:30"* samme dag
4. Faktura-link etter jobben

## E-post som ikke ignoreres

- **Kort emnefelt.** Ikke mer enn 50 tegn.
- **Første setning** er hele beskjeden. Kunder leser ikke lange e-poster.
- **Personlig henvendelse.** "Hei [navn]" slår "Hei kunde".

## Det du bør unngå

- Feil kanal til feil kunde. **70-åringer:** telefon. **20-åringer:** SMS/WhatsApp.
- Sen respons på kvelden. Sett automatiske svar som lover svar neste morgen.
- Lange, formelle brev. Du er rørlegger, ikke advokat.

## Takeaway

Bruk **ett** primærverktøy konsekvent. Rørleggere som prøver fem forskjellige apper ender opp med å ignorere alle.`,
          },
          {
            title: 'Anmeldelser',
            readingMinutes: 5,
            body: `Nye kunder leser anmeldelser **før** de ringer. Dette er den mest lønnsomme markedsføringen du kan gjøre — og den er gratis.

## Hvor folk leser

1. **Google Business-profilen** — 80% av søk for lokale tjenester
2. **Facebook** — for de over 40
3. **Mittanbud / Proff** — bransjespesifikt

Start med Google. De andre er bonus.

## Hvordan du får flere

- **Spør aktivt.** Kundene glemmer hvis du ikke ber om det.
- **Send en lenke.** Ikke be dem søke — gjør det enkelt med ett trykk.
- **Timing er alt.** Rett etter jobben, mens begeistringen er fersk.

## En mal du kan sende

> Hei [navn],
>
> Takk for at vi fikk hjelpe dere i dag! Hvis du har 30 sekunder, setter jeg utrolig pris på en rask anmeldelse her: [link]
>
> Det hjelper både oss og andre som leter etter rørlegger.
>
> Hilsen [ditt navn]

## Hva du gjør når en anmeldelse kommer

**Alle** anmeldelser — gode og dårlige — skal ha svar. Hver dårlige anmeldelse uten svar skriker *"denne bedriften bryr seg ikke"*.

### Gode anmeldelser

> Tusen takk, [navn]! Hyggelig å ha vært innom. Ta kontakt om det dukker opp noe mer.

### Dårlige anmeldelser

1. **Ikke gå i forsvar** offentlig
2. Anerkjenn det kunden opplevde
3. Tilby å fikse det utenfor plattformen
4. Ikke gjenta detaljer — det holder liv i saken

## Måltallet

**25+ Google-anmeldelser med 4,5+ stjerner** løfter deg over de fleste lokale konkurrenter. Mange rørleggere har under 10. Dette er din mulighet.`,
          },
        ],
      },
      {
        title: 'Effektivisering av arbeidsflyten',
        order: 2,
        lessons: [
          {
            title: 'Tilbud på 5 minutter',
            readingMinutes: 4,
            body: `Et tilbud som tar **en time å skrive** kan ofte gjøres på **5 minutter** med riktig verktøy.

## Problemet

Hver rørlegger vi har snakket med, lager tilbud slik:

1. Åpner Word eller lignende
2. Kopierer fra forrige tilbud
3. Endrer adresse, dato, priser
4. Lagrer som PDF
5. Sender e-post

**Tid: 45–60 minutter per tilbud.** Og det er lett å gjøre feil.

## Med digitale tilbudsverktøy

- Maler med alle tjenestene ferdig lagt inn
- Priser som oppdateres automatisk
- Digital signering fra kunden
- Fakturering når jobben er godkjent

## Norske verktøy som funker

- **Tripletex** — regnskap + tilbud, mye i ett
- **Fiken** — enklere, billigere, perfekt for enkeltpersonforetak
- **24Solutions** — bransjespesifikt for håndverkere
- **Poweroffice Go** — integrert med mye

## Slik setter du opp på én dag

1. **Dag 1 morgen:** Velg verktøy, meld deg inn
2. **Dag 1 formiddag:** Legg inn de 10–15 vanligste tjenestene som maler
3. **Dag 1 ettermiddag:** Send første digitale tilbud til en kunde

## Hva du får tilbake

- **45 minutter spart** per tilbud
- **Færre feil** — tall kommer fra samme database hele tiden
- **Raskere JA** fra kunde — digital signering er mindre friksjon

## Ikke skreddersy fra dag én

Start med et standard verktøy. Tilpass etter 3 måneder når du vet hva som faktisk plager deg.`,
          },
          {
            title: 'Foto og dokumentasjon av jobber',
            readingMinutes: 4,
            body: `Bilder fra jobben er både **bevis**, **markedsføring** og **trygghet**. Her er hvordan du gjør det uten at det tar tid.

## Hvorfor det betyr noe

- **Bevis:** *"Slik var det før vi kom, slik er det nå."* Uunnværlig ved reklamasjon.
- **Markedsføring:** Bilder fra ekte jobber på Google, Facebook og nettsiden bygger tillit.
- **Trygghet:** Du slipper *"det var jo ikke slik da jeg kom"*-diskusjoner.

## Det du trenger

1. **En mobiltelefon** (du har den)
2. **En app** som organiserer bildene per kunde/jobb
3. **Rutine** — tas **før** du begynner og **etter** du er ferdig

## Apper som fungerer

- **Google Photos** — gratis, smart søk, ubegrenset (med Google One)
- **Dropbox** — bra hvis bedriften bruker det fra før
- **CamScanner** — for skanning av kvitteringer og papirer
- **MondayBoard / PunchList** — bransjespesifikt for håndverkere

## En enkel rutine som funker

1. **Før jobben:** Foto av området, eventuelle skader, eksisterende utstyr
2. **Under jobben:** 1–2 bilder av selve arbeidet
3. **Etter jobben:** Foto av ferdig resultat
4. **Merking:** Kundenavn + dato i mappenavnet

## Gjør foto-tid om til markedsføring

- Spør kunden om tillatelse til å bruke bilder
- **Før/etter-bilder** funker ekstremt bra på Instagram og Facebook
- Anonymiser adressen i kommentarene

## Typisk tidsbruk

Hele rutinen tar **2–3 minutter per jobb**. Gevinsten er betydelig:

- **Redusert risiko** ved reklamasjon
- **Gratis innhold** til sosiale medier
- **Bedre oversikt** når du skal tilbake til samme kunde

Start i dag. Du vil lure på hvorfor du ikke gjorde det før.`,
          },
          {
            title: 'Lagerstyring og innkjøp',
            readingMinutes: 5,
            body: `Tid brukt på å lete etter deler, reise for å hente glemt utstyr, eller kjøpe dobbelt, er rein tapt fortjeneste. Digital lagerstyring løser det.

## De vanlige problemene

- *"Jeg trodde vi hadde den"* → tur til Ahlsell midt i jobben
- *"Hvor er den koblingen fra forrige uke?"* → 30 min med leting
- *"Bestill to, vi er tomme"* → var ikke tomme

Hver av disse koster **30–90 minutter** per hendelse.

## Det en enkel lagerapp gjør

- **Sanntidsoversikt** over hva du har på lager (og hvor)
- **Strekkodeskanning** med mobilen
- **Automatisk bestilling** når noe går lavt
- **Historikk** — hva gikk med på siste store jobb?

## Verktøy som passer for mindre firmaer

- **Sortly** — visuelt, enkelt, bra for mobil
- **inFlow** — mer avansert, bra for lager på flere steder
- **Zoho Inventory** — gratis opp til et visst volum
- **Lagerrutinen i Tripletex** — om du bruker det fra før

## Koble mot leverandører

Noen av de store norske grossistene har APIer:

- **Ahlsell**
- **Dahl**
- **Onninen**

Med integrasjon kan du bestille direkte fra lagerappen. Ingen separat innlogging.

## En enkel rutine å starte med

1. **Uke 1:** Skriv ned hva du *alltid* har med i bilen
2. **Uke 2:** Registrer dette i appen med strekkoder
3. **Uke 3:** Skann deler ut når du bruker dem
4. **Uke 4:** Sett automatiske bestillingspunkter

## Sparer du noe på dette?

Typiske tall for en rørleggerbedrift med 1–3 montører:

- **3–5 timer per uke** spart på leting
- **15–20%** mindre feilbestillinger
- **Raskere fakturering** — du vet nøyaktig hva som ble brukt

Det er ikke gøy å sette opp. Men det er en av de få endringene som betaler tilbake hver eneste uke etterpå.`,
          },
        ],
      },
    ],
  },
];

async function seed() {
  const isProd = process.env.NODE_ENV === 'production';

  const adminEmail    = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

  const ownerEmail       = optionalEnv('SEED_DEMO_OWNER_EMAIL');
  const ownerPassword    = optionalEnv('SEED_DEMO_OWNER_PASSWORD');
  const employeeEmail    = optionalEnv('SEED_DEMO_EMPLOYEE_EMAIL');
  const employeePassword = optionalEnv('SEED_DEMO_EMPLOYEE_PASSWORD');

  const seedDemo = !!(ownerEmail && ownerPassword && employeeEmail && employeePassword);

  if (isProd && seedDemo) {
    throw new Error(
      'Refusing to seed demo users in production. Remove SEED_DEMO_* env vars from your production deploy.',
    );
  }

  // 1. Admin
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await auth.api.signUpEmail({ body: { email: adminEmail, password: adminPassword, name: 'Marius Lauvås' } });
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: UserRole.ADMIN, avatarInitial: 'M' },
    });
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  // 2. Global articles — keep a couple for initial content
  const articleCount = await prisma.post.count({ where: { kind: 'ARTICLE' } });
  if (articleCount === 0) {
    await prisma.post.create({
      data: {
        kind: 'ARTICLE', everyone: true,
        title: 'Velkommen til Resolvd',
        body: 'Her får du oversikt over løsningene vi bygger for deg, snakker med teamet vårt, og lærer hvordan ny teknologi kan hjelpe bedriften din.',
        category: 'Nyheter', readingMinutes: 2,
        publishedAt: new Date(),
        authorUserId: admin.id,
      },
    });
    await prisma.post.create({
      data: {
        kind: 'ARTICLE', everyone: true,
        title: 'Faktura-oppfølging som får betalt',
        body: 'Kort guide til hvordan du følger opp faktura uten å miste kundeforholdet.',
        category: 'Bransje-tips', readingMinutes: 2,
        publishedAt: new Date(),
        authorUserId: admin.id,
      },
    });
  }

  // 3. Courses (idempotent per title)
  for (const c of COURSES) {
    await ensureCourse(admin.id, c);
  }

  // ──────────────────────────────────────────────────────────────
  // OPTIONAL demo data (skipped when SEED_DEMO_* env vars are absent).
  // ──────────────────────────────────────────────────────────────
  if (seedDemo && ownerEmail && ownerPassword && employeeEmail && employeePassword) {
    let company = await prisma.company.findFirst({ where: { name: 'Rørleggeren AS' } });
    if (!company) {
      company = await prisma.company.create({ data: { name: 'Rørleggeren AS' } });
    }
    const plumbersTag = await prisma.tag.upsert({
      where: { name: 'Rørleggere' },
      update: {},
      create: { name: 'Rørleggere' },
    });
    const ownerTag = await prisma.tag.upsert({
      where: { name: 'Eier' },
      update: {},
      create: { name: 'Eier' },
    });

    const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!existingOwner) {
      await auth.api.signUpEmail({ body: { email: ownerEmail, password: ownerPassword, name: 'Marius Lauvås' } });
      await prisma.user.update({
        where: { email: ownerEmail },
        data: { role: UserRole.OWNER, avatarInitial: 'M', companyId: company.id, plaintextPasswordNote: ownerPassword },
      });
    }
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    await prisma.userTag.upsert({
      where:  { userId_tagId: { userId: owner.id, tagId: plumbersTag.id } },
      update: {},
      create: { userId: owner.id, tagId: plumbersTag.id },
    });
    await prisma.userTag.upsert({
      where:  { userId_tagId: { userId: owner.id, tagId: ownerTag.id } },
      update: {},
      create: { userId: owner.id, tagId: ownerTag.id },
    });

    const existingEmp = await prisma.user.findUnique({ where: { email: employeeEmail } });
    if (!existingEmp) {
      await auth.api.signUpEmail({ body: { email: employeeEmail, password: employeePassword, name: 'Jonas Berg' } });
      await prisma.user.update({
        where: { email: employeeEmail },
        data: { role: UserRole.EMPLOYEE, avatarInitial: 'J', companyId: company.id, plaintextPasswordNote: employeePassword },
      });
    }
    const employee = await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } });
    await prisma.userTag.upsert({
      where:  { userId_tagId: { userId: employee.id, tagId: plumbersTag.id } },
      update: {},
      create: { userId: employee.id, tagId: plumbersTag.id },
    });

    const reqCount = await prisma.request.count({ where: { companyId: company.id } });
    if (reqCount === 0) {
      await prisma.request.createMany({
        data: [
          { companyId: company.id, createdByUserId: owner.id, title: 'Endring på forsiden',    description: 'Legg til kundelogo nederst på hero-seksjonen.', status: 'I_ARBEID',      updatedAt: new Date(Date.now() - 2 * 3600_000) },
          { companyId: company.id, createdByUserId: owner.id, title: 'Ny løsning ønsket',      description: 'Vi trenger litt mer info før vi kan starte.',    status: 'VENTER_PA_DEG', updatedAt: new Date(Date.now() - 24 * 3600_000) },
          { companyId: company.id, createdByUserId: owner.id, title: 'Oppdater åpningstider', description: 'Endringen er live på siden.',                     status: 'FERDIG',        updatedAt: new Date(Date.now() - 3 * 24 * 3600_000) },
          { companyId: company.id, createdByUserId: owner.id, title: 'Bytt hero-bilde',        description: 'Nytt bilde er på plass.',                         status: 'FERDIG',        updatedAt: new Date(Date.now() - 7 * 24 * 3600_000) },
        ],
      });
    }

    const solCount = await prisma.solution.count({ where: { companyId: company.id } });
    if (solCount === 0) {
      const tilbud = await prisma.solution.create({
        data: { companyId: company.id, name: 'Tilbudsgenerator', subtitle: null, status: 'ACTIVE' },
      });
      const epost = await prisma.solution.create({
        data: { companyId: company.id, name: 'E-post assistent', subtitle: 'Aktiv · 12 svar i går', status: 'ACTIVE' },
      });
      const now = Date.now();
      for (let i = 0; i < 47; i++) {
        await prisma.solutionUsage.create({ data: { solutionId: tilbud.id, usedAt: new Date(now - i * 3600_000) } });
      }
      for (let i = 0; i < 12; i++) {
        await prisma.solutionUsage.create({ data: { solutionId: epost.id, usedAt: new Date(now - 24 * 3600_000 + i * 1800_000) } });
      }
    }

    console.log(`Seed complete. Admin: ${adminEmail}. Demo owner: ${ownerEmail}. Demo employee: ${employeeEmail}.`);
  } else {
    console.log(`Seed complete. Admin: ${adminEmail}. (Demo data skipped — SEED_DEMO_* env vars not set.)`);
  }
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
