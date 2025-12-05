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
    prompt: 'A glowing neon holographic design with chrome edges, electric highlights, and high contrast. Sharp vector precision with a bold modern streetwear style. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 2,
    apparelType: 'Cap',
    name: 'Chrome Graffiti Emblem',
    prompt: 'A reflective chrome graffiti-style design with 3D drips, glossy contours, and vibrant underglow. Urban energy, crisp detailing. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 3,
    apparelType: 'Cap',
    name: 'Minimal Gold Metal Crest',
    prompt: 'A premium gold-metal crest with matte-black embossing, smooth raised edges, and refined luxury styling. Elegant, clean, and iconic. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 4,
    apparelType: 'Cap',
    name: 'Psychedelic Street Patch',
    prompt: 'A bold psychedelic design with melting neon gradients, trippy distortions, and vibrant detail. Featuring: [USER SUBJECT HERE].'
  },

  /* ---------------------------- BEANIE ---------------------------- */
  {
    id: 10,
    apparelType: 'Beanie',
    name: 'Stitched Embroidered Patch',
    prompt: 'A detailed embroidered patch design with stitched textures, soft shadows, and high-contrast outlines. Cozy fabric realism with a strong streetwear vibe. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 11,
    apparelType: 'Beanie',
    name: 'Techno Neon Thread Emblem',
    prompt: 'A neon-thread style embroidered design with glowing stitch effects and futuristic detailing. Dynamic and modern. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 12,
    apparelType: 'Beanie',
    name: 'Vintage Woven Badge',
    prompt: 'A textured vintage woven badge with soft fabric grain, retro tones, and distressed stitching. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 13,
    apparelType: 'Beanie',
    name: 'Urban Mascot Knit Patch',
    prompt: 'A bold cartoon-style mascot design with thick outlines, neon accents, and embroidered depth. Crisp, fun, and expressive. Featuring: [USER SUBJECT HERE].'
  },

  /* ---------------------------- T-SHIRT ----------------------------- */
  {
    id: 20,
    apparelType: 'T-Shirt',
    name: 'Oversized Streetwear Graphic',
    prompt: 'A massive high-contrast streetwear graphic with sharp edges, clean vector energy, and bold attitude. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 21,
    apparelType: 'T-Shirt',
    name: 'Anime Glow Front Print',
    prompt: 'A glowing anime-style illustration with vibrant highlights, clean linework, and dramatic shading. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 22,
    apparelType: 'T-Shirt',
    name: 'Minimal Luxury Chest Logo',
    prompt: 'A sleek minimal luxury logo in matte or metallic tones, clean typography, refined spacing, premium branding style. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 23,
    apparelType: 'T-Shirt',
    name: 'Retro 90s Back Print',
    prompt: 'A bold retro 90s-inspired graphic with chunky outlines, vibrant colors, and tape deck aesthetics. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 24,
    apparelType: 'T-Shirt',
    name: 'Cyber Tech Grid Design',
    prompt: 'A futuristic cyber-grid design with luminous circuitry, glitch overlays, and sharp geometry. Featuring: [USER SUBJECT HERE].'
  },

  /* ----------------------- LONG T-SHIRT ----------------------- */
  {
    id: 30,
    apparelType: 'Long T-Shirt',
    name: 'Sleeve Print + Chest Mark',
    prompt: 'A minimalist design paired with intricate graphics. Clean contrast and streetwear energy. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 31,
    apparelType: 'Long T-Shirt',
    name: 'Neo Tribal Arm Stripes',
    prompt: 'A symmetrical neo-tribal stripe pattern with crisp print clarity. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 32,
    apparelType: 'Long T-Shirt',
    name: 'Graphic Sleeve Flames',
    prompt: 'High-energy flame graphics with bold gradients and street-speed vibes. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 33,
    apparelType: 'Long T-Shirt',
    name: 'Avant-Garde Side Print',
    prompt: 'A tall vertical avant-garde graphic with modern typography and sharp contrast. Featuring: [USER SUBJECT HERE].'
  },

  /* ----------------------------- HOODIE --------------------------- */
  {
    id: 40,
    apparelType: 'Hoodie',
    name: 'Large Back Print + Chest Logo',
    prompt: 'A dramatic oversized graphic with deep shadows and streetwear premium look. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 41,
    apparelType: 'Hoodie',
    name: 'Graffiti Drip Hoodie',
    prompt: 'A bold graffiti-style design with dripping neon paint, chaotic energy, and high contrast. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 42,
    apparelType: 'Hoodie',
    name: 'Luxury Embroidered Crest',
    prompt: 'A premium embroidered crest with metallic thread, raised stitching, and soft fabric depth. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 43,
    apparelType: 'Hoodie',
    name: 'Cyberpunk Glow Design',
    prompt: 'A glowing cyberpunk-inspired graphic with neon veins, glitch cuts, and luminous accents. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 44,
    apparelType: 'Hoodie',
    name: 'Anime Street Hoodie',
    prompt: 'A bold anime-style illustration with expressive linework and high contrast. Featuring: [USER SUBJECT HERE].'
  },

  /* --------------------------- BACKPACK ------------------------- */
  {
    id: 50,
    apparelType: 'Backpack',
    name: 'Front Panel Badge Graphic',
    prompt: 'A sharp high-contrast badge-style graphic with subtle 3D structure and fabric texture. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 51,
    apparelType: 'Backpack',
    name: 'Minimal Tech Pack Logo',
    prompt: 'A refined minimal tech-style logo with subtle matte finish and futuristic simplicity. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 52,
    apparelType: 'Backpack',
    name: 'Graffiti Panel Spray Art',
    prompt: 'A graffiti-style paint-splash design with bold drips and street attitude. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 53,
    apparelType: 'Backpack',
    name: 'Adventure Patch Set',
    prompt: 'A set of adventure-style embroidered patches with textured stitches and travel aesthetic. Featuring: [USER SUBJECT HERE].'
  },
  {
    id: 54,
    apparelType: 'Backpack',
    name: 'Cyber Grid Panel',
    prompt: 'A dynamic cyber-grid pattern with luminous digital accents and precise vector geometry. Featuring: [USER SUBJECT HERE].'
  }
];
