// Product Management Tutorial
export const productManagementSteps = [
  {
    element: '[data-tour="products-nav"]',
    popover: {
      title: '🎯 Welcome to Product Management!',
      description: 'This is your product control center. Here you can add, edit, and manage all your amazing products. Let\'s explore together!',
      side: 'bottom' as const,
    },
    chatMessage: 'Hey there! 👋 Ready to become a product management pro? Let\'s dive in!',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="add-product-btn"]',
    popover: {
      title: '➕ Add New Products',
      description: 'Click this button to add new products to your catalog. You can add cannabis, CBD, accessories, and more!',
      side: 'left' as const,
    },
    chatMessage: 'This magic button is where all new products begin their journey! ✨',
  },
  {
    element: '[data-tour="product-filters"]',
    popover: {
      title: '🔍 Filter & Search',
      description: 'Use these filters to quickly find products by category, status, or price range. Super handy when you have lots of products!',
      side: 'bottom' as const,
    },
    chatMessage: 'With hundreds of products, filters are your best friend! 🎯',
  },
  {
    element: '[data-tour="product-list"]',
    popover: {
      title: '📦 Your Product Catalog',
      description: 'All your products appear here. You can see stock levels, prices, and quickly edit or delete items.',
      side: 'top' as const,
    },
    chatMessage: 'This is your product showcase! Each card is packed with quick actions. 💎',
  },
  {
    element: '[data-tour="product-card"]',
    popover: {
      title: '📝 Product Cards',
      description: 'Each card shows: product image, name, price, stock status, and quick action buttons (Edit, Duplicate, Delete).',
      side: 'right' as const,
    },
    showPointer: true,
    pointerDirection: 'left' as const,
  },
  {
    element: '[data-tour="stock-indicator"]',
    popover: {
      title: '📊 Stock Management',
      description: 'Keep track of inventory in real-time. Red = Low Stock (⚠️), Green = In Stock (✅), Gray = Out of Stock (❌)',
      side: 'bottom' as const,
    },
    chatMessage: 'Never run out of stock unexpectedly! The system warns you automatically. 🔔',
  },
  {
    element: '[data-tour="bulk-actions"]',
    popover: {
      title: '⚡ Bulk Actions',
      description: 'Select multiple products to perform batch operations: Update prices, change status, or delete multiple items at once!',
      side: 'top' as const,
    },
    chatMessage: 'Pro tip: Bulk actions save TONS of time! Select, click, done! 🚀',
  },
  {
    element: '[data-tour="product-categories"]',
    popover: {
      title: '🗂️ Categories',
      description: 'Organize products by category: Cannabis, CBD, Edibles, Accessories, etc. Makes browsing easier for customers!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="pricing-tools"]',
    popover: {
      title: '💰 Pricing Tools',
      description: 'Set base prices, discount prices, and bulk pricing tiers. The platform automatically calculates your 75% payout (25% goes to platform).',
      side: 'left' as const,
    },
    chatMessage: 'Remember: You keep 75% of the sale price. Plus, influencer bonuses come from YOUR payout! 📊',
  },
  {
    element: '[data-tour="product-analytics"]',
    popover: {
      title: '📈 Product Performance',
      description: 'See which products are selling best, which need promotion, and track revenue per product!',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 Congrats! You\'re now a Product Management Master! Keep optimizing your catalog for success! 🏆',
  },
];

// Order Management Tutorial
export const orderManagementSteps = [
  {
    element: '[data-tour="orders-nav"]',
    popover: {
      title: '📋 Order Management Hub',
      description: 'Welcome to your order command center! Here you process orders, manage fulfillment, and keep customers happy.',
      side: 'bottom' as const,
    },
    chatMessage: 'Orders are the lifeblood of your business. Let\'s master order management! 💪',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="order-tabs"]',
    popover: {
      title: '🎯 Order Status Tabs',
      description: 'Orders are organized by status: Pending → Confirmed → Preparing → Shipped → Delivered. Click each tab to see orders in that stage.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="order-card"]',
    popover: {
      title: '📦 Order Card',
      description: 'Each order shows: Customer name, order number, items, total amount, and current status. Click to see full details!',
      side: 'right' as const,
    },
    showPointer: true,
    pointerDirection: 'left' as const,
  },
  {
    element: '[data-tour="order-actions"]',
    popover: {
      title: '⚡ Quick Actions',
      description: 'Process orders fast with one-click actions: Confirm order, Start preparing, Mark as shipped, Contact customer.',
      side: 'left' as const,
    },
    chatMessage: 'Speed is key! Customers love fast processing. Use these quick actions to stay efficient! ⚡',
  },
  {
    element: '[data-tour="order-details"]',
    popover: {
      title: '🔍 Order Details',
      description: 'See complete order info: Items ordered, quantities, prices, customer address, payment status, and delivery method.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="customer-info"]',
    popover: {
      title: '👤 Customer Information',
      description: 'View customer details, contact info, and order history. Build relationships by understanding your customers!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="shipping-label"]',
    popover: {
      title: '🚚 Shipping & Fulfillment',
      description: 'Generate shipping labels, track packages, and update delivery status. Integration with The Courier Guy makes shipping a breeze!',
      side: 'bottom' as const,
    },
    chatMessage: 'Pro tip: Print shipping labels in bulk to save time! 📦',
  },
  {
    element: '[data-tour="order-filters"]',
    popover: {
      title: '🔍 Smart Filters',
      description: 'Filter orders by date range, status, payment method, or customer. Find any order in seconds!',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="bulk-update"]',
    popover: {
      title: '📊 Bulk Processing',
      description: 'Select multiple orders to update status in batch. Perfect for morning order processing routines!',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="order-notifications"]',
    popover: {
      title: '🔔 Customer Notifications',
      description: 'Customers get automatic notifications at each stage. You can also send custom messages for special situations!',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re now an Order Management Expert! Fast processing = Happy customers = More sales! 🚀',
  },
];

// Analytics Tutorial
export const analyticsSteps = [
  {
    element: '[data-tour="analytics-nav"]',
    popover: {
      title: '📊 Analytics Dashboard',
      description: 'Welcome to your data command center! Make informed decisions with real-time insights and beautiful visualizations.',
      side: 'bottom' as const,
    },
    chatMessage: 'Data is power! Let me show you how to read your business metrics like a pro! 📈',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="key-metrics"]',
    popover: {
      title: '🎯 Key Performance Indicators',
      description: 'Your most important metrics at a glance: Total Revenue, Orders, Average Order Value, and Products Sold.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="revenue-chart"]',
    popover: {
      title: '💰 Revenue Trends',
      description: 'Track your revenue over time. Look for patterns, spot growth opportunities, and celebrate wins!',
      side: 'top' as const,
    },
    chatMessage: 'Watch those revenue lines go up! 📈 Trend analysis helps you plan inventory and promotions.',
  },
  {
    element: '[data-tour="top-products"]',
    popover: {
      title: '🏆 Top Selling Products',
      description: 'See which products are your stars! Focus on promoting bestsellers and optimizing underperformers.',
      side: 'right' as const,
    },
    showPointer: true,
    pointerDirection: 'left' as const,
  },
  {
    element: '[data-tour="order-status"]',
    popover: {
      title: '📦 Order Status Breakdown',
      description: 'Visualize your order pipeline. Make sure orders flow smoothly from pending to delivered!',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="customer-insights"]',
    popover: {
      title: '👥 Customer Analytics',
      description: 'Understand your customers: New vs returning, average order frequency, top spenders, and more!',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="time-selector"]',
    popover: {
      title: '📅 Time Range Selector',
      description: 'Compare performance across different time periods: Last 7 days, 30 days, 90 days, or custom ranges.',
      side: 'left' as const,
    },
    chatMessage: 'Compare this month vs last month to spot trends early! 🎯',
  },
  {
    element: '[data-tour="export-data"]',
    popover: {
      title: '📥 Export Reports',
      description: 'Download CSV or PDF reports for accounting, tax preparation, or deeper analysis in Excel.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="influencer-section"]',
    popover: {
      title: '🎁 Ad Bonus Tracking',
      description: 'NEW! See exactly how much you\'re spending on influencer ad bonuses and your ROI. Monitor which influencers drive the most sales!',
      side: 'top' as const,
    },
    chatMessage: 'This is your commission breakdown! See base revenue vs ad bonus costs. Optimize for profit! 💎',
  },
  {
    element: '[data-tour="recommendations"]',
    popover: {
      title: '💡 Smart Recommendations',
      description: 'AI-powered insights suggest actions: "Restock Product X", "Promote slow movers", "Adjust pricing on Item Y"',
      side: 'bottom' as const,
    },
    chatMessage: '🎉 You\'re now a Data-Driven Decision Maker! Use these insights to grow your business! 🚀',
  },
];

// Advertising Tutorial
export const advertisingSteps = [
  {
    element: '[data-tour="advertising-nav"]',
    popover: {
      title: '📢 Advertising System',
      description: 'Create powerful ad campaigns, attract influencers, and boost your sales! This is where marketing magic happens.',
      side: 'bottom' as const,
    },
    chatMessage: 'Ready to become an advertising superstar? Let\'s create campaigns that convert! 🎯',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="create-campaign"]',
    popover: {
      title: '✨ Create New Campaign',
      description: 'Start here to create ad campaigns. Bundle products, set ad bonuses, and define your target audience!',
      side: 'left' as const,
    },
    showPointer: true,
    pointerDirection: 'right' as const,
  },
  {
    element: '[data-tour="product-bundle"]',
    popover: {
      title: '📦 Product Bundles',
      description: 'Select products to feature in your ad. Bundle complementary items together for better conversions!',
      side: 'bottom' as const,
    },
    chatMessage: 'Pro tip: Bundles sell better! "CBD Oil + Gummies" performs better than single products. 💡',
  },
  {
    element: '[data-tour="ad-bonus-rate"]',
    popover: {
      title: '🎁 Ad Bonus Rate (0-5%)',
      description: 'THIS IS KEY! Set the extra bonus you\'ll pay influencers (0-5% of platform\'s 25% profit). Higher bonus = More influencers promoting your products!',
      side: 'right' as const,
    },
    chatMessage: '⚠️ IMPORTANT: 3% = Standard, 5% = Premium promotion. This comes from YOUR 75% payout!',
  },
  {
    element: '[data-tour="bonus-calculator"]',
    popover: {
      title: '💰 Cost Calculator',
      description: 'See exactly how much each bonus rate costs you per R100 product. Make informed decisions!',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="campaign-details"]',
    popover: {
      title: '📝 Campaign Details',
      description: 'Add compelling titles, descriptions, and visuals. Make your ad irresistible to influencers AND customers!',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="targeting"]',
    popover: {
      title: '🎯 Targeting Options',
      description: 'Choose which influencer tiers can promote: All tiers, or specific ones (Seed, Sprout, Growth, etc.)',
      side: 'bottom' as const,
    },
    chatMessage: 'Target higher-tier influencers for premium products! They have larger audiences. 🌟',
  },
  {
    element: '[data-tour="active-campaigns"]',
    popover: {
      title: '📊 Active Campaigns',
      description: 'View all your running campaigns. Track performance: impressions, clicks, conversions, and ROI!',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="campaign-analytics"]',
    popover: {
      title: '📈 Campaign Performance',
      description: 'Deep dive into each campaign: Which influencers are promoting, conversion rates, revenue generated, and bonus costs.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="influencer-list"]',
    popover: {
      title: '👥 Influencers Promoting',
      description: 'See who\'s actively promoting your products! You can message them directly to build relationships.',
      side: 'left' as const,
    },
    chatMessage: '🎉 Congrats! You\'re now ready to run killer ad campaigns! Remember: Good ads + Right bonus = Sales explosion! 💥',
  },
];

// Settings Tutorial
export const settingsSteps = [
  {
    element: '[data-tour="settings-nav"]',
    popover: {
      title: '⚙️ Settings & Configuration',
      description: 'Customize your dispensary profile, payment methods, notifications, and business preferences.',
      side: 'bottom' as const,
    },
    chatMessage: 'Let\'s personalize your dispensary setup for maximum efficiency! 🛠️',
    showPointer: true,
    pointerDirection: 'down' as const,
  },
  {
    element: '[data-tour="profile-section"]',
    popover: {
      title: '🏪 Dispensary Profile',
      description: 'Update your business name, logo, description, and contact information. This is what customers see!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="operating-hours"]',
    popover: {
      title: '🕐 Operating Hours',
      description: 'Set your business hours. Customers see when you\'re open, and the system can auto-hold orders outside these times.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="payment-methods"]',
    popover: {
      title: '💳 Payment Setup',
      description: 'Configure how you receive payments: Bank account, mobile money, or crypto. Payouts happen monthly!',
      side: 'left' as const,
    },
    chatMessage: 'Make sure your payment details are correct to avoid payout delays! 💰',
  },
  {
    element: '[data-tour="notification-settings"]',
    popover: {
      title: '🔔 Notifications',
      description: 'Choose which alerts you receive: New orders, low stock, customer messages, payout notifications, etc.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="shipping-zones"]',
    popover: {
      title: '🚚 Shipping Configuration',
      description: 'Set up delivery zones, shipping rates, and fulfillment options. Integrated with The Courier Guy!',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="tax-settings"]',
    popover: {
      title: '📊 Tax & Compliance',
      description: 'Configure VAT settings, tax rates, and compliance documentation. Stay legal and organized!',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="branding"]',
    popover: {
      title: '🎨 Branding & Theme',
      description: 'Customize colors, upload logos, and create a unique look for your storefront.',
      side: 'left' as const,
    },
  },
  {
    element: '[data-tour="integrations"]',
    popover: {
      title: '🔌 Integrations',
      description: 'Connect with external tools: Accounting software, inventory systems, marketing platforms.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="security"]',
    popover: {
      title: '🔒 Security Settings',
      description: 'Enable two-factor authentication, manage team access, and review login history.',
      side: 'top' as const,
    },
    chatMessage: '🎉 All set! Your dispensary is now perfectly configured! Remember to review settings quarterly. ✅',
  },
];

// Export all tutorials
export const tutorialContent = {
  'product-management': productManagementSteps,
  'order-management': orderManagementSteps,
  'analytics': analyticsSteps,
  'advertising': advertisingSteps,
  'settings-profile': settingsSteps,
};
