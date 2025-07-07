
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { JustBrandCategory, JustBrandProduct, JustBrandVariant } from '../types';

const BASE_URL = 'https://www.justbrand.co.za';

// --- UTILITY FUNCTIONS ---

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
};

const normalizePrice = (priceString: string): number => {
  if (!priceString) return 0;
  // Removes currency symbol, commas, and converts to a float.
  return parseFloat(priceString.replace(/[R,]/g, '').trim());
};

const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  let fullUrl = url;
  if (fullUrl.startsWith('//')) {
    fullUrl = `https:${fullUrl}`;
  }
  // Remove any Shopify image resizing parameters
  return fullUrl.split('?')[0];
};

const axiosWithRetry = async (url: string, retries = 3, delay = 1000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      return response;
    } catch (error: any) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
};

// --- SCRAPING FUNCTIONS ---

const scrapeProductDetails = async (productHandle: string): Promise<JustBrandProduct | null> => {
  try {
    const productUrl = `${BASE_URL}/products/${productHandle}`;
    // Shopify's JSON API is the most reliable way to get product data
    const { data } = await axiosWithRetry(`${productUrl}.json`);
    const productData = data.product;

    if (!productData) {
      return null;
    }

    const variants: JustBrandVariant[] = productData.variants.map((variant: any) => ({
      title: variant.title,
      sku: variant.sku || null,
      price: normalizePrice(variant.price),
      image: variant.featured_image ? normalizeImageUrl(variant.featured_image.src) : null,
    }));

    const images: string[] = productData.images.map((image: any) => normalizeImageUrl(image.src));

    return {
      title: productData.title,
      handle: productData.handle,
      productUrl,
      description: cheerio.load(productData.body_html || '').text().trim(),
      price: normalizePrice(productData.variants[0]?.price || '0'),
      priceMin: normalizePrice(productData.price_min?.toString() || '0'),
      priceMax: normalizePrice(productData.price_max?.toString() || '0'),
      images,
      variants,
    };
  } catch (error) {
    console.error(`Failed to scrape product details for handle: ${productHandle}`, error);
    return null;
  }
};

const scrapeProductHandlesForCategory = async (categoryUrl: string, log: (message: string) => void): Promise<string[]> => {
  const productHandles = new Set<string>();
  let currentPageUrl: string | undefined = categoryUrl;

  while (currentPageUrl) {
    log(`Scraping handles from category page: ${currentPageUrl}`);
    try {
      const { data } = await axiosWithRetry(currentPageUrl);
      const $ = cheerio.load(data);
      
      $('a.product-item__image-wrapper').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const handle = href.split('/').pop();
          if (handle) {
            productHandles.add(handle);
          }
        }
      });
      
      const nextPageLink = $('.pagination__item--next > a').attr('href');
      currentPageUrl = nextPageLink ? `${BASE_URL}${nextPageLink}` : undefined;

    } catch (error) {
      console.error(`Failed to scrape category page: ${currentPageUrl}`, error);
      currentPageUrl = undefined; // Stop pagination on error
    }
  }
  
  return Array.from(productHandles);
};

const scrapeCategories = async (log: (message: string) => void): Promise<Omit<JustBrandCategory, 'products'>[]> => {
  log('Starting to scrape categories from /collections...');
  try {
    const { data } = await axiosWithRetry(`${BASE_URL}/collections`);
    const $ = cheerio.load(data);
    const categories: Omit<JustBrandCategory, 'products'>[] = [];

    $('a.collection-grid-item').each((_, el) => {
      const url = $(el).attr('href');
      const name = $(el).find('.collection-grid-item__title').text().trim();
      if (url && name) {
        categories.push({
          name,
          slug: slugify(name),
          url: `${BASE_URL}${url}`,
        });
      }
    });

    log(`Found ${categories.length} categories.`);
    return categories;
  } catch (error) {
    console.error('Failed to scrape main collections page.', error);
    log('ERROR: Failed to scrape main collections page.');
    return [];
  }
};

// --- MAIN ORCHESTRATOR ---

export const runScraper = async (log: (message: string) => void): Promise<JustBrandCategory[]> => {
  const categories = await scrapeCategories(log);
  if (categories.length === 0) {
    throw new Error("No categories found. Aborting scrape.");
  }

  const scrapedProducts = new Map<string, JustBrandProduct>();
  const fullCatalog: JustBrandCategory[] = [];

  for (const categoryInfo of categories) {
    log(`--- Processing Category: ${categoryInfo.name} ---`);
    const category: JustBrandCategory = { ...categoryInfo, products: [] };
    
    const productHandles = await scrapeProductHandlesForCategory(category.url, log);
    log(`Found ${productHandles.length} product handles in ${category.name}. Scraping details...`);
    
    for (const handle of productHandles) {
      // Check cache first to avoid re-scraping
      if (scrapedProducts.has(handle)) {
        log(`Product "${handle}" already scraped. Using cached data.`);
        const product = scrapedProducts.get(handle);
        if (product) category.products.push(product);
        continue;
      }

      const productDetails = await scrapeProductDetails(handle);
      if (productDetails) {
        log(`Successfully scraped: ${productDetails.title}`);
        category.products.push(productDetails);
        scrapedProducts.set(handle, productDetails); // Cache the result
      } else {
        log(`Failed to scrape details for handle: ${handle}`);
      }
    }
    
    fullCatalog.push(category);
  }

  log('--- Scrape Finished ---');
  return fullCatalog;
};
