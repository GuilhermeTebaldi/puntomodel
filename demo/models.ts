import type { ModelProfileData } from '../services/models';
import happyEscortsMultiProfilesRaw from '../services/happyescorts_multi_perfis.json?raw';
import happyEscortsRomaProfilesRaw from '../services/happyescorts_roma_perfis.json?raw';
import orhidiSpainProfilesRaw from '../services/orhidi_es_perfis.json?raw';
import orhidiItalyProfilesRaw from '../services/orhidi_it_perfis.json?raw';
import orhidiMoreProfilesRaw from '../services/orhidi_more_perfis.json?raw';
import orhidiMore2ProfilesRaw from '../services/orhidi_more2_perfis.json?raw';
import orhidiMore3ProfilesRaw from '../services/orhidi_more3_perfis.json?raw';

type DemoModelSeed = {
  name: string;
  age: number;
  phone: string;
  price: number;
  city: string;
  state: string;
  lat: number;
  lon: number;
  photos: string[];
  nationality: string;
  hair: string;
  eyes: string;
  height: string;
  weight: string;
  feet: string;
  services: string[];
  bio: string;
  ratingAvg: number;
  ratingCount: number;
  viewsToday: number;
  whatsappToday: number;
};

type HappyEscortsProfile = {
  id: string;
  name: string;
  age: number;
  city: string;
  country: string;
  profileUrl: string;
  photos: string[];
};

type OrhidiProfile = HappyEscortsProfile & {
  region?: string;
  price?: number | null;
  heightCm?: number | null;
  nationalityLabel?: string;
  hairLabel?: string;
  eyeLabel?: string;
  services?: string[];
  tags?: string[];
  isOnline?: boolean;
  rating?: number | null;
  commentsCount?: number;
};

const demoSeeds: DemoModelSeed[] = [
  {
    name: 'Giulia Conti',
    age: 24,
    phone: '+39 000 000 000 0001',
    price: 150,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4685,
    lon: 9.1824,
    photos: [
      'https://cdnb.orhidi.com/media/4709/01kn9ykz78x3s64th9p0fpcceg.jpg',
      'https://cdnb.orhidi.com/media/4710/01kn9ym8wd14gjrmeq5b288jh2.jpg',
      'https://cdnb.orhidi.com/media/4711/01kn9ymjhjefczyjp95qdazhe0.jpg',
    ],
    nationality: 'it',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.68',
    weight: '55',
    feet: '37',
    services: ['dinner', 'vip', 'hotel'],
    bio: 'Italiana de Milão, discreta e elegante. Gosto de encontros tranquilos, boa conversa e companhia com classe.',
    ratingAvg: 4.8,
    ratingCount: 42,
    viewsToday: 128,
    whatsappToday: 16,
  },
  {
    name: 'Sofia Bellini',
    age: 27,
    phone: '+39 000 000 000 0002',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4661,
    lon: 9.1968,
    photos: [
      'https://cdnb.orhidi.com/media/4517/clear_01HA5JDGQVPCBRZ8T70H5G3VDT.jpg',
      'https://cdnb.orhidi.com/media/4510/clear_01HA5JDDR4PXRX9MRN2MP8P4TB.jpg',
      'https://cdnb.orhidi.com/media/4495/clear_01HA5JD9JX1HJT8HQ0Q55NKJV7.jpg',
    ],
    nationality: 'it',
    hair: 'blonde',
    eyes: 'green',
    height: '1.72',
    weight: '58',
    feet: '38',
    services: ['girlfriend', 'dinner', 'travel'],
    bio: 'Sou comunicativa, pontual e gosto de criar uma atmosfera leve. Atendimento reservado em Milão para quem valoriza educação e presença.',
    ratingAvg: 4.9,
    ratingCount: 58,
    viewsToday: 174,
    whatsappToday: 23,
  },
  {
    name: 'Alessia Romano',
    age: 25,
    phone: '+39 000 000 000 0003',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4782,
    lon: 9.1881,
    photos: [
      'https://cdnb.orhidi.com/media/6734/clear_01HA5BE8ZDQFX65ERCFH33CWNX.jpg',
      'https://cdnb.orhidi.com/media/6738/clear_01HA5BEA3JDYDEQ0S0Q7XSC0DW.jpg',
      'https://cdnb.orhidi.com/media/6742/clear_01HA5BEBEW0NHMJW68E4E9NC8W.jpg',
    ],
    nationality: 'it',
    hair: 'black',
    eyes: 'brown',
    height: '1.66',
    weight: '54',
    feet: '37',
    services: ['vip', 'massage', 'hotel'],
    bio: 'Perfil sofisticado, com atenção aos detalhes e muita discrição. Prefiro encontros bem combinados e ambiente confortável.',
    ratingAvg: 4.7,
    ratingCount: 36,
    viewsToday: 109,
    whatsappToday: 14,
  },
  {
    name: 'Chiara Marino',
    age: 28,
    phone: '+39 000 000 000 0004',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4555,
    lon: 9.1714,
    photos: [
      'https://cdnb.orhidi.com/media/595/01HA60F02CYVXM7520TB2B6G13.jpg',
      'https://cdnb.orhidi.com/media/611/01HA60F3JJ1TVKY6VE32QNG690.jpg',
      'https://cdnb.orhidi.com/media/610/clear_01HA60F20174D235JW931AJS81.jpg',
    ],
    nationality: 'it',
    hair: 'brunette',
    eyes: 'blue',
    height: '1.70',
    weight: '57',
    feet: '38',
    services: ['girlfriend', 'outcall', 'dinner'],
    bio: 'Milanesa charmosa, educada e reservada. Gosto de bons restaurantes, hotéis elegantes e conversas sem pressa.',
    ratingAvg: 4.9,
    ratingCount: 63,
    viewsToday: 191,
    whatsappToday: 27,
  },
  {
    name: 'Elena Ferri',
    age: 23,
    phone: '+39 000 000 000 0005',
    price: 200,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4622,
    lon: 9.2051,
    photos: [
      'https://cdnb.orhidi.com/media/601/clear_01HA57150KNJMJ697GNQ8RY4YN.jpg',
      'https://cdnb.orhidi.com/media/489/01HA570RBP1V7TB42ZVEYXYYZN.jpg',
      'https://cdnb.orhidi.com/media/534/clear_01HA570XKHKXWY5PBQYM1TM961.jpg',
    ],
    nationality: 'it',
    hair: 'blonde',
    eyes: 'brown',
    height: '1.65',
    weight: '53',
    feet: '36',
    services: ['massage', 'hotel', 'vip'],
    bio: 'Doce, simpática e muito cuidadosa com privacidade. Disponível para companhia discreta em Milão.',
    ratingAvg: 4.6,
    ratingCount: 31,
    viewsToday: 97,
    whatsappToday: 11,
  },
  {
    name: 'Valentina Ricci',
    age: 29,
    phone: '+39 000 000 000 0006',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4863,
    lon: 9.2026,
    photos: [
      'https://cdnb.orhidi.com/media/7564/clear_01HA58N5PSTK59XGV7309SVGAJ.jpg',
      'https://cdnb.orhidi.com/media/7533/clear_01HA58MYSCV4PPAZTX4X067X11.jpg',
      'https://cdnb.orhidi.com/media/7519/clear_01HA58MVQ2JXV5SCYJ91T775RX.jpg',
    ],
    nationality: 'it',
    hair: 'black',
    eyes: 'green',
    height: '1.74',
    weight: '60',
    feet: '39',
    services: ['travel', 'dinner', 'vip'],
    bio: 'Elegante e independente, adoro viagens curtas e encontros com boa energia. Atendimento discreto e bem organizado.',
    ratingAvg: 4.9,
    ratingCount: 77,
    viewsToday: 216,
    whatsappToday: 34,
  },
  {
    name: 'Martina Rinaldi',
    age: 26,
    phone: '+39 000 000 000 0007',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4497,
    lon: 9.1864,
    photos: [
      'https://cdnb.orhidi.com/media/5383/clear_01HA5WB8Z1VT3GEB27Q0N86V6E.jpg',
      'https://cdnb.orhidi.com/media/5344/clear_01HA5WB45WS3VGQ8CDVWZX2CGK.jpg',
      'https://cdnb.orhidi.com/media/5359/clear_01HA5WB60HY0M9JT0YSV8MGCED.jpg',
    ],
    nationality: 'it',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.69',
    weight: '56',
    feet: '37',
    services: ['girlfriend', 'hotel', 'massage'],
    bio: 'Natural e bem-humorada, gosto de fazer o encontro parecer fácil e confortável desde o primeiro minuto.',
    ratingAvg: 4.8,
    ratingCount: 49,
    viewsToday: 151,
    whatsappToday: 19,
  },
  {
    name: 'Isabella Greco',
    age: 30,
    phone: '+39 000 000 000 0008',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4736,
    lon: 9.2145,
    photos: [
      'https://cdnb.orhidi.com/media/1668/clear_01HA5A8BS2GTRCBHN34VXDRQ5R.jpg',
      'https://cdnb.orhidi.com/media/1663/clear_01HA5A8ATB86P671YM84S6FR8B.jpg',
      'https://cdnb.orhidi.com/media/1675/clear_01HA5A8DEPX83E4RRA0GDPJDAJ.jpg',
    ],
    nationality: 'it',
    hair: 'red',
    eyes: 'green',
    height: '1.71',
    weight: '59',
    feet: '38',
    services: ['vip', 'dinner', 'outcall'],
    bio: 'Tenho estilo clássico e gosto de encontros refinados. Discrição, pontualidade e educação sempre em primeiro lugar.',
    ratingAvg: 4.7,
    ratingCount: 44,
    viewsToday: 142,
    whatsappToday: 18,
  },
  {
    name: 'Beatrice Lombardi',
    age: 24,
    phone: '+39 000 000 000 0009',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.459,
    lon: 9.2248,
    photos: [
      'https://cdnb.orhidi.com/media/8463/clear_01HA5XEESPSMBCHZFJRQRC96X1.jpg',
      'https://cdnb.orhidi.com/media/8476/clear_01HA5XEHGEMGMJFXW3VXJ2817C.jpg',
      'https://cdnb.orhidi.com/media/8443/clear_01HA5XEAZ5P8YNR7G5SFSAJ867.jpg',
    ],
    nationality: 'it',
    hair: 'blonde',
    eyes: 'blue',
    height: '1.67',
    weight: '54',
    feet: '37',
    services: ['massage', 'girlfriend', 'hotel'],
    bio: 'Sou carinhosa, educada e gosto de conversar. Atendimento reservado para quem procura leveza e boa companhia.',
    ratingAvg: 4.8,
    ratingCount: 53,
    viewsToday: 167,
    whatsappToday: 22,
  },
  {
    name: 'Francesca De Luca',
    age: 31,
    phone: '+39 000 000 000 0010',
    price: 300,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4412,
    lon: 9.2087,
    photos: [
      'https://cdnb.orhidi.com/media/3157/clear_01HA62MY2ZT4T1G5WDF92556S7.jpg',
      'https://cdnb.orhidi.com/media/3146/clear_01HA62MVRXYVB9D3ZDSWCX8R24.jpg',
      'https://cdnb.orhidi.com/media/3163/clear_01HA62MYWA735Y95VA6291DHRW.jpg',
    ],
    nationality: 'it',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.73',
    weight: '61',
    feet: '39',
    services: ['dinner', 'travel', 'vip'],
    bio: 'Mulher madura, elegante e discreta. Gosto de companhia inteligente, bons lugares e acordos claros.',
    ratingAvg: 4.9,
    ratingCount: 82,
    viewsToday: 233,
    whatsappToday: 38,
  },
  {
    name: 'Noemi Sartori',
    age: 22,
    phone: '+39 000 000 000 0011',
    price: 100,
    city: 'Milão',
    state: 'Lombardia',
    lat: 45.4921,
    lon: 9.1743,
    photos: [
      'https://cdnb.orhidi.com/media/4712/01kna1q30m0qaa9yqjefx5k6mv.jpg',
      'https://cdnb.orhidi.com/media/4713/01kna1qcpq8dyj4y380hzs85pr.jpg',
      'https://cdnb.orhidi.com/media/4714/01kna1qnf5gm5g7asrmxanaxyv.jpg',
    ],
    nationality: 'it',
    hair: 'black',
    eyes: 'brown',
    height: '1.64',
    weight: '52',
    feet: '36',
    services: ['hotel', 'massage', 'dinner'],
    bio: 'Jovem, sorridente e discreta. Gosto de encontros simples, bem combinados e com respeito.',
    ratingAvg: 4.5,
    ratingCount: 28,
    viewsToday: 88,
    whatsappToday: 9,
  },
  {
    name: 'Carlotta Bianchi',
    age: 28,
    phone: '+39 000 000 000 0012',
    price: 300,
    city: 'Roma',
    state: 'Lazio',
    lat: 41.9028,
    lon: 12.4964,
    photos: [
      'https://cdnb.orhidi.com/media/8659/clear_01HA5WZ4JZ8GNFQT6NN143QYCR.jpg',
      'https://cdnb.orhidi.com/media/8663/clear_01HA5WZ5AE817YA2XA94SEE2W3.jpg',
      'https://cdnb.orhidi.com/media/8675/clear_01HA5WZ8A1WZ3A2JVQ6R3A4E1W.jpg',
    ],
    nationality: 'it',
    hair: 'brunette',
    eyes: 'green',
    height: '1.70',
    weight: '57',
    feet: '38',
    services: ['vip', 'dinner', 'outcall'],
    bio: 'Romana, refinada e muito reservada. Adoro encontros bem planejados e ambientes elegantes.',
    ratingAvg: 4.8,
    ratingCount: 57,
    viewsToday: 159,
    whatsappToday: 20,
  },
  {
    name: 'Laura Schneider',
    age: 25,
    phone: '+49 000 000 000 0013',
    price: 100,
    city: 'Weil am Rhein',
    state: 'Baden-Württemberg',
    lat: 47.5934,
    lon: 7.6198,
    photos: [
      'https://cdnb.orhidi.com/media/3250/01kk4aa7sk9xspdr97mjhd0geg.jpg',
      'https://cdnb.orhidi.com/media/3251/01kk4aa8paz95s18ydp4zq9wwr.jpg',
      'https://cdnb.orhidi.com/media/3215/01kk1tte0gfdha4fmdn91nnp5b.jpg',
    ],
    nationality: 'de',
    hair: 'blonde',
    eyes: 'blue',
    height: '1.69',
    weight: '56',
    feet: '38',
    services: ['hotel', 'massage', 'girlfriend'],
    bio: 'Europeia discreta e simpática, disponível em Weil am Rhein. Gosto de pontualidade, respeito e clima leve.',
    ratingAvg: 4.6,
    ratingCount: 34,
    viewsToday: 102,
    whatsappToday: 13,
  },
  {
    name: 'Amelie Bauer',
    age: 29,
    phone: '+49 000 000 000 0014',
    price: 250,
    city: 'Weil am Rhein',
    state: 'Baden-Württemberg',
    lat: 47.5898,
    lon: 7.6106,
    photos: [
      'https://cdnb.orhidi.com/media/3551/01HFWZ6GFD8HS6ZEPTFPZP7DE3.jpg',
      'https://cdnb.orhidi.com/media/3553/01HFWZ6H6KN8469MG6CV73XKAR.jpg',
      'https://cdnb.orhidi.com/media/3552/01HFWZ6GV53B5FZQYRF06PPP9H.jpg',
    ],
    nationality: 'de',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.72',
    weight: '59',
    feet: '39',
    services: ['dinner', 'vip', 'travel'],
    bio: 'Reservada, educada e com presença elegante. Boa companhia para jantar, hotel ou agenda curta na região.',
    ratingAvg: 4.7,
    ratingCount: 46,
    viewsToday: 136,
    whatsappToday: 17,
  },
  {
    name: 'Klara Hoffmann',
    age: 26,
    phone: '+49 000 000 000 0015',
    price: 300,
    city: 'Weil am Rhein',
    state: 'Baden-Württemberg',
    lat: 47.5969,
    lon: 7.6291,
    photos: [
      'https://cdnb.orhidi.com/media/9794/01hp7p69yzf5fegsc8d0jnb760.jpg',
      'https://cdnb.orhidi.com/media/9758/01hp7p5ekn809w2hvz5wmdfshx.jpg',
      'https://cdnb.orhidi.com/media/9768/01hp7p5qqkt6g8zj64b3gqmxqe.jpg',
    ],
    nationality: 'de',
    hair: 'red',
    eyes: 'green',
    height: '1.67',
    weight: '55',
    feet: '37',
    services: ['vip', 'hotel', 'massage'],
    bio: 'Gosto de encontros discretos e bem cuidados. Sou tranquila, comunicativa e valorizo combinações claras.',
    ratingAvg: 4.8,
    ratingCount: 51,
    viewsToday: 149,
    whatsappToday: 21,
  },
  {
    name: 'Mia Keller',
    age: 30,
    phone: '+49 000 000 000 0016',
    price: 300,
    city: 'Weil am Rhein',
    state: 'Baden-Württemberg',
    lat: 47.5842,
    lon: 7.6219,
    photos: [
      'https://cdnb.orhidi.com/media/6875/01H8333AXK024B47NVF16G82VZ.jpg',
      'https://cdnb.orhidi.com/media/6912/01H8333D5MH1YVP786BH78S3A0.jpg',
      'https://cdnb.orhidi.com/media/6964/01H8333G7F1VZB51ZC9X83HYT2.jpg',
    ],
    nationality: 'de',
    hair: 'black',
    eyes: 'brown',
    height: '1.75',
    weight: '62',
    feet: '39',
    services: ['girlfriend', 'dinner', 'outcall'],
    bio: 'Elegante, madura e discreta. Prefiro encontros calmos, com respeito ao tempo e privacidade de cada pessoa.',
    ratingAvg: 4.9,
    ratingCount: 66,
    viewsToday: 183,
    whatsappToday: 29,
  },
  {
    name: 'Anna Gruber',
    age: 24,
    phone: '+43 000 000 000 0017',
    price: 200,
    city: 'Viena',
    state: 'Viena',
    lat: 48.2082,
    lon: 16.3738,
    photos: [
      'https://cdnb.orhidi.com/media/5355/01kp8scg2k9qhzsthsz1f4anw1.jpg',
      'https://cdnb.orhidi.com/media/5358/01kp8scjfkk7pw3r3ksrkm96xy.jpg',
      'https://cdnb.orhidi.com/media/5359/01kp8sck7dewb4jsaxdaygg3db.jpg',
    ],
    nationality: 'at',
    hair: 'blonde',
    eyes: 'blue',
    height: '1.66',
    weight: '54',
    feet: '37',
    services: ['hotel', 'dinner', 'vip'],
    bio: 'Austríaca gentil e discreta em Viena. Boa conversa, estilo natural e atenção aos detalhes.',
    ratingAvg: 4.7,
    ratingCount: 39,
    viewsToday: 121,
    whatsappToday: 15,
  },
  {
    name: 'Leonie Weiss',
    age: 27,
    phone: '+43 000 000 000 0018',
    price: 150,
    city: 'Viena',
    state: 'Viena',
    lat: 48.2175,
    lon: 16.3606,
    photos: [
      'https://cdnb.orhidi.com/media/5363/01kp8tnn9vctayyr004465efaf.jpg',
      'https://cdnb.orhidi.com/media/5362/01kp8tnmd8gfecyn3nn3322je2.jpg',
      'https://cdnb.orhidi.com/media/5364/01kp8tnp1m0nn240jg44fjnymr.jpg',
    ],
    nationality: 'at',
    hair: 'brunette',
    eyes: 'green',
    height: '1.70',
    weight: '57',
    feet: '38',
    services: ['massage', 'girlfriend', 'hotel'],
    bio: 'Sorridente e reservada, gosto de criar uma experiência tranquila. Disponível em Viena com agenda flexível.',
    ratingAvg: 4.6,
    ratingCount: 33,
    viewsToday: 98,
    whatsappToday: 12,
  },
  {
    name: 'Emma Van Dijk',
    age: 25,
    phone: '+31 000 000 000 0019',
    price: 120,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3676,
    lon: 4.9041,
    photos: [
      'https://cdnb.orhidi.com/media/5875/01HFW2NB0Y988XB0NDR44QVK0V.jpg',
      'https://cdnb.orhidi.com/media/5877/01HFW2NBVNXGMXHSEBRFR5SJHP.jpg',
      'https://cdnb.orhidi.com/media/5876/01HFW2NBE5XP68NF724GN5NDGC.jpg',
    ],
    nationality: 'nl',
    hair: 'blonde',
    eyes: 'blue',
    height: '1.71',
    weight: '58',
    feet: '39',
    services: ['dinner', 'hotel', 'travel'],
    bio: 'Holandesa simpática em Amsterdão. Gosto de encontros discretos, boa conversa e planos bem organizados.',
    ratingAvg: 4.8,
    ratingCount: 47,
    viewsToday: 144,
    whatsappToday: 18,
  },
  {
    name: 'Eva De Vries',
    age: 28,
    phone: '+31 000 000 000 0020',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3589,
    lon: 4.891,
    photos: [
      'https://cdnb.orhidi.com/media/3547/01HFW6TGTKHDMAE5G40XBMQ6GR.jpg',
      'https://cdnb.orhidi.com/media/3552/01HFW6TKA1Q3F25Q6YQ2M0FWV8.jpg',
      'https://cdnb.orhidi.com/media/3550/01HFW6TJCSXCT9WWV06YSW4FVW.jpg',
    ],
    nationality: 'nl',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.68',
    weight: '56',
    feet: '38',
    services: ['massage', 'hotel', 'outcall'],
    bio: 'Perfil discreto, educado e acolhedor. Gosto de pontualidade e de manter tudo simples e confortável.',
    ratingAvg: 4.5,
    ratingCount: 29,
    viewsToday: 84,
    whatsappToday: 10,
  },
  {
    name: 'Lotte Smit',
    age: 23,
    phone: '+31 000 000 000 0021',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3791,
    lon: 4.8994,
    photos: [
      'https://cdnb.orhidi.com/media/2473/01HFW64S9HBRXQXERNPSZF0XKZ.jpg',
      'https://cdnb.orhidi.com/media/2474/01HFW64SYSVF13HBK3J3NFSNNP.jpg',
      'https://cdnb.orhidi.com/media/2481/01HFW64WXH0TSS3ND103GXJ1S2.jpg',
    ],
    nationality: 'nl',
    hair: 'red',
    eyes: 'green',
    height: '1.65',
    weight: '53',
    feet: '37',
    services: ['girlfriend', 'dinner', 'hotel'],
    bio: 'Leve, espontânea e discreta. Gosto de companhia agradável e encontros sem pressão.',
    ratingAvg: 4.6,
    ratingCount: 32,
    viewsToday: 91,
    whatsappToday: 12,
  },
  {
    name: 'Nina Meijer',
    age: 26,
    phone: '+31 000 000 000 0022',
    price: 120,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3499,
    lon: 4.9168,
    photos: [
      'https://cdnb.orhidi.com/media/2808/01k77y6gjzfb6pxwptz5t62v5e.jpeg',
      'https://cdnb.orhidi.com/media/2805/01k77y5qapvr3ekf7jyyxe59kv.jpeg',
      'https://cdnb.orhidi.com/media/2806/01k77y63hnfkcg26c32qv2x1st.png',
    ],
    nationality: 'nl',
    hair: 'black',
    eyes: 'brown',
    height: '1.69',
    weight: '57',
    feet: '38',
    services: ['vip', 'massage', 'hotel'],
    bio: 'Sou reservada, cuidadosa e gosto de receber com calma. Disponível em Amsterdão para encontros bem combinados.',
    ratingAvg: 4.7,
    ratingCount: 41,
    viewsToday: 126,
    whatsappToday: 16,
  },
  {
    name: 'Sanne Jansen',
    age: 29,
    phone: '+31 000 000 000 0023',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3861,
    lon: 4.8814,
    photos: [
      'https://cdnb.orhidi.com/media/7156/01HFW3BFY65RG8W1XATB3QBYQN.jpg',
      'https://cdnb.orhidi.com/media/7157/01HFW3BG90TA6E4WCNHAR48QPN.jpg',
    ],
    nationality: 'nl',
    hair: 'brunette',
    eyes: 'blue',
    height: '1.73',
    weight: '60',
    feet: '39',
    services: ['dinner', 'travel', 'vip'],
    bio: 'Elegante e discreta, com preferência por encontros reservados e boa conversa em Amsterdão.',
    ratingAvg: 4.8,
    ratingCount: 52,
    viewsToday: 155,
    whatsappToday: 22,
  },
  {
    name: 'Mila Vermeer',
    age: 24,
    phone: '+31 000 000 000 0024',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3645,
    lon: 4.8731,
    photos: [
      'https://cdnb.orhidi.com/media/8459/01kd03gqbngxhhckw2hmsh8m5k.jpg',
      'https://cdnb.orhidi.com/media/8460/01kd03h3dk7r82pr6jvgjvgm50.jpg',
      'https://cdnb.orhidi.com/media/8461/01kd03hdb2atz4j9rk2p0h0510.jpg',
    ],
    nationality: 'nl',
    hair: 'blonde',
    eyes: 'green',
    height: '1.66',
    weight: '54',
    feet: '37',
    services: ['hotel', 'massage', 'girlfriend'],
    bio: 'Doce, alegre e discreta. Gosto de deixar o encontro natural, com respeito e atenção.',
    ratingAvg: 4.6,
    ratingCount: 35,
    viewsToday: 104,
    whatsappToday: 14,
  },
  {
    name: 'Zoé Laurent',
    age: 27,
    phone: '+33 000 000 000 0025',
    price: 120,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3728,
    lon: 4.9297,
    photos: [
      'https://cdnb.orhidi.com/media/2031/01HFW5YGTYJ11T9JGEH89CRD4E.jpg',
      'https://cdnb.orhidi.com/media/2030/01HFW5YGG1P8X48JJG7JC1D27Q.jpg',
      'https://cdnb.orhidi.com/media/2027/01HFW5YFHHFPN91PG4F3ZM8JR0.jpg',
    ],
    nationality: 'fr',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.70',
    weight: '58',
    feet: '38',
    services: ['dinner', 'vip', 'hotel'],
    bio: 'Francesa em Amsterdão, discreta e elegante. Boa companhia para momentos reservados e bem planejados.',
    ratingAvg: 4.7,
    ratingCount: 43,
    viewsToday: 132,
    whatsappToday: 18,
  },
  {
    name: 'Camille Moreau',
    age: 30,
    phone: '+33 000 000 000 0026',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3416,
    lon: 4.8856,
    photos: [
      'https://cdnb.orhidi.com/media/6558/01HFW8GTMYZ44Z9KT25XMDENDK.jpg',
      'https://cdnb.orhidi.com/media/6568/01HFW8GVH22JB50WZW9FHFW7T8.jpg',
      'https://cdnb.orhidi.com/media/6566/01HFW8GRB987FTQGC504GY53FG.jpg',
    ],
    nationality: 'fr',
    hair: 'black',
    eyes: 'brown',
    height: '1.74',
    weight: '61',
    feet: '39',
    services: ['travel', 'dinner', 'vip'],
    bio: 'Reservada, charmosa e atenta aos detalhes. Gosto de encontros com calma, educação e discrição.',
    ratingAvg: 4.8,
    ratingCount: 55,
    viewsToday: 161,
    whatsappToday: 24,
  },
  {
    name: 'Ines Dubois',
    age: 22,
    phone: '+33 000 000 000 0027',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3971,
    lon: 4.9048,
    photos: [
      'https://cdnb.orhidi.com/media/1174/01HFW5F2BYRJKDG4V6SWQ62M0P.jpg',
      'https://cdnb.orhidi.com/media/1175/01HFW5F2S5JFN379760QJGFPNF.jpg',
    ],
    nationality: 'fr',
    hair: 'blonde',
    eyes: 'blue',
    height: '1.64',
    weight: '52',
    feet: '36',
    services: ['massage', 'hotel', 'girlfriend'],
    bio: 'Delicada, simpática e muito discreta. Atendimento reservado com atenção ao conforto e privacidade.',
    ratingAvg: 4.5,
    ratingCount: 27,
    viewsToday: 79,
    whatsappToday: 8,
  },
  {
    name: 'Clara Rossi',
    age: 28,
    phone: '+39 000 000 000 0028',
    price: 100,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3535,
    lon: 4.9362,
    photos: [
      'https://cdnb.orhidi.com/media/7272/01HFW8WE1BM1ANGJPC1X29X3VC.jpg',
      'https://cdnb.orhidi.com/media/7283/01HFW8WJ8ED576AE7NM3B50126.jpg',
      'https://cdnb.orhidi.com/media/7285/01HFW8WK0FEZR1BAHZCPMGJ5WR.jpg',
    ],
    nationality: 'it',
    hair: 'red',
    eyes: 'green',
    height: '1.71',
    weight: '59',
    feet: '38',
    services: ['vip', 'hotel', 'dinner'],
    bio: 'Italiana vivendo entre viagens pela Europa. Discrição, bom humor e encontros bem organizados.',
    ratingAvg: 4.8,
    ratingCount: 50,
    viewsToday: 147,
    whatsappToday: 21,
  },
  {
    name: 'Greta Mancini',
    age: 31,
    phone: '+39 000 000 000 0029',
    price: 200,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3819,
    lon: 4.9366,
    photos: [
      'https://cdnb.orhidi.com/media/2463/01HFW64NVWXBSV0KVTZ7NW70YY.jpg',
      'https://cdnb.orhidi.com/media/2458/01HFW64KT6Z6KG8AJNN4P1R7RS.jpg',
      'https://cdnb.orhidi.com/media/2452/01HFW64FK4FD1WYXK1KFQTE39T.jpg',
    ],
    nationality: 'it',
    hair: 'brunette',
    eyes: 'brown',
    height: '1.76',
    weight: '63',
    feet: '40',
    services: ['travel', 'dinner', 'outcall'],
    bio: 'Madura, discreta e elegante. Gosto de companhia inteligente, bons lugares e privacidade total.',
    ratingAvg: 4.9,
    ratingCount: 72,
    viewsToday: 205,
    whatsappToday: 31,
  },
  {
    name: 'Sara Moretti',
    age: 26,
    phone: '+39 000 000 000 0030',
    price: 250,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3269,
    lon: 4.8992,
    photos: [
      'https://cdnb.orhidi.com/media/3347/01HFW6PNWGE56C5QXQQ7BJ0CSP.jpg',
      'https://cdnb.orhidi.com/media/3348/01HFW6PP687NVVEZJ2S7Y8QYCM.jpg',
    ],
    nationality: 'it',
    hair: 'black',
    eyes: 'green',
    height: '1.68',
    weight: '55',
    feet: '37',
    services: ['girlfriend', 'hotel', 'massage'],
    bio: 'Sou discreta, sorridente e gosto de encontros naturais. Disponível em Amsterdão com agenda sob consulta.',
    ratingAvg: 4.7,
    ratingCount: 38,
    viewsToday: 119,
    whatsappToday: 16,
  },
  {
    name: 'Viola Gatti',
    age: 29,
    phone: '+39 000 000 000 0031',
    price: 200,
    city: 'Amsterdão',
    state: 'Noord-Holland',
    lat: 52.3918,
    lon: 4.8609,
    photos: [
      'https://cdnb.orhidi.com/media/2936/01HFW6F24E8THY1RBGDH5H5TWG.jpg',
      'https://cdnb.orhidi.com/media/2933/01HFW6F36615E904A3AFNKKRZ3.jpg',
    ],
    nationality: 'it',
    hair: 'blonde',
    eyes: 'blue',
    height: '1.72',
    weight: '58',
    feet: '38',
    services: ['vip', 'dinner', 'travel'],
    bio: 'Elegante, tranquila e reservada. Gosto de encontros bem planejados e de manter tudo com respeito.',
    ratingAvg: 4.8,
    ratingCount: 45,
    viewsToday: 139,
    whatsappToday: 19,
  },
];

const parseHappyEscortsMultiProfiles = () => {
  try {
    const parsed = JSON.parse(happyEscortsMultiProfilesRaw);
    return Array.isArray(parsed) ? (parsed as HappyEscortsProfile[]) : [];
  } catch {
    return [];
  }
};

const parseHappyEscortsRomaProfiles = () => {
  try {
    const parsed = JSON.parse(happyEscortsRomaProfilesRaw);
    return Array.isArray(parsed) ? (parsed as HappyEscortsProfile[]) : [];
  } catch {
    return [];
  }
};

const parseOrhidiSpainProfiles = () => {
  try {
    const parsed = JSON.parse(orhidiSpainProfilesRaw);
    return Array.isArray(parsed) ? (parsed as OrhidiProfile[]) : [];
  } catch {
    return [];
  }
};

const parseOrhidiItalyProfiles = () => {
  try {
    const parsed = JSON.parse(orhidiItalyProfilesRaw);
    return Array.isArray(parsed) ? (parsed as OrhidiProfile[]) : [];
  } catch {
    return [];
  }
};

const parseOrhidiMoreProfiles = () => {
  try {
    const parsed = JSON.parse(orhidiMoreProfilesRaw);
    return Array.isArray(parsed) ? (parsed as OrhidiProfile[]) : [];
  } catch {
    return [];
  }
};

const parseOrhidiMore2Profiles = () => {
  try {
    const parsed = JSON.parse(orhidiMore2ProfilesRaw);
    return Array.isArray(parsed) ? (parsed as OrhidiProfile[]) : [];
  } catch {
    return [];
  }
};

const parseOrhidiMore3Profiles = () => {
  try {
    const parsed = JSON.parse(orhidiMore3ProfilesRaw);
    return Array.isArray(parsed) ? (parsed as OrhidiProfile[]) : [];
  } catch {
    return [];
  }
};

const cityCoordinates: Record<string, { lat: number; lon: number; state: string }> = {
  Roma: { lat: 41.9028, lon: 12.4964, state: 'Lazio' },
  Lisboa: { lat: 38.7223, lon: -9.1393, state: 'Lisboa' },
  Porto: { lat: 41.1579, lon: -8.6291, state: 'Porto' },
  Cascais: { lat: 38.6968, lon: -9.4215, state: 'Lisboa' },
  Faro: { lat: 37.0194, lon: -7.9304, state: 'Algarve' },
  'Faro (Sé e São Pedro)': { lat: 37.0194, lon: -7.9304, state: 'Algarve' },
  Vilamoura: { lat: 37.077, lon: -8.1178, state: 'Algarve' },
  Coimbra: { lat: 40.2033, lon: -8.4103, state: 'Coimbra' },
  'Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)': { lat: 40.2033, lon: -8.4103, state: 'Coimbra' },
  Braga: { lat: 41.5454, lon: -8.4265, state: 'Braga' },
  'Braga (Maximinos, Sé e Cividade)': { lat: 41.5454, lon: -8.4265, state: 'Braga' },
  Setúbal: { lat: 38.5244, lon: -8.8882, state: 'Setúbal' },
  'Setúbal (São Julião, Nossa Senhora da Anunciada e Santa Maria da Graça)': { lat: 38.5244, lon: -8.8882, state: 'Setúbal' },
  Aveiro: { lat: 40.6405, lon: -8.6538, state: 'Aveiro' },
  Amora: { lat: 38.6296, lon: -9.1156, state: 'Setúbal' },
  'Ponte de Lima': { lat: 41.7676, lon: -8.5833, state: 'Viana do Castelo' },
  'São Gonçalo de Lagos': { lat: 37.102, lon: -8.6742, state: 'Algarve' },
  'Cascais e Estoril': { lat: 38.6968, lon: -9.4215, state: 'Lisboa' },
  'Vila Nova de Gaia': { lat: 41.1239, lon: -8.6118, state: 'Porto' },
  'Santa Maria Maior': { lat: 38.7114, lon: -9.1368, state: 'Lisboa' },
  Loulé: { lat: 37.1377, lon: -8.0197, state: 'Algarve' },
  Albufeira: { lat: 37.0891, lon: -8.2479, state: 'Algarve' },
  Óbidos: { lat: 39.3606, lon: -9.1567, state: 'Leiria' },
  Guimarães: { lat: 41.4444, lon: -8.2962, state: 'Braga' },
  Sintra: { lat: 38.8029, lon: -9.3817, state: 'Lisboa' },
  Leiria: { lat: 39.7436, lon: -8.8071, state: 'Leiria' },
  Viseu: { lat: 40.6566, lon: -7.9125, state: 'Viseu' },
  Évora: { lat: 38.5714, lon: -7.9135, state: 'Évora' },
  Portimão: { lat: 37.1366, lon: -8.5377, state: 'Algarve' },
  Funchal: { lat: 32.6669, lon: -16.9241, state: 'Madeira' },
  Paris: { lat: 48.8566, lon: 2.3522, state: 'Île-de-France' },
  Marselha: { lat: 43.2965, lon: 5.3698, state: 'Provença-Alpes-Costa Azul' },
  Nice: { lat: 43.7102, lon: 7.262, state: 'Provença-Alpes-Costa Azul' },
  Ajaccio: { lat: 41.9192, lon: 8.7386, state: 'Córsega' },
  Cannes: { lat: 43.5528, lon: 7.0174, state: 'Provença-Alpes-Costa Azul' },
  Toulouse: { lat: 43.6047, lon: 1.4442, state: 'Occitânia' },
  Lião: { lat: 45.764, lon: 4.8357, state: 'Auvérnia-Ródano-Alpes' },
  Lille: { lat: 50.6292, lon: 3.0573, state: 'Hauts-de-France' },
  Bordéus: { lat: 44.8378, lon: -0.5792, state: 'Nova Aquitânia' },
  Atenas: { lat: 37.9838, lon: 23.7275, state: 'Ática' },
  'Municipality of Piraeus': { lat: 37.942, lon: 23.6469, state: 'Ática' },
  'Municipality of Thessaloniki': { lat: 40.6401, lon: 22.9444, state: 'Macedônia Central' },
  'Municipality of Mykonos': { lat: 37.4467, lon: 25.3289, state: 'Egeu Meridional' },
  'Municipality of Thira': { lat: 36.3932, lon: 25.4615, state: 'Egeu Meridional' },
  'Municipality of Larissa': { lat: 39.639, lon: 22.4191, state: 'Tessália' },
  'Loutraki-Perachora-Agioi Theodoroi Municipality': { lat: 37.9783, lon: 22.9778, state: 'Peloponeso' },
  Milão: { lat: 45.4642, lon: 9.19, state: 'Lombardia' },
  Bologna: { lat: 44.4949, lon: 11.3426, state: 'Emília-Romanha' },
  Verona: { lat: 45.4384, lon: 10.9916, state: 'Vêneto' },
  Turim: { lat: 45.0703, lon: 7.6869, state: 'Piemonte' },
  Nápoles: { lat: 40.8518, lon: 14.2681, state: 'Campânia' },
  Palermo: { lat: 38.1157, lon: 13.3615, state: 'Sicília' },
  Florença: { lat: 43.7696, lon: 11.2558, state: 'Toscana' },
  Génova: { lat: 44.4056, lon: 8.9463, state: 'Ligúria' },
  Bari: { lat: 41.1171, lon: 16.8719, state: 'Apúlia' },
  Pádua: { lat: 45.4064, lon: 11.8768, state: 'Vêneto' },
  Veneza: { lat: 45.4408, lon: 12.3155, state: 'Vêneto' },
  Trieste: { lat: 45.6495, lon: 13.7768, state: 'Friuli-Venezia Giulia' },
  Parma: { lat: 44.8015, lon: 10.3279, state: 'Emília-Romanha' },
  Madrid: { lat: 40.4168, lon: -3.7038, state: 'Comunidade de Madrid' },
  Barcelona: { lat: 41.3874, lon: 2.1686, state: 'Catalunha' },
  Valencia: { lat: 39.4699, lon: -0.3763, state: 'Valência' },
  Alicante: { lat: 38.3452, lon: -0.481, state: 'Valência' },
  Málaga: { lat: 36.7213, lon: -4.4214, state: 'Andaluzia' },
  Marbella: { lat: 36.5101, lon: -4.8824, state: 'Andaluzia' },
  Sevilha: { lat: 37.3891, lon: -5.9845, state: 'Andaluzia' },
  Palma: { lat: 39.5696, lon: 2.6502, state: 'Ilhas Baleares' },
  Saragoça: { lat: 41.6488, lon: -0.8891, state: 'Aragão' },
  Benidorm: { lat: 38.5411, lon: -0.1225, state: 'Valência' },
};

const countryCoordinates: Record<string, { lat: number; lon: number; state: string; nationality: string }> = {
  Argentina: { lat: -34.6037, lon: -58.3816, state: 'Buenos Aires', nationality: 'ar' },
  Armênia: { lat: 40.1792, lon: 44.4991, state: 'Armênia', nationality: 'am' },
  Brasil: { lat: -23.5505, lon: -46.6333, state: 'Brasil', nationality: 'br' },
  Espanha: { lat: 40.4168, lon: -3.7038, state: 'Espanha', nationality: 'es' },
  França: { lat: 48.8566, lon: 2.3522, state: 'França', nationality: 'fr' },
  Grécia: { lat: 37.9838, lon: 23.7275, state: 'Grécia', nationality: 'gr' },
  Holanda: { lat: 52.3676, lon: 4.9041, state: 'Holanda', nationality: 'nl' },
  Itália: { lat: 45.4642, lon: 9.19, state: 'Lombardia', nationality: 'it' },
  Japão: { lat: 35.6762, lon: 139.6503, state: 'Japão', nationality: 'jp' },
  Kosovo: { lat: 42.6629, lon: 21.1655, state: 'Kosovo', nationality: 'xk' },
  Portugal: { lat: 38.7223, lon: -9.1393, state: 'Portugal', nationality: 'pt' },
  Venezuela: { lat: 10.4806, lon: -66.9036, state: 'Venezuela', nationality: 've' },
};

const countryDialCodes: Record<string, string> = {
  Argentina: '+54',
  Armênia: '+374',
  Brasil: '+55',
  Espanha: '+34',
  França: '+33',
  Grécia: '+30',
  Holanda: '+31',
  Itália: '+39',
  Japão: '+81',
  Kosovo: '+383',
  Portugal: '+351',
  Venezuela: '+58',
};

const buildHappyEscortsSeed = (profile: HappyEscortsProfile, index: number): DemoModelSeed => {
  const coords = cityCoordinates[profile.city] || countryCoordinates[profile.country] || cityCoordinates.Roma;
  const offset = (index % 10) * 0.0035;
  const angle = (index * 53 * Math.PI) / 180;
  const services = index % 4 === 0
    ? ['vip', 'hotel', 'dinner', 'travel']
    : ['vip', 'hotel', 'dinner'];
  const dial = countryDialCodes[profile.country] || '+39';

  return {
    name: profile.name,
    age: profile.age,
    phone: `${dial} 000 000 000 ${String(index + 201).padStart(4, '0')}`,
    price: 200 + (index % 4) * 50,
    city: profile.city,
    state: coords.state,
    lat: coords.lat + Math.sin(angle) * offset,
    lon: coords.lon + Math.cos(angle) * offset,
    photos: profile.photos,
    nationality: 'nationality' in coords ? coords.nationality : countryCoordinates[profile.country]?.nationality || 'it',
    hair: index % 3 === 0 ? 'brunette' : index % 3 === 1 ? 'blonde' : 'black',
    eyes: index % 4 === 0 ? 'brown' : index % 4 === 1 ? 'green' : index % 4 === 2 ? 'blue' : 'black',
    height: (1.62 + (index % 12) * 0.01).toFixed(2),
    weight: String(50 + (index % 12)),
    feet: String(36 + (index % 5)),
    services,
    bio: `${profile.name} em ${profile.city}, perfil importado de listagem pública do HappyEscorts com fotos e URL de referência. Atendimento discreto em hotel e companhia VIP.`,
    ratingAvg: 4.5 + (index % 5) * 0.1,
    ratingCount: 30 + index * 2,
    viewsToday: 110 + index * 5,
    whatsappToday: 10 + (index % 16),
  };
};

const happyEscortsSeeds = [
  ...parseHappyEscortsMultiProfiles(),
  ...parseHappyEscortsRomaProfiles(),
].map(buildHappyEscortsSeed);

const mapOrhidiHair = (label = '') => {
  const normalized = label.toLowerCase();
  if (normalized.includes('loira')) return 'blonde';
  if (normalized.includes('preto')) return 'black';
  if (normalized.includes('ruiva')) return 'red';
  return 'brunette';
};

const mapOrhidiEyes = (label = '') => {
  const normalized = label.toLowerCase();
  if (normalized.includes('verde')) return 'green';
  if (normalized.includes('azul')) return 'blue';
  if (normalized.includes('castanho')) return 'brown';
  return 'black';
};

const mapOrhidiServices = (profile: OrhidiProfile, index: number) => {
  const labels = [...(profile.services || []), ...(profile.tags || [])].join(' ').toLowerCase();
  const services = new Set<string>(['vip', 'hotel']);
  if (labels.includes('massagem') || labels.includes('massage')) services.add('massage');
  if (labels.includes('gfe') || labels.includes('namorada')) services.add('girlfriend');
  if (labels.includes('viagem') || labels.includes('travel')) services.add('travel');
  if (labels.includes('jantar') || index % 2 === 0) services.add('dinner');
  return Array.from(services);
};

const buildOrhidiSeed = (profile: OrhidiProfile, index: number): DemoModelSeed => {
  const fallback = countryCoordinates[profile.country] || countryCoordinates.Itália;
  const coords = cityCoordinates[profile.city] || fallback;
  const offset = (index % 12) * 0.0028;
  const angle = (index * 47 * Math.PI) / 180;
  const price = profile.price && profile.price > 0 ? profile.price : 250 + (index % 4) * 50;
  const height = profile.heightCm ? (profile.heightCm / 100).toFixed(2) : (1.62 + (index % 14) * 0.01).toFixed(2);
  const dial = countryDialCodes[profile.country] || '+39';

  return {
    name: profile.name,
    age: profile.age,
    phone: `${dial} 000 000 000 ${String(index + 701).padStart(4, '0')}`,
    price,
    city: profile.city,
    state: profile.region || coords.state,
    lat: coords.lat + Math.sin(angle) * offset,
    lon: coords.lon + Math.cos(angle) * offset,
    photos: profile.photos,
    nationality: fallback.nationality,
    hair: mapOrhidiHair(profile.hairLabel),
    eyes: mapOrhidiEyes(profile.eyeLabel),
    height,
    weight: String(50 + (index % 13)),
    feet: String(36 + (index % 5)),
    services: mapOrhidiServices(profile, index),
    bio: `${profile.name} em ${profile.city}, ${profile.country}, perfil de demonstração com galeria completa importada de listagem pública do Orhidi. Dados de contato são fictícios e seguros para teste do frontend.`,
    ratingAvg: profile.rating || 4.6 + (index % 4) * 0.1,
    ratingCount: profile.commentsCount || 24 + index,
    viewsToday: 130 + index * 4,
    whatsappToday: 12 + (index % 18),
  };
};

const orhidiSeeds = [
  ...parseOrhidiSpainProfiles(),
  ...parseOrhidiItalyProfiles(),
  ...parseOrhidiMoreProfiles(),
  ...parseOrhidiMore2Profiles(),
  ...parseOrhidiMore3Profiles(),
].map(buildOrhidiSeed);

const buildModel = (seed: DemoModelSeed, index: number): ModelProfileData => {
  const idNumber = String(index + 1).padStart(2, '0');
  const now = Date.now();
  const hasEnoughPhotos = seed.photos.length > 2;
  const isDemoOnlinePreview = hasEnoughPhotos && index % 20 === 0;

  return {
    id: `demo-model-${idNumber}`,
    userId: `demo-user-${idNumber}`,
    name: seed.name,
    email: `demo.${idNumber}@puntomodel.local`,
    age: seed.age,
    phone: seed.phone,
    bio: seed.bio,
    bioTranslations: { br: seed.bio },
    bioLanguage: 'br',
    services: seed.services,
    prices: [{ label: 'oneHour', value: seed.price }],
    attributes: {
      height: seed.height,
      weight: seed.weight,
      eyes: seed.eyes,
      hair: seed.hair,
      feet: seed.feet,
      nationality: seed.nationality,
      audience: ['men'],
      profileIdentity: 'woman',
    },
    location: {
      city: seed.city,
      state: seed.state,
      lat: seed.lat,
      lon: seed.lon,
    },
    map: {
      x: seed.lon,
      y: seed.lat,
    },
    photos: seed.photos,
    avatarUrl: seed.photos[0],
    featured: hasEnoughPhotos,
    isOnline: isDemoOnlinePreview,
    onlineUntil: isDemoOnlinePreview ? now + 1000 * 60 * 60 * 6 : null,
    currency: 'EUR',
    billing: {
      status: 'active',
      paidAt: '2026-08-01T10:00:00.000Z',
      expiresAt: '2027-08-01T10:00:00.000Z',
      amount: 49,
      currency: 'EUR',
      planId: 'demo-premium',
      lastPaymentId: `demo-payment-${idNumber}`,
    },
    payments: [],
    stats: {
      views: { today: seed.viewsToday },
      whatsapp: { today: seed.whatsappToday },
      ratings: { sum: Math.round(seed.ratingAvg * seed.ratingCount), count: seed.ratingCount },
    },
    comments: [],
  };
};

export const demoModels = [...demoSeeds, ...happyEscortsSeeds, ...orhidiSeeds].map(buildModel);

const DEMO_OFFLINE_STORAGE_KEY = 'punto_demo_models_opened_offline';
const demoDisplayOrder = new Map(demoModels.map((model) => [model.id, Math.random()]));

const getOpenedOfflineDemoIds = () => {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_OFFLINE_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
};

export const markDemoModelOpenedOffline = (id: string) => {
  if (!isDemoModelId(id) || typeof window === 'undefined') return;
  const ids = getOpenedOfflineDemoIds();
  ids.add(id);
  window.localStorage.setItem(DEMO_OFFLINE_STORAGE_KEY, JSON.stringify(Array.from(ids)));
};

const applyDemoRuntimeState = (model: ModelProfileData): ModelProfileData => {
  if (!isDemoModelId(model.id) || !getOpenedOfflineDemoIds().has(model.id)) return model;
  return { ...model, isOnline: false, onlineUntil: null };
};

const getPhotoPriorityBucket = (model: ModelProfileData) => Math.floor((model.photos?.length || 0) / 4);

export const getDemoDisplayModels = (models = demoModels) => {
  return models.map(applyDemoRuntimeState).sort((a, b) => {
    const aOnline = a.isOnline === false ? 0 : 1;
    const bOnline = b.isOnline === false ? 0 : 1;
    if (aOnline !== bOnline) return bOnline - aOnline;

    const aBucket = getPhotoPriorityBucket(a);
    const bBucket = getPhotoPriorityBucket(b);
    if (aBucket !== bBucket) return bBucket - aBucket;

    const aPhotos = a.photos?.length || 0;
    const bPhotos = b.photos?.length || 0;
    if (aPhotos !== bPhotos && Math.abs(aPhotos - bPhotos) > 2) return bPhotos - aPhotos;

    return (demoDisplayOrder.get(a.id) || 0) - (demoDisplayOrder.get(b.id) || 0);
  });
};

export const isDemoModelId = (id: string) => id.startsWith('demo-model-');

export const getDemoModelById = (id: string) => {
  const model = demoModels.find((model) => model.id === id);
  return model ? applyDemoRuntimeState(model) : null;
};

export const getDemoModelMetrics = (id: string) => {
  const model = getDemoModelById(id);
  const ratings = model?.stats?.ratings;
  const ratingCount = ratings?.count || 0;

  return {
    viewsToday: model?.stats?.views?.today || 0,
    whatsappToday: model?.stats?.whatsapp?.today || 0,
    ratingAvg: ratingCount && ratings?.sum ? ratings.sum / ratingCount : 0,
    ratingCount,
    estimatedEarningsMonth: 0,
  };
};
