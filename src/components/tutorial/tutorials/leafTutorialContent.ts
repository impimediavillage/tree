// Leaf User (Shopper) Tutorial Content
// Interactive tutorials for customers shopping on The Wellness Tree

export const browseShopSteps = [
  {
    element: '[data-tour="leaf-dashboard"]',
    popover: {
      title: '🌿 Welcome to The Wellness Tree!',
      description: 'Your personal dashboard for exploring wellness products, AI advisors, and exclusive club benefits. Let\'s take a magical tour!',
      side: 'bottom' as const,
    },
    chatMessage: 'Hey there, wellness explorer! 🌟 Ready to discover how to shop, earn, and thrive with us?',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="browse-dispensaries"]',
    popover: {
      title: '🏪 Browse Dispensaries',
      description: 'Explore our curated wellness partners! Each dispensary type offers unique products - from cannabis to holistic remedies.',
      side: 'right' as const,
    },
    chatMessage: 'Find your perfect wellness match! Each dispensary specializes in different healing modalities. 🌈',
    showPointer: true,
    pointerDirection: 'left' as const,
  },
  {
    element: '[data-tour="dispensary-card"]',
    popover: {
      title: '💎 Dispensary Cards',
      description: 'Each card shows the dispensary type, description, and product count. Click to explore their full catalog!',
      side: 'top' as const,
    },
    chatMessage: 'These beautiful cards are your gateway to wellness treasures! ✨',
  },
  {
    element: '[data-tour="search-products"]',
    popover: {
      title: '🔍 Smart Search',
      description: 'Search for specific products, strains, or categories. Our AI-powered search finds exactly what you need!',
      side: 'bottom' as const,
    },
    chatMessage: 'Looking for something specific? Just type and watch the magic happen! 🎯',
  },
  {
    element: '[data-tour="product-filters"]',
    popover: {
      title: '🎨 Filter Products',
      description: 'Narrow down by category, price range, effects, or THC/CBD levels. Find your perfect match!',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="product-card"]',
    popover: {
      title: '🌟 Product Details',
      description: 'See product images, prices, effects, and ratings. Click for full details including lab results and reviews!',
      side: 'right' as const,
    },
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="add-to-cart"]',
    popover: {
      title: '🛒 Add to Cart',
      description: 'Found something you love? Add it to your cart! You can adjust quantities and continue shopping.',
      side: 'top' as const,
    },
    chatMessage: 'Cart it up! Your wellness journey is just a click away! 🎉',
  },
  {
    element: '[data-tour="influencer-products"]',
    popover: {
      title: '🌟 Influencer Recommendations',
      description: 'See products promoted by trusted influencers! They earn commissions when you buy, supporting our community.',
      side: 'bottom' as const,
    },
    chatMessage: 'Support your favorite wellness influencers while discovering amazing products! 💚',
  },
  {
    element: '[data-tour="checkout-button"]',
    popover: {
      title: '💳 Secure Checkout',
      description: 'Ready to purchase? Our checkout is fast, secure, and supports multiple payment methods!',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="track-order"]',
    popover: {
      title: '📦 Order Tracking',
      description: 'Track your orders in real-time! Get notifications at every step from confirmed to delivered.',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re now a shopping pro! Browse, buy, and enjoy your wellness journey! 🌿',
  },
];

export const aiAdvisorsSteps = [
  {
    element: '[data-tour="ai-advisors-nav"]',
    popover: {
      title: '🤖 AI Wellness Advisors',
      description: 'Meet your personal AI experts! They provide free advice on cannabis, wellness, and holistic healing.',
      side: 'bottom' as const,
    },
    chatMessage: 'Welcome to your personal AI advisory team! They\'re here 24/7 to help! 🧠',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="advisor-gallery"]',
    popover: {
      title: '🎭 Choose Your Advisor',
      description: 'Each AI has unique expertise: Cannabis Connoisseur, Holistic Healer, Cannabinoid Expert, and more!',
      side: 'top' as const,
    },
    chatMessage: 'Each advisor has a unique personality and specialization. Pick your vibe! ✨',
  },
  {
    element: '[data-tour="advisor-card"]',
    popover: {
      title: '👤 Advisor Profiles',
      description: 'See each advisor\'s specialty, personality, and expertise. Click "Chat Now" to start a conversation!',
      side: 'right' as const,
    },
    showPointer: true,
    pointerDirection: 'left' as const,
  },
  {
    element: '[data-tour="start-chat"]',
    popover: {
      title: '💬 Start Chatting',
      description: 'Click to begin your conversation! Ask about strains, effects, dosing, or wellness tips.',
      side: 'bottom' as const,
    },
    chatMessage: 'They\'re waiting to answer ALL your questions! No judgment, just wisdom. 🌟',
  },
  {
    element: '[data-tour="chat-interface"]',
    popover: {
      title: '🗨️ Chat Interface',
      description: 'Type your questions naturally! The AI understands context and provides personalized recommendations.',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="credits-balance"]',
    popover: {
      title: '💎 Your Credits',
      description: 'AI chats use credits. You get 100 FREE credits to start! Earn more by shopping and engaging.',
      side: 'right' as const,
    },
    chatMessage: '💡 Pro tip: Each message costs 1 credit, but responses are priceless! Get more by shopping! 🛒',
  },
  {
    element: '[data-tour="conversation-history"]',
    popover: {
      title: '📚 Conversation History',
      description: 'All your chats are saved! Review past advice anytime in your Interaction History.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="advisor-suggestions"]',
    popover: {
      title: '🎯 Smart Suggestions',
      description: 'The AI suggests related products based on your conversation! Direct links to shop.',
      side: 'bottom' as const,
    },
    chatMessage: 'The AI learns what you like and recommends perfect products! 🎁',
  },
  {
    element: '[data-tour="share-advice"]',
    popover: {
      title: '📤 Share Wisdom',
      description: 'Got great advice? Share conversations with friends or save them for later!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="earn-credits"]',
    popover: {
      title: '⭐ Earn More Credits',
      description: 'Buy products, leave reviews, and engage to earn credits! Never run out of AI wisdom.',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re now an AI Advisor expert! Chat away and discover your wellness path! 🌈',
  },
];

export const creatorLabSteps = [
  {
    element: '[data-tour="creator-lab-nav"]',
    popover: {
      title: '🎨 The Creator Lab',
      description: 'Design your own custom apparel! Create caps, beanies, hoodies, and tees with cannabis-inspired art.',
      side: 'bottom' as const,
    },
    chatMessage: 'Welcome to your personal design studio! Let\'s create wearable art! 🖌️',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="apparel-types"]',
    popover: {
      title: '👕 Choose Apparel Type',
      description: 'Pick from caps, beanies, hoodies, or t-shirts. Each has customizable options!',
      side: 'right' as const,
    },
    chatMessage: 'What\'s your style? Cap for sunny days? Hoodie for cozy vibes? 🧢',
  },
  {
    element: '[data-tour="design-gallery"]',
    popover: {
      title: '🖼️ Design Templates',
      description: 'Browse pre-made designs or start from scratch! We have cannabis art, wellness themes, and abstract patterns.',
      side: 'top' as const,
    },
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="customize-design"]',
    popover: {
      title: '✏️ Customization Tools',
      description: 'Add text, change colors, upload your art, or use our AI to generate unique designs!',
      side: 'left' as const,
    },
    chatMessage: 'This is where the magic happens! Design something that screams YOU! ✨',
  },
  {
    element: '[data-tour="ai-generator"]',
    popover: {
      title: '🤖 AI Design Generator',
      description: 'Describe your vision and watch AI create it! "Cannabis leaf sunset vibes" → instant artwork!',
      side: 'bottom' as const,
    },
    chatMessage: 'Our AI artist is incredible! Just describe your dream design! 🎨',
  },
  {
    element: '[data-tour="color-picker"]',
    popover: {
      title: '🎨 Color Customization',
      description: 'Choose from 50+ colors for apparel and 100+ colors for designs. Match your vibe perfectly!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="preview-3d"]',
    popover: {
      title: '👀 3D Preview',
      description: 'See your design on the actual product! Rotate 360° to preview every angle.',
      side: 'top' as const,
    },
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="size-selector"]',
    popover: {
      title: '📏 Size & Fit',
      description: 'Choose your size with our detailed size chart. All apparel is premium quality!',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="save-design"]',
    popover: {
      title: '💾 Save Your Designs',
      description: 'Not ready to buy? Save designs to your account and come back anytime!',
      side: 'left' as const,
    },
    chatMessage: 'Save your masterpieces! Build a collection of designs to choose from. 🗂️',
  },
  {
    element: '[data-tour="order-apparel"]',
    popover: {
      title: '🛍️ Order Your Creation',
      description: 'Add to cart and order! Your custom apparel is printed and shipped within 3-5 days.',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re now a Creator Lab master! Design, customize, and wear your art with pride! 👕',
  },
];

export const ordersTrackingSteps = [
  {
    element: '[data-tour="orders-nav"]',
    popover: {
      title: '📦 My Orders',
      description: 'Track all your purchases in one place! See order status, tracking info, and delivery updates.',
      side: 'bottom' as const,
    },
    chatMessage: 'Your order command center! Let\'s see what\'s cooking! 📮',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="order-filters"]',
    popover: {
      title: '🔍 Filter Orders',
      description: 'View by status: Active, Delivered, Cancelled. Or search by order number or date.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="order-card"]',
    popover: {
      title: '📋 Order Details',
      description: 'Each card shows: Order number, date, items, total, and current status with progress bar!',
      side: 'left' as const,
    },
    showPointer: true,
    pointerDirection: 'right' as const,
  },
  {
    element: '[data-tour="order-status"]',
    popover: {
      title: '🚦 Status Tracking',
      description: 'Watch your order progress: Confirmed → Preparing → Shipped → Out for Delivery → Delivered!',
      side: 'top' as const,
    },
    chatMessage: 'Real-time tracking keeps you in the loop every step of the way! 🔔',
  },
  {
    element: '[data-tour="tracking-number"]',
    popover: {
      title: '🚚 Courier Tracking',
      description: 'Click the tracking number to see live location updates from The Courier Guy!',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="estimated-delivery"]',
    popover: {
      title: '⏰ Delivery Estimate',
      description: 'See when your order is expected to arrive. Most orders deliver within 2-5 business days!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="order-items"]',
    popover: {
      title: '📦 Order Items',
      description: 'Review everything in your order: product names, quantities, and prices.',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="reorder-button"]',
    popover: {
      title: '🔄 Quick Reorder',
      description: 'Love what you got? Click "Reorder" to instantly add the same items to your cart!',
      side: 'top' as const,
    },
    chatMessage: 'Found your favorites? Reorder with one click! So convenient! 🎯',
  },
  {
    element: '[data-tour="review-order"]',
    popover: {
      title: '⭐ Leave a Review',
      description: 'Once delivered, share your experience! Rate products and dispensaries to help others.',
      side: 'bottom' as const,
    },
    chatMessage: 'Your reviews help the community and earn you credits! Win-win! 💎',
  },
  {
    element: '[data-tour="contact-support"]',
    popover: {
      title: '💬 Need Help?',
      description: 'Issues with your order? Contact support or message the dispensary directly!',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re an order tracking expert! Stay informed and shop with confidence! 📦',
  },
];

export const tripleSClubSteps = [
  {
    element: '[data-tour="triple-s-nav"]',
    popover: {
      title: '👑 Triple S Club',
      description: 'Your exclusive membership hub! Access premium benefits, events, and community perks.',
      side: 'bottom' as const,
    },
    chatMessage: 'Welcome to the VIP lounge! Let me show you all the exclusive benefits! ✨',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="membership-tier"]',
    popover: {
      title: '🏆 Your Membership Tier',
      description: 'Members are ranked: Silver → Gold → Platinum → Diamond. Higher tiers unlock more perks!',
      side: 'right' as const,
    },
    chatMessage: 'Level up by shopping, engaging, and referring friends! 📈',
  },
  {
    element: '[data-tour="club-benefits"]',
    popover: {
      title: '🎁 Member Benefits',
      description: 'Get exclusive discounts, early access to products, bonus credits, and special event invites!',
      side: 'top' as const,
    },
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="monthly-credits"]',
    popover: {
      title: '💎 Monthly Credits',
      description: 'Club members get FREE credits every month! Higher tiers get more. Use them for AI chats!',
      side: 'left' as const,
    },
    chatMessage: 'Free credits just for being awesome! That\'s the club life! 🌟',
  },
  {
    element: '[data-tour="exclusive-products"]',
    popover: {
      title: '🌟 Members-Only Products',
      description: 'Some products are exclusive to club members! Limited editions, premium strains, and special collabs.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="events-calendar"]',
    popover: {
      title: '📅 Community Events',
      description: 'Members get access to virtual sessions, workshops, and meetups with experts!',
      side: 'right' as const,
    },
    chatMessage: 'Connect with fellow wellness enthusiasts at amazing events! 🎉',
  },
  {
    element: '[data-tour="tier-progress"]',
    popover: {
      title: '📊 Progress to Next Tier',
      description: 'See how close you are to leveling up! Earn points by shopping, reviewing, and referring.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="referral-rewards"]',
    popover: {
      title: '🤝 Referral Program',
      description: 'Invite friends to join! You BOTH get rewards: bonus credits, discounts, and tier points.',
      side: 'bottom' as const,
    },
    chatMessage: 'Share the love! Your friends will thank you, and you\'ll earn awesome rewards! 💚',
  },
  {
    element: '[data-tour="club-store"]',
    popover: {
      title: '🛍️ Club Exclusive Store',
      description: 'Shop members-only merch, limited drops, and collaborative products!',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="community-feed"]',
    popover: {
      title: '🌍 Member Community',
      description: 'Connect with other members! Share experiences, tips, and celebrate the wellness journey together.',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re now a Triple S Club pro! Enjoy your perks and keep climbing those tiers! 👑',
  },
];

// Export all Leaf user tutorials
export const leafTutorialContent = {
  'browse-shop': browseShopSteps,
  'ai-advisors': aiAdvisorsSteps,
  'creator-lab': creatorLabSteps,
  'orders-tracking': ordersTrackingSteps,
  'triple-s-club': tripleSClubSteps,
};
