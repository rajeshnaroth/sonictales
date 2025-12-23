export interface Product {
  id: string
  title: string
  description: string
  rating: number
  rating_count: number | null
  price: number
  currency: string
  availability: string
  thumbnail: string
  url: string
  youtube_embed?: string
  youtube_link?: string
  other_metadata: {
    free: boolean
  }
  file_size?: string
  file_type?: string
}

export const products: Product[] = [
  {
    id: '1',
    title: "Dune - Ripples in the Sand - Free U-he Dark ZebraHZ presets",
    description: "80 Free Dark ZebraHZ (version 2.9) presets created during an attempt to reproduce Hans Zimmer's soundtrack \"Ripples In the Sand\" from the film Dune (2021) -- using just the ZebraHZ Synth. Please note that they are quite staged, while some are quite playable, others are just for effect. No channel EQ were added while mixing this track. What you hear is what you get in the presets. Enjoy!",
    rating: 5.0,
    rating_count: 21,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/1modrlkv0wi9p158nxrhl0359lhj",
    url: "https://sonictales.gumroad.com/l/duneripples",
    youtube_embed: "https://www.youtube.com/embed/ltnkd9ndSrs?feature=oembed&showinfo=0&controls=0&rel=0&enablejsapi=1",
    youtube_link: "https://www.youtube.com/watch?v=ltnkd9ndSrs",
    other_metadata: {
      free: true
    },
    file_size: "828KB"
  },
  {
    id: '2',
    title: "Dune - Paul's Dream - Free U-he Dark Zebra presets",
    description: "80 Free Dark Zebra (version 2.9) presets created during an attempt to reproduce Hans Zimmer's soundtrack \"Paul's Dream\" from the film Dune (2021) -- using just the Dark Zebra Synth. Please note that they are quite staged, while some are quite playable, others are just for effect. Enjoy! A new collection of sounds based on \"Ripples in the Sand\" is also available: https://sonictales.gumroad.com/l/duneripples",
    rating: 5.0,
    rating_count: 34,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/nudn0w2m7rp3fmkaiard16dtw6m8",
    url: "https://sonictales.gumroad.com/l/Vnwfd",
    youtube_embed: "https://www.youtube.com/embed/s0aX09DHDqU",
    youtube_link: "https://www.youtube.com/watch?v=s0aX09DHDqU",
    other_metadata: {
      free: true
    },
    file_size: "807 KB"
  },
  {
    id: '3',
    title: "Almost Acoustic - Free Presets for u-he Zebra 2.8",
    description: "Presets for Zebra 2.8. These are approximate physical models of a few acoustic instruments, no samples, just pure synth. You'll get a zip file of over 20+ zebra 2.8 presets. Unzip and copy these to your Zebra preset folder. List of Sounds: Accordion, Bagpipes, Bowls, Chimes, Dulcimer, E Piano Warm, Flute, Grouchy Harmonica, Gypsy Accordion, Harmonium, Lost Harmonica, Reed, Spitty Brass, Thamburu, This is the way, Tin Whistle, Whistle, Zebraswaram, Jaw harp playable.",
    rating: 4.9,
    rating_count: 12,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/l7ref0npytxiabtq3f3x70v4t8kb",
    url: "https://sonictales.gumroad.com/l/almost-acoustic",
    youtube_embed: "https://www.youtube.com/embed/5y4gok6ylws",
    youtube_link: "https://www.youtube.com/watch?v=5y4gok6ylws",
    other_metadata: {
      free: true
    },
    file_size: "281 KB",
    file_type: "zip"
  },
  {
    id: '4',
    title: "Mombasa from Inception - Free U-he ZebraHZ presets",
    description: "36 Free Dark ZebraHZ (version 2.9) presets created during an attempt to reproduce Hans Zimmer's Mombasa soundtrack from Inception-- using just the ZebraHZ Synth. No channel EQ were added while mixing this track. What you hear is what you get in the presets. Enjoy!",
    rating: 4.9,
    rating_count: 8,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/74go9op64u969s96lkg6ztosz2xx",
    url: "https://sonictales.gumroad.com/l/mombasa",
    youtube_embed: "https://www.youtube.com/embed/jgSUX-MXkfA?feature=oembed&showinfo=0&controls=0&rel=0&enablejsapi=1",
    youtube_link: "https://www.youtube.com/watch?v=jgSUX-MXkfA",
    other_metadata: {
      free: true
    },
    file_size: "347 KB"
  },
  {
    id: '5',
    title: "Bladerunner 2049 - Free U-he ZebraHZ presets",
    description: "30 Free Dark ZebraHZ (version 2.9) presets created during an attempt to reproduce Hans Zimmer's Bladerunner soundtrack \"2049\" -- using just the ZebraHZ Synth. Please note that they are quite staged, while some are quite playable, others are just for effect. No channel EQ were added while mixing this track. What you hear is what you get in the presets. Enjoy!",
    rating: 5.0,
    rating_count: 5,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/70s06kzpsv9hwt1akaf56vv3wg96",
    url: "https://sonictales.gumroad.com/l/bladerunner",
    youtube_embed: "https://www.youtube.com/embed/wL4CndW3v0w",
    youtube_link: "https://www.youtube.com/watch?v=wL4CndW3v0w",
    other_metadata: {
      free: true
    },
    file_size: "295 KB"
  },
  {
    id: '6',
    title: "Celluloid: Sound Effects - Free Presets for u-he Zebra 2.8",
    description: "Presets for Zebra 2.8. These are random collections of sounds designed in u-he Zebra that can be used to spice up film backgrounds. Check out other free presets for Zebra and ZebraHZ here: sonictales.gumroad.com You'll get a zip file of about 40 zebra 2.8 presets. Unzip and copy these to your Zebra preset folder.",
    rating: 4.8,
    rating_count: 8,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/yhmdypb6nd6643kxok08zucx41y1",
    url: "https://sonictales.gumroad.com/l/celluloid-se",
    youtube_embed: "https://www.youtube.com/embed/RNL0Hr1h7Qc",
    youtube_link: "https://www.youtube.com/watch?v=RNL0Hr1h7Qc",
    other_metadata: {
      free: true
    },
    file_size: "364KB",
    file_type: "zip"
  },
  {
    id: '7',
    title: "Inspired by Stranger Things Theme - Free U-he Zebra 2 presets",
    description: "35+ Free Zebra (version 2.9) presets created during an attempt to reproduce the hypnotic title track from Stranger Things by Kyle Dixon and Michael Stein. No channel EQs were used during mixing, what you hear is what is in the patches.",
    rating: 4.8,
    rating_count: 4,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/94xnk509lui5nickdfp7a0yf5i0i",
    url: "https://sonictales.gumroad.com/l/strangerthings",
    youtube_embed: "https://www.youtube.com/embed/_KnyUHcLdpU?feature=oembed&showinfo=0&controls=0&rel=0&enablejsapi=1",
    youtube_link: "https://www.youtube.com/watch?v=_KnyUHcLdpU",
    other_metadata: {
      free: true
    },
    file_size: "313 KB"
  },
  {
    id: '8',
    title: "Free u-he Zebrify effect presets",
    description: "A nifty collection of 35+ effect presets for Zebrify, which comes free with u-he Zebra.",
    rating: 5.0,
    rating_count: 1,
    price: 0,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/6wdle1z4kgsrn4bnwnjak8qw78ut",
    url: "https://sonictales.gumroad.com/l/zebrify1",
    youtube_embed: "https://www.youtube.com/embed/5y4gok6ylws",
    youtube_link: "https://www.youtube.com/watch?v=5y4gok6ylws",
    other_metadata: {
      free: true
    },
    file_size: "214 KB"
  },
  {
    id: '9',
    title: "Spike Sound Set for u-he Zebra HZ Synth",
    description: "Get ready to elevate your cinematic productions with \"Spike,\" a powerhouse collection of over 140 meticulously crafted patches for the Zebra HZ synthesizer by u-he. Perfect for amping up trailers, action scenes, and any project that demands bold, adrenaline-pumping soundscapes.",
    rating: 5.0,
    rating_count: null,
    price: 12,
    currency: "USD",
    availability: "InStock",
    thumbnail: "https://public-files.gumroad.com/sc0ccao47639j744u06ymt7yfxj9",
    url: "https://sonictales.gumroad.com/l/spike",
    youtube_embed: "https://www.youtube.com/embed/kVaRPXpT7Fo?feature=oembed&showinfo=0&controls=0&rel=0&enablejsapi=1",
    youtube_link: "https://www.youtube.com/watch?v=kVaRPXpT7Fo",
    other_metadata: {
      free: false
    }
  }
]