/* ═══════════════════════════════════════════════════════════════
   AKTOVKA – Datová vrstva
   Rodičovský asistent: z chaosu WhatsApp / mailů / SMS
   vytáhne návrhy akcí a personalizuje je podle dítěte.

   Termíny jsou kotvené k „dnešku" (2026-06-20), aby demo
   vždy vypadalo živě (odpočty a „za 3 dny" reálně sedí).
═══════════════════════════════════════════════════════════════ */

/* ── Účet rodiče ───────────────────────────── */
const USERS = {
  kriz: {
    id: 'kriz',
    name: 'Petr Kříž',
    firstName: 'Petr',
    avatar: 'PK',
    email: 'petr.kriz@email.cz',
    partner: 'Klára',          // pro „Sdílet s partnerem"
    partnerWith: 'Klárou',     // 7. pád pro „Sdílet s …"
    childIds: ['eliska', 'matej', 'anezka'],
  },
};

/* ── Děti ──────────────────────────────────── */
const CHILDREN = [
  {
    id: 'eliska', name: 'Eliška', full: 'Eliška Křížová',
    cls: '3.', clsLabel: '3. třída', avatar: '🦊', color: '#f59e0b',
    teacher: 'Mgr. Lenka Dvořáková', active: true,
  },
  {
    id: 'matej', name: 'Matěj', full: 'Matěj Kříž',
    cls: '5.', clsLabel: '5. třída', avatar: '🐢', color: '#6a5ae0',
    teacher: 'Mgr. Pavel Hinner', active: true,
  },
  {
    id: 'anezka', name: 'Anežka', full: 'Anežka Křížová',
    cls: '1.V', clsLabel: '1.V · nastupuje', avatar: '🐡', color: '#10b981',
    teacher: 'Mgr. Alicia Darychuck', active: false, startsNote: 'Nastupuje v září 2026',
  },
];

/* ── Kanály a kategorie (meta pro UI) ───────── */
const CHANNELS = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#25d366', bg: '#e7f9ee' },
  email:    { label: 'E-mail',   icon: '✉️', color: '#2f6fed', bg: '#e8f0fe' },
  sms:      { label: 'SMS',      icon: '📱', color: '#8b5cf6', bg: '#f1ecfe' },
};

const CATEGORIES = {
  vylet:    { label: 'Výlet',          emoji: '🚌', color: '#f97316' },
  foceni:   { label: 'Focení',         emoji: '📸', color: '#ec4899' },
  schuzka:  { label: 'Třídní schůzka', emoji: '🧑‍🏫', color: '#0ea5e9' },
  sport:    { label: 'Sport',          emoji: '🏊', color: '#06b6d4' },
  krouzek:  { label: 'Kroužek',        emoji: '🎨', color: '#8b5cf6' },
  zmena:    { label: 'Změna rozvrhu',  emoji: '🔄', color: '#64748b' },
  platba:   { label: 'Platba',         emoji: '💸', color: '#ef4444' },
  tabor:    { label: 'Tábor',          emoji: '⛺', color: '#22c55e' },
};

/* ── Pomůcky pro čas ───────────────────────── */
const NOW = new Date('2026-06-20T09:12:00');
function iso(s) { return new Date(s); }

/* ═══════════════════════════════════════════════════════════════
   PŘÍCHOZÍ ZPRÁVY (sjednocená schránka)
   eventIds = akce, které z dané zprávy AI vytáhla
   recognized=false → zatím nezpracováno (čeká na „Rozpoznat akci")
═══════════════════════════════════════════════════════════════ */
const MESSAGES = [
  {
    id: 'm-signal',
    channel: 'email',
    fromName: 'Marta Bloudková',
    fromMeta: 'ZŠ Compass · Office manager',
    avatar: 'MB',
    subject: 'Mimoškolní akce – výlet na výstavu Signal Space',
    time: '2026-06-20T08:58:00',
    unread: true,
    recognized: false,        // HERO: čeká na rozpoznání
    eventIds: ['e-signal'],
    preview: 'Milí rodiče, ve čtvrtek 25.6. se celá škola vydá na výlet na výstavu digitálního umění Signal Space…',
    body:
`Milí rodiče,

ve čtvrtek 25.6. se celá škola vydá na výlet na výstavu digitálního umění Signal Space. Vstupné dostali všichni žáci jako dárek ke konci školního roku od štědrého dárce pana Petra Kříže. Velmi děkujeme!

Program pro děti je na místě naplánován od 10:00 do 12:00 hodin.

Adresa: Rytířská 10, Praha 1
Doprava: Děti pojedou od školy autobusem MHD na stanici Kačerov a poté metrem na stanici Muzeum. Dále pěšky cca 1 km.

Třídy 1.V, 3., 4. – sraz 8:20 před školou, odchod na bus 8:30. Prosím buďte včas! Žáky doprovodí třídní učitelky + Alicia Darychuck a Lee Lane.
Třídy 1.D, 2., 5. – sraz 8:35 před školou, odchod na bus 8:45. Prosím buďte včas! Žáky doprovodí třídní učitelky + Taylor Bern a Daniela Havránková.
Po ukončení programu se 4 třídy vrací do školy dříve – 1.D, 1.V, 3. a 4. – oběd cca 12:45. 2. a 5. třída si zajdou na zmrzlinu, vrátí se na pozdní oběd cca 13:15.

S sebou:
Batůžek a pláštěnku pro případ deště, školní uniforma, povinná školní kšiltovka, lahev s vodou.
Svačinu dostanou děti ze školy.
Kapesné cca 100 Kč.

S pozdravem,
Marta Bloudková
Office manager | ZŠ Compass s.r.o.`,
  },

  {
    id: 'm-foceni',
    channel: 'whatsapp',
    fromName: 'Klára Veselá',
    fromMeta: 'Rodiče 3. třída 👨‍👩‍👧‍👦 · skupina',
    avatar: 'KV',
    time: '2026-06-20T07:41:00',
    unread: true,
    recognized: true,
    eventIds: ['e-foceni'],
    preview: 'Ahoj holky, připomínám focení tříd v pátek! Děti mají dorazit v bílém tričku 📸',
    body:
`Ahoj holky 👋
Připomínám, že tento pátek (26.6.) je focení tříd! 📸
Paní učitelka prosí, ať děti dorazí v bílém tričku a tmavých kalhotách/sukni.
Cena fotobalíčku je 350 Kč, vybírá se na místě (hotově).
Mějte se! 🌸`,
  },

  {
    id: 'm-keramika',
    channel: 'sms',
    fromName: 'ZŠ Compass',
    fromMeta: '+420 774 077 947',
    avatar: '🏫',
    time: '2026-06-19T16:20:00',
    unread: false,
    recognized: true,
    eventIds: ['e-keramika'],
    preview: 'ZS Compass: V pondeli 22.6. odpada krouzek keramiky (nemoc lektorky). Nahradni hodina 2.7.',
    body: `ZS Compass: V pondeli 22.6. odpada krouzek keramiky (nemoc lektorky). Nahradni hodina probehne ve ctvrtek 2.7. ve stejny cas. Dekujeme za pochopeni.`,
  },

  {
    id: 'm-schuzka',
    channel: 'email',
    fromName: 'Pavel Hinner',
    fromMeta: 'Třídní učitel 5. třídy · ZŠ Compass',
    avatar: 'PH',
    subject: 'Třídní schůzka 5. třídy – úterý 23.6.',
    time: '2026-06-19T14:05:00',
    unread: false,
    recognized: true,
    eventIds: ['e-schuzka'],
    preview: 'Vážení rodiče, zvu Vás na závěrečnou třídní schůzku 5. třídy v úterý 23.6. od 18:00…',
    body:
`Vážení rodiče,

zvu Vás na závěrečnou třídní schůzku 5. třídy, která se koná v úterý 23.6. od 18:00 v učebně 5. třídy.

Program:
– zhodnocení školního roku
– vysvědčení a přechod na 2. stupeň
– vyúčtování třídního fondu (prosím doplatit zbývajících 800 Kč)

Účast prosím potvrďte odpovědí na tento e-mail.

S pozdravem,
Pavel Hinner`,
  },

  {
    id: 'm-darek',
    channel: 'whatsapp',
    fromName: 'Jana Marková',
    fromMeta: 'Rodiče 5. třída · skupina',
    avatar: 'JM',
    time: '2026-06-19T11:30:00',
    unread: false,
    recognized: true,
    eventIds: ['e-darek'],
    preview: 'Sbíráme na dárek pro pí učitelku k závěru roku 🎁 200 Kč na účet, do pátku prosím',
    body:
`Milí rodiče 🎁
Domluvili jsme se, že paní učitelce ke konci roku koupíme dárek + květinu.
Posílejte prosím 200 Kč na účet 123456789/0800, do zprávy jméno dítěte.
Termín do pátku 26.6. Díky moc všem! ❤️`,
  },

  {
    id: 'm-plavani',
    channel: 'email',
    fromName: 'Lenka Dvořáková',
    fromMeta: 'Třídní učitelka 3. třídy · ZŠ Compass',
    avatar: 'LD',
    subject: 'Plavecký výcvik 3. třídy – úterky',
    time: '2026-06-18T13:10:00',
    unread: false,
    recognized: true,
    eventIds: ['e-plavani'],
    preview: 'Dobrý den, připomínám plavecký výcvik každé úterý. S sebou plavky, ručník, čepici…',
    body:
`Dobrý den,

připomínám, že plavecký výcvik 3. třídy probíhá každé úterý od 13:00 (bazén Kunratice).
Nejbližší lekce: úterý 23.6.

S sebou: plavky, ručník, plaveckou čepici, mýdlo. Na vstup 50 Kč (hotově).
Po plavání se děti vrací do školy do 15:00.

S pozdravem,
Lenka Dvořáková`,
  },

  {
    id: 'm-tabor',
    channel: 'email',
    fromName: 'ZŠ Compass',
    fromMeta: 'info@zs-compass.cz',
    avatar: '🏫',
    subject: 'Příměstský tábor 2026 – přihlášky do 30.6.',
    time: '2026-06-18T09:00:00',
    unread: false,
    recognized: true,
    eventIds: ['e-tabor'],
    preview: 'Otevíráme přihlášky na letní příměstský tábor (3 turnusy v červenci). Kapacita omezena…',
    body:
`Vážení rodiče,

otevíráme přihlášky na letní příměstský tábor 2026.
Turnusy: 7.–11.7. / 14.–18.7. / 21.–25.7. (vždy 8:00–16:00)
Cena: 2 900 Kč / turnus. Kapacita je omezená.

Přihlášku vyplňte nejpozději do 30.6. přes rodičovský portál.

Děkujeme,
ZŠ Compass`,
  },

  {
    id: 'm-zpravodaj',
    channel: 'email',
    fromName: 'ZŠ Compass',
    fromMeta: 'newsletter@zs-compass.cz',
    avatar: '🏫',
    subject: 'Červnový zpravodaj školy',
    time: '2026-06-17T10:00:00',
    unread: false,
    recognized: true,
    eventIds: [],           // AI nenašla žádnou akci
    preview: 'Ohlédnutí za školním rokem, fotogalerie z besídky a poděkování učitelům…',
    body:
`Milí čtenáři,

v červnovém zpravodaji se ohlížíme za uplynulým školním rokem – přinášíme fotogalerii z besídky, rozhovor s paní kuchařkou a poděkování všem učitelům.

Přejeme krásné čtení a slunečné dny.
Redakce zpravodaje ZŠ Compass`,
  },
];

/* ═══════════════════════════════════════════════════════════════
   AKCE vytažené AI
   inCalendar=false → ještě nepřidáno (HERO Signal Space)
   perChild = personalizace podle třídy dítěte
═══════════════════════════════════════════════════════════════ */
const EVENTS = [
  {
    id: 'e-signal',
    category: 'vylet',
    title: 'Výlet – výstava Signal Space',
    sourceMsg: 'm-signal',
    confidence: 97,
    inCalendar: false,         // HERO – přidá se v demu
    needsConfirm: true,
    date: '2026-06-25', start: '08:20', end: '13:15',
    location: 'Signal Space',
    address: 'Rytířská 10, Praha 1',
    childIds: ['eliska', 'matej'],
    summary: 'Celoškolní výlet na výstavu digitálního umění. Vstupné je darem, program 10:00–12:00.',
    bring: ['Batůžek', 'Pláštěnka', 'Školní uniforma', 'Povinná školní kšiltovka', 'Lahev s vodou'],
    dress: 'Školní uniforma + povinná kšiltovka',
    money: '≈ 100 Kč kapesné',
    food: 'Svačinu dostanou děti ze školy',
    transport: 'Bus MHD → Kačerov, metro → Muzeum, pěšky ~1 km',
    perChild: {
      eliska: {
        meet: '8:20 před školou', depart: 'odchod na bus 8:30',
        escort: 'tř. učitelka + Alicia Darychuck a Lee Lane',
        ret: 'Vrací se dříve · oběd ~12:45', retTag: 'dříve',
      },
      matej: {
        meet: '8:35 před školou', depart: 'odchod na bus 8:45',
        escort: 'tř. učitel + Taylor Bern a Daniela Havránková',
        ret: 'Po programu zmrzlina 🍦 · pozdní oběd ~13:15', retTag: 'později',
      },
    },
    todo: [
      { id: 't1', label: 'Potvrdit účast', done: false },
      { id: 't2', label: 'Sbalit kšiltovku + pláštěnku', done: false },
      { id: 't3', label: 'Dát dětem ~100 Kč kapesné', done: false },
    ],
    // fráze, které AI „podtrhla" v originálu (pro náhled extrakce)
    phrases: ['ve čtvrtek 25.6.', 'Signal Space', 'od 10:00 do 12:00', 'Rytířská 10, Praha 1',
      'sraz 8:20 před školou', 'sraz 8:35 před školou', 'Alicia Darychuck a Lee Lane',
      'Taylor Bern a Daniela Havránková', 'oběd cca 12:45', 'zmrzlinu', 'pozdní oběd cca 13:15',
      'školní uniforma', 'povinná školní kšiltovka', 'pláštěnku', 'lahev s vodou',
      'Kapesné cca 100 Kč', 'Svačinu dostanou děti ze školy'],
  },

  {
    id: 'e-foceni',
    category: 'foceni',
    title: 'Focení tříd',
    sourceMsg: 'm-foceni',
    confidence: 92,
    inCalendar: true, needsConfirm: false,
    date: '2026-06-26', start: '08:30', end: null,
    location: 'ZŠ Compass', address: 'K Zeleným domkům 178/38, Praha 4',
    childIds: ['eliska', 'matej'],
    summary: 'Společné focení tříd. Fotobalíček 350 Kč se platí hotově na místě.',
    bring: ['350 Kč hotově (fotobalíček)'],
    dress: 'Bílé tričko + tmavé kalhoty / sukně',
    money: '350 Kč (fotobalíček, hotově)',
    perChild: {},
    todo: [
      { id: 't1', label: 'Připravit bílé tričko (2×)', done: false },
      { id: 't2', label: 'Připravit 2× 350 Kč', done: false },
    ],
    phrases: [],
  },

  {
    id: 'e-keramika',
    category: 'zmena',
    title: 'Keramika ZRUŠENA · náhrada 2.7.',
    sourceMsg: 'm-keramika',
    confidence: 95,
    inCalendar: true, needsConfirm: false,
    date: '2026-06-22', start: null, end: null,
    location: 'ZŠ Compass', address: '',
    childIds: ['eliska'],
    summary: 'Kroužek keramiky v pondělí 22.6. odpadá (nemoc lektorky). Náhradní hodina ve čtvrtek 2.7.',
    bring: [],
    dress: '',
    money: '',
    perChild: {},
    todo: [],
    phrases: [],
    cancelled: true,
    makeupDate: '2026-07-02',
  },

  {
    id: 'e-schuzka',
    category: 'schuzka',
    title: 'Třídní schůzka 5. třídy',
    sourceMsg: 'm-schuzka',
    confidence: 96,
    inCalendar: true, needsConfirm: false,
    date: '2026-06-23', start: '18:00', end: '19:00',
    location: 'Učebna 5. třídy', address: 'ZŠ Compass, Praha 4',
    childIds: ['matej'],
    summary: 'Závěrečná schůzka: zhodnocení roku, vysvědčení, vyúčtování fondu. Účast potvrdit e-mailem.',
    bring: ['Doplatek do třídního fondu 800 Kč'],
    dress: '',
    money: '800 Kč (doplatek fondu)',
    perChild: {},
    todo: [
      { id: 't1', label: 'Potvrdit účast e-mailem', done: false },
      { id: 't2', label: 'Doplatit fond 800 Kč', done: false },
    ],
    phrases: [],
    forParent: true,
  },

  {
    id: 'e-darek',
    category: 'platba',
    title: 'Sbírka na dárek p. učitelce',
    sourceMsg: 'm-darek',
    confidence: 90,
    inCalendar: true, needsConfirm: false,
    date: '2026-06-26', start: null, end: null,
    location: '', address: '',
    childIds: ['matej'],
    summary: '200 Kč na dárek + květinu pro paní učitelku. Účet 123456789/0800, do zprávy jméno dítěte.',
    bring: [],
    dress: '',
    money: '200 Kč · ú. 123456789/0800',
    perChild: {},
    todo: [
      { id: 't1', label: 'Poslat 200 Kč (do zprávy „Matěj")', done: false },
    ],
    phrases: [],
    isDeadline: true,
    deadlineLabel: 'zaplatit do',
  },

  {
    id: 'e-plavani',
    category: 'sport',
    title: 'Plavecký výcvik',
    sourceMsg: 'm-plavani',
    confidence: 94,
    inCalendar: true, needsConfirm: false,
    date: '2026-06-23', start: '13:00', end: '15:00',
    location: 'Bazén Kunratice', address: 'Kunratice, Praha 4',
    childIds: ['eliska'],
    summary: 'Pravidelné úterní plavání. Návrat do školy do 15:00.',
    bring: ['Plavky', 'Ručník', 'Plavecká čepice', 'Mýdlo', '50 Kč na vstup'],
    dress: '',
    money: '50 Kč (vstup, hotově)',
    perChild: {},
    todo: [
      { id: 't1', label: 'Sbalit plaveckou tašku', done: false },
    ],
    phrases: [],
    recurring: 'Každé úterý',
  },

  {
    id: 'e-tabor',
    category: 'tabor',
    title: 'Příměstský tábor – přihlášky',
    sourceMsg: 'm-tabor',
    confidence: 88,
    inCalendar: true, needsConfirm: false,
    date: '2026-06-30', start: null, end: null,
    location: 'Rodičovský portál', address: '',
    childIds: ['eliska', 'matej'],
    summary: 'Letní příměstský tábor, 3 turnusy v červenci (2 900 Kč/turnus). Přihlásit do 30.6.',
    bring: [],
    dress: '',
    money: '2 900 Kč / turnus',
    perChild: {},
    todo: [
      { id: 't1', label: 'Rozhodnout turnusy', done: false },
      { id: 't2', label: 'Vyplnit přihlášku na portálu', done: false },
    ],
    phrases: [],
    isDeadline: true,
    deadlineLabel: 'přihlásit do',
  },
];
