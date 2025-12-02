export type ApparelType = 'Cap' | 'Beanie' | 'T-Shirt' | 'Long T-Shirt' | 'Hoodie' | 'Backpack';

export interface StyleTemplate {
  id: number;
  apparelType: ApparelType;
  name: string;
  prompt: string; // Contains [USER SUBJECT HERE] placeholder
  styleTag?: string;
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  /* ----------------------------- CAP ------------------------------ */
  {
    id: 1,
    apparelType: 'Cap',
    name: 'Neon Holographic Badge',
    prompt: 'A glowing neon holographic badge design with chrome edges, electric highlights, and high contrast engineered to pop on a black cap. Sharp vector precision with a bold modern streetwear style. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 2,
    apparelType: 'Cap',
    name: 'Chrome Graffiti Emblem',
    prompt: 'A reflective chrome graffiti-style emblem with 3D drips, glossy contours, and vibrant underglow designed to stand out on a black cap. Urban energy, crisp detailing. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 3,
    apparelType: 'Cap',
    name: 'Minimal Gold Metal Crest',
    prompt: 'A premium gold-metal crest with matte-black embossing, smooth raised edges, and refined luxury styling tailored for a black cap. Elegant, clean, and iconic. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 4,
    apparelType: 'Cap',
    name: 'Psychedelic Street Patch',
    prompt: 'A bold psychedelic street patch with melting neon gradients, trippy distortions, and vibrant detail designed for perfect visibility on a black cap. Featuring: [USER SUBJECT HERE].'
  },

  /* ---------------------------- BEANIE ---------------------------- */
  {
    id: 10,
    apparelType: 'Beanie',
    name: 'Stitched Embroidered Patch',
    prompt: 'A detailed embroidered patch design with stitched textures, soft shadows, and high-contrast outlines crafted for a black beanie. Cozy fabric realism with a strong streetwear vibe. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 11,
    apparelType: 'Beanie',
    name: 'Techno Neon Thread Emblem',
    prompt: 'A neon-thread style embroidered emblem with glowing stitch effects and futuristic detailing optimized for a black beanie. Dynamic and modern. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 12,
    apparelType: 'Beanie',
    name: 'Vintage Woven Badge',
    prompt: 'A textured vintage woven badge with soft fabric grain, retro tones, and distressed stitching designed to sit naturally on a black beanie. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 13,
    apparelType: 'Beanie',
    name: 'Urban Mascot Knit Patch',
    prompt: 'A bold cartoon-style mascot patch with thick outlines, neon accents, and embroidered depth created for a black beanie. Crisp, fun, and expressive. Featuring: [USER SUBJECT HERE].'
  },

  /* ---------------------------- T-SHIRT ----------------------------- */
  {
    id: 20,
    apparelType: 'T-Shirt',
    name: 'Oversized Streetwear Graphic',
    prompt: 'A massive high-contrast streetwear front graphic printed on a black oversized t-shirt, sharp edges, clean vector energy, and bold attitude. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 21,
    apparelType: 'T-Shirt',
    name: 'Anime Glow Front Print',
    prompt: 'A glowing anime-style illustration printed large on the front of a black t-shirt, vibrant highlights, clean linework, and dramatic shading. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 22,
    apparelType: 'T-Shirt',
    name: 'Minimal Luxury Chest Logo',
    prompt: 'A sleek minimal luxury chest logo printed in matte or metallic tones on a black t-shirt, clean typography, refined spacing, premium branding style. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 23,
    apparelType: 'T-Shirt',
    name: 'Retro 90s Back Print',
    prompt: 'A bold retro 90s-inspired back graphic with chunky outlines, vibrant colors, and tape deck aesthetics printed on a black t-shirt. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 24,
    apparelType: 'T-Shirt',
    name: 'Cyber Tech Grid Design',
    prompt: 'A futuristic cyber-grid design with luminous circuitry, glitch overlays, and sharp geometry printed on a black t-shirt. Featuring: [USER SUBJECT HERE].'
  },

  /* ----------------------- LONG T-SHIRT ----------------------- */
  {
    id: 30,
    apparelType: 'Long T-Shirt',
    name: 'Sleeve Print + Chest Mark',
    prompt: 'A dual-placement design: a minimalist chest mark paired with intricate sleeve graphics running down the arms of a black long-sleeve shirt. Clean contrast and streetwear energy. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 31,
    apparelType: 'Long T-Shirt',
    name: 'Neo Tribal Arm Stripes',
    prompt: 'A symmetrical neo-tribal stripe pattern wrapping around both sleeves of a black long-sleeve shirt with crisp print clarity. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 32,
    apparelType: 'Long T-Shirt',
    name: 'Graphic Sleeve Flames',
    prompt: 'High-energy flame graphics flowing down both sleeves of a black long-sleeve tee, bold gradients, and street-speed vibes. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 33,
    apparelType: 'Long T-Shirt',
    name: 'Avant-Garde Side Print',
    prompt: 'A tall vertical avant-garde graphic printed along the side body of a black long-sleeve shirt, modern typography, sharp contrast. Featuring: [USER SUBJECT HERE].'
  },

  /* ----------------------------- HOODIE --------------------------- */
  {
    id: 40,
    apparelType: 'Hoodie',
    name: 'Large Back Print + Chest Logo',
    prompt: 'A dramatic oversized back graphic paired with a small chest logo printed on a black hoodie, deep shadows and fabric folds. Streetwear premium look. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 41,
    apparelType: 'Hoodie',
    name: 'Graffiti Drip Hoodie',
    prompt: 'A bold graffiti-style back print with dripping neon paint, chaotic energy, and high contrast on a black hoodie. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 42,
    apparelType: 'Hoodie',
    name: 'Luxury Embroidered Crest',
    prompt: 'A premium embroidered crest with metallic thread, raised stitching, and soft fabric depth printed or stitched onto a black hoodie. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 43,
    apparelType: 'Hoodie',
    name: 'Cyberpunk Glow Design',
    prompt: 'A glowing cyberpunk-inspired graphic with neon veins, glitch cuts, and luminous accents designed for a black hoodie. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 44,
    apparelType: 'Hoodie',
    name: 'Anime Street Hoodie',
    prompt: 'A bold anime-style illustration with expressive linework and high contrast printed on the front or back of a black hoodie. Featuring: [USER SUBJECT HERE].'
  },

  /* --------------------------- BACKPACK ------------------------- */
  {
    id: 50,
    apparelType: 'Backpack',
    name: 'Front Panel Badge Graphic',
    prompt: 'A sharp high-contrast badge-style graphic designed for the front panel of a black backpack, with subtle 3D structure and fabric texture. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 51,
    apparelType: 'Backpack',
    name: 'Minimal Tech Pack Logo',
    prompt: 'A refined minimal tech-style logo placed on the upper front of a black backpack, subtle matte finish, futuristic simplicity. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 52,
    apparelType: 'Backpack',
    name: 'Graffiti Panel Spray Art',
    prompt: 'A graffiti-style paint-splash panel art design covering the front surface of a black backpack with bold drips and street attitude. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 53,
    apparelType: 'Backpack',
    name: 'Adventure Patch Set',
    prompt: 'A set of adventure-style embroidered patches arranged on the front of a black backpack, textured stitches and travel aesthetic. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 54,
    apparelType: 'Backpack',
    name: 'Cyber Grid Panel',
    prompt: 'A dynamic cyber-grid pattern with luminous digital accents designed for the front panel of a black backpack, precise vector geometry. Featuring: [USER SUBJECT HERE].'
  }
];
