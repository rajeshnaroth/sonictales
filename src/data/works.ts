/**
 * Works data management file for SonicTales Productions
 *
 * To add new works:
 * 1. Add a new object to the array below
 * 2. Fill in the required information
 * 3. Use Unsplash URLs for thumbnail images
 * 4. Set video URL to actual YouTube Shorts or other video platform URLs
 *
 * Current playlist: https://www.youtube.com/playlist?list=PLMoRXD9aFQeoWJ5Ad8ZPeHPP1LEfuqMPl
 * To get individual video URLs, replace the playlist URL with specific video URLs like:
 * https://youtube.com/shorts/[VIDEO_ID] or https://www.youtube.com/watch?v=[VIDEO_ID]
 */

export interface Work {
  id: string; // Unique ID (e.g., '1', '2', '3'...)
  title: string; // Work title
  category: "MV" | "Commercial" | "Short Film" | "Documentary"; // Category
  year: number; // Production year
  client?: string; // Client name (for commercial works)
  artist?: string; // Artist name (for music videos)
  duration: string; // Video duration (e.g., '3:45')
  thumbnail: string; // Thumbnail image URL
  videoUrl: string; // Video file URL
  description: string; // Work description
  credits: {
    // Credits information
    director: string;
    editor: string;
    cinematographer?: string;
    cast?: string;
    producer?: string;
  };
}

export const works: Work[] = [
  // Sorted by publishing date (oldest to newest)
  {
    id: "1",
    title: "Flame",
    category: "Short Film",
    year: 2013,
    duration: "15:00",
    thumbnail: "https://i.ytimg.com/vi/AejUBPX2Qe0/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=AejUBPX2Qe0",
    description:
      "Love calls. Will you answer? Former lovers Rameez and Soni meet after several years. As they struggle to reconnect, old flames are rekindled. Official Selections: Melbourne Independent Film Festival, Portobello Film Festival, Walnutcreek Short Film Festival (2013).",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Unni Raveendranathen",
      cast: "Rameez, Soni"
    }
  },
  {
    id: "2",
    title: "Click",
    category: "Short Film",
    year: 2014,
    duration: "4:30",
    thumbnail: "https://i.ytimg.com/vi/gGYXSRD56wE/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=gGYXSRD56wE",
    description:
      "A young boy longs for his father's love but the father is drowned in the worries of life. A touching story about family connections and the importance of being present. Shot with BMCC and edited with Adobe CC, Resolve, and Pro Tools.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Rajesh Naroth",
      cast: "Raymond Duval, Quinn Saunders"
    }
  },
  {
    id: "3",
    title: "Mom for Sale. Mint condition.",
    category: "Short Film",
    year: 2015,
    duration: "12:00",
    thumbnail: "https://i.ytimg.com/vi/TFHafo91dJg/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=TFHafo91dJg",
    description:
      "Jacob needs a mom. There is one available on Craig's list. It wasn't as easy as he thought. A heartwarming comedy-drama about family, connection, and the unexpected places we find love.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Austin Smagalski",
      cinematographer: "Darren Rae",
      cast: "Weston Lee Ball, Joe May, Vicki Kagawan Zabarte, Christine Jovan, Rocker D'Antonio"
    }
  },
  {
    id: "4",
    title: "Heat Wave",
    category: "Short Film",
    year: 2015,
    duration: "8:00",
    thumbnail: "https://i.ytimg.com/vi/ul9m4oZkeU4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=ul9m4oZkeU4",
    description:
      "Sally is having a bad day. She had no idea how worse it was going to get. A powerful PSA about heatstroke prevention and child safety, featuring compelling performances and important social messaging.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Unni Raveendranathen",
      cast: "Emily Marie Grant"
    }
  },
  {
    id: "5",
    title: "Status Change",
    category: "Short Film",
    year: 2015,
    duration: "1:00",
    thumbnail: "https://i.ytimg.com/vi/XfSdf_nV77o/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=XfSdf_nV77o",
    description:
      "A powerful one-minute short film that follows Vanessa Becker as she makes an important status update. Winner of 10 Official Selections and 2 Awards, this film explores themes of domestic abuse and personal transformation through social media.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Unni Raveendranathen",
      cast: "Vanessa Becker"
    }
  },
  {
    id: "6",
    title: "Max",
    category: "Short Film",
    year: 2016,
    duration: "6:00",
    thumbnail: "https://i.ytimg.com/vi/7oJUOsgoplQ/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=7oJUOsgoplQ",
    description:
      "Some decisions are tough. A challenging day in the life of Ms. Davis. This 6-minute drama has been a film festival favorite in the 2015 circuit, racking up over 56 official selections and 7 awards. A deeply moving story about difficult choices and saying goodbye.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Darren Rae",
      cast: "Ms. Davis"
    }
  },
  {
    id: "7",
    title: "Canopy",
    category: "Short Film",
    year: 2016,
    duration: "8:00",
    thumbnail: "https://i.ytimg.com/vi/SGcCGwPcmuc/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=SGcCGwPcmuc",
    description:
      "Sheela's son is missing. She copes by helping to find other missing children. Filmed in San Jose and Half Moon Bay locations in Northern California, this emotionally powerful short film explores themes of loss, hope, and healing through community service.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Rajesh Naroth",
      cast: "Sheela"
    }
  },
  {
    id: "8",
    title: "Baby Monitor",
    category: "Short Film",
    year: 2016,
    duration: "5:30",
    thumbnail: "https://i.ytimg.com/vi/AkWAFrHTbk0/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=AkWAFrHTbk0",
    description:
      "Your baby is safe. Are you? A spine-chilling horror short that explores modern parenting anxieties through the lens of technology. Based on an idea from Reddit, this Halloween 2016 release masterfully builds tension and delivers genuine scares.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Austin Smagalski",
      cinematographer: "Darren Rae",
      cast: "Christine Jovan, Rocker D'Antonio, Brian James, Isabella Antonia"
    }
  },
  {
    id: "9",
    title: "Tether",
    category: "Short Film",
    year: 2025,
    duration: "22:00",
    thumbnail: "https://i.ytimg.com/vi/Idt0KF33zYQ/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=Idt0KF33zYQ",
    description:
      "Sometimes, love means wishing for the end. Daya sacrifices her career to care for her ailing mother, uncovering long-buried truths and unspoken love as she navigates the fragile line between life, loss, and reconciliation. Features music by Rabindranath Tagore.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Manoj Jayadevan",
      cast: "Soma Mitra, Rina Banerjee, Dennis Parecadan, Rianna Danish"
    }
  },
  {
    id: "10",
    title: "3 Ghost Stories",
    category: "Short Film",
    year: 2025,
    duration: "10:00",
    thumbnail: "https://i.ytimg.com/vi/o1t4GfQj2CM/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=o1t4GfQj2CM",
    description: "Three chilling tales of the supernatural that will keep you on the edge of your seat. A collection of ghost stories that explore the thin veil between the living and the dead.",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "Rajesh Naroth",
      cast: "TBD"
    }
  }

  /*
  // To add new works, copy and use the following template:
  
  {
    id: '7',                     // Change to next number
    title: 'Work Title',         // Work name
    category: 'Short Film',      // Choose from 'MV', 'Commercial', 'Short Film', 'Documentary'
    year: 2024,                  // Production year
    artist: 'Artist Name',       // For music videos only
    client: 'Client Name',       // For commercial works only
    duration: '3:45',            // Video duration (YouTube Shorts are typically under 60 seconds, but can be longer)
    thumbnail: 'https://images.unsplash.com/photo-xxxxxxxxx',  // Unsplash image URL
    videoUrl: 'https://youtube.com/shorts/[VIDEO_ID]',         // YouTube Shorts URL or regular YouTube video URL
    description: 'Description of the work goes here.',
    credits: {
      director: 'Director Name',
      editor: 'Editor Name',
      cinematographer: 'Cinematographer Name (optional)',
      producer: 'SonicTales Productions'
    }
  }
  */
];

/**
 * Function to return works sorted by year (newest first)
 */
export const getWorksSortedByYear = () => {
  return [...works].sort((a, b) => b.year - a.year);
};

/**
 * Function to get works by category
 */
export const getWorksByCategory = (category: Work["category"]) => {
  return works.filter((work) => work.category === category);
};
