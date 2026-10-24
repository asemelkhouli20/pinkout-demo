// PinkOut Partners — zone data. Names are brand names (same in both languages).
// plan: rectangles in metres on the concept floor plan (PinkOut_FinalPresentation p.17–18):
//   building 50 m (x, west→east) × 45 m (y, north→south); main door on the west wall at y ≈ 20.
//   size: room size as labelled in the deck. stations: what the deck shows inside the zone.
// tracks / offers: every zone belongs to event partners (the whole event is theirs).
// Beauty service and e-commerce partners work through the PinkOut app, not at the venue.

export const ZONES = [
  {
    id: 'passage', name: 'Pink Passage', colour: '--zone-passage', hex: '#ffc9de', image: 'passage',
    plan: { rects: [[0.5, 0.6, 5.1, 16.1], [0.5, 28.5, 5.1, 44.6]], label: [2.8, 8.4], size: '4.5 × 12 m ×2' },
    stations: { en: ['Immersive Art Entrance', 'Immersive Art Exit'], ar: ['المدخل الفني الغامر', 'المخرج الفني الغامر'] },
    tag: { en: 'Arrive & discover', ar: 'وصول واكتشاف' },
    line: { en: 'An art-filled entrance of arches, light and mirrors: the first and last moment of every visit.', ar: 'مدخل فني من الأقواس والضوء والمرايا: أول وآخر لحظة في كل زيارة.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Entrance naming'], ar: ['تسمية المدخل'] }, items: { en: ['Art installation', 'Signature photo moment'], ar: ['تركيب فني', 'لحظة تصوير مميّزة'] } } },
  },
  {
    id: 'hub', name: 'Rose Hub', colour: '--zone-hub', hex: '#fff0aa', image: 'hub',
    plan: { rects: [[5.6, 12.4, 43.2, 30.0]], label: [22.5, 15.2], size: '32 × 15 m' },
    stations: { en: ['Activation Pop-Up', 'Cherry-blossom tree', 'PinkOut Café'], ar: ['منصة التفعيل', 'شجرة الكرز', 'مقهى PinkOut'] },
    tag: { en: 'Sip & linger', ar: 'جلسة ومشروب' },
    line: { en: 'The social heart: PinkOut Café with matcha and coffee, beside a space that changes with every launch.', ar: 'القلب الاجتماعي: مقهى PinkOut بالماتشا والقهوة، بجانب مساحة تتغيّر مع كل إطلاق.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Zone sponsor'], ar: ['راعي المنطقة'] }, items: { en: ['Café collaboration', 'Signature drink', 'Activation-space takeover'], ar: ['تعاون مع المقهى', 'مشروب مميّز', 'استحواذ على مساحة التفعيل'] } } },
  },
  {
    id: 'beauty', name: 'Beauty Lab', colour: '--zone-beauty', hex: '#ddcffb', image: 'beauty',
    plan: { rects: [[24.6, 30.7, 49.6, 44.6]], label: [37.1, 37.6], size: '20 × 13 m' },
    stations: { en: ['Beauty Boutique', 'Foundation Lab', 'Makeup & Nail Lab', 'AI Fragrance Lab', 'Touch-Up & Mini Spa'], ar: ['متجر الجمال', 'مختبر كريم الأساس', 'مختبر المكياج والأظافر', 'مختبر العطور بالذكاء الاصطناعي', 'لمسات وسبا مصغّر'] },
    tag: { en: 'Discover & personalise', ar: 'اكتشاف وتخصيص' },
    line: { en: 'Discover, test and personalise: shade matching, fragrance and nail colour experiences.', ar: 'اكتشاف وتجربة وتخصيص: مطابقة الدرجات والعطور وألوان الأظافر.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Zone sponsor'], ar: ['راعي المنطقة'] }, items: { en: ['Product trials', 'Personalisation', 'Brand boutique', 'Launches'], ar: ['تجربة المنتجات', 'التخصيص', 'متجر العلامة', 'الإطلاقات'] } } },
  },
  {
    id: 'make', name: 'Make Studio', colour: '--zone-make', hex: '#c7efdf', image: 'make',
    plan: { rects: [[5.6, 0.9, 29.9, 12.0]], label: [17.7, 6.4], size: '18 × 10 m' },
    stations: { en: ['Bracelets & Charms', 'Phone Case Customisation', 'Laser Engraving', 'Embroidery & Textiles', 'Custom Candy'], ar: ['الأساور والتعليقات', 'تخصيص أغطية الجوال', 'النقش بالليزر', 'التطريز والأقمشة', 'حلوى مخصّصة'] },
    tag: { en: 'Make & personalise', ar: 'صنع وتخصيص' },
    line: { en: 'Create it. Personalise it. Take it home.', ar: 'صنع، تخصيص، ثم أخذ القطعة للمنزل.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Zone sponsor'], ar: ['راعي المنطقة'] }, items: { en: ['Branded make-and-take', 'Sponsored workshop station'], ar: ['محطة صنع بهوية العلامة', 'محطة ورشة برعاية'] } } },
  },
  {
    id: 'market', name: 'Pink Market', colour: '--zone-market', hex: '#ffd9c2', image: 'market',
    plan: { rects: [[30.3, 0.9, 49.4, 12.0]], label: [39.8, 6.4], size: '18 × 10 m' },
    stations: { en: ['Sweets & Ice Cream', 'Gifts & Teddy Bears', 'Accessories', 'Fashion'], ar: ['حلويات وآيس كريم', 'هدايا ودببة', 'إكسسوارات', 'أزياء'] },
    tag: { en: 'Find & discover', ar: 'تسوّق واكتشاف' },
    line: { en: 'Curated stores, sweets, fashion, accessories and seasonal pop-ups.', ar: 'متاجر منتقاة وحلويات وموضة وإكسسوارات ومتاجر موسمية مؤقتة.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Zone sponsor'], ar: ['راعي المنطقة'] }, items: { en: ['Launch pop-up', 'Limited-edition drop'], ar: ['متجر إطلاق', 'إصدار محدود'] } } },
  },
  {
    id: 'move', name: 'Move Studio', colour: '--zone-move', hex: '#d8ecff', image: 'move',
    plan: { rects: [[5.4, 30.0, 24.2, 44.6]], label: [14.8, 37.3], size: '26 × 13 m' },
    stations: { en: ['Ballet', 'Yoga', 'Dance', 'Spa corner'], ar: ['باليه', 'يوغا', 'رقص', 'ركن السبا'] },
    tag: { en: 'Move & feel good', ar: 'حركة وعافية' },
    line: { en: 'A calmer studio for ballet, yoga, dance and fitness classes.', ar: 'استوديو أهدأ لكلاسات الباليه واليوغا والرقص واللياقة.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Zone sponsor'], ar: ['راعي المنطقة'] }, items: { en: ['Sponsored class series', 'Wellness sessions'], ar: ['سلسلة كلاسات برعاية', 'جلسات عافية'] } } },
  },
  {
    id: 'live', name: 'PinkOut Live', colour: '--zone-live', hex: '#ffb8d2', image: 'live',
    plan: { rects: [[43.7, 13.1, 49.4, 30.0], [36.9, 16.0, 42.0, 27.4]], label: [44.5, 21.5], size: '6 × 12 m stage' },
    stations: { en: ['Main Stage', 'Audience seating'], ar: ['المسرح الرئيسي', 'مقاعد الجمهور'] },
    tag: { en: 'Watch & join in', ar: 'مشاهدة ومشاركة' },
    line: { en: 'The stage: performances, DJ sets, talks, podcasts and product launches.', ar: 'المسرح: عروض، دي جي، حوارات، بودكاست وإطلاقات منتجات.' },
    tracks: ['event'],
    offers: { event: { sponsorship: { en: ['Stage sponsor'], ar: ['راعي المسرح'] }, items: { en: ['Launch on stage', 'Talks & podcasts', 'Performances & DJ sets'], ar: ['إطلاق على المسرح', 'حوارات وبودكاست', 'عروض ودي جي'] } } },
  },
];

export const THEMES = [
  { id: 'kpop', en: 'K-POP Night', ar: 'ليلة الكي بوب' },
  { id: 'movie', en: 'Movie Night', ar: 'ليلة سينما' },
  { id: 'henna', en: 'Coffee & Henna Night', ar: 'ليلة قهوة وحنّاء' },
  { id: 'princess', en: 'Princess Day', ar: 'يوم الأميرات' },
  { id: 'pajama', en: 'Pajama Day', ar: 'يوم البيجامة' },
  { id: 'japan', en: 'Japanese Girls Day', ar: 'يوم الفتيات الياباني' },
  { id: 'camping', en: 'Girls Camping Day', ar: 'يوم التخييم' },
  { id: 'horror', en: 'Light Horror Day', ar: 'يوم الرعب الخفيف' },
];

export const TRACKS = ['event', 'beauty', 'shop'];
