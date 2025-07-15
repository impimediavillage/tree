"use strict";
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScraper = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const BASE_URL = 'https://www.justbrand.co.za';
// --- UTILITY FUNCTIONS ---
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
};
const normalizePrice = (priceString) => {
    if (!priceString)
        return 0;
    // Removes currency symbol, commas, and converts to a float.
    const numberValue = parseFloat(priceString.replace(/[R,]/g, '').trim());
    // If parsing fails (e.g., for "Sold Out"), return 0 instead of NaN
    return isNaN(numberValue) ? 0 : numberValue;
};
const normalizeImageUrl = (url) => {
    if (!url)
        return '';
    let fullUrl = url;
    if (fullUrl.startsWith('//')) {
        fullUrl = `https:${fullUrl}`;
    }
    // Remove any Shopify image resizing parameters
    return fullUrl.split('?')[0];
};
const axiosWithRetry = async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            return response;
        }
        catch (error) {
            if (i === retries - 1)
                throw error;
            await new Promise(res => setTimeout(res, delay * (i + 1)));
        }
    }
};
// --- SCRAPING FUNCTIONS ---
const scrapeProductDetails = async (productHandle) => {
    try {
        const productUrl = `${BASE_URL}/products/${productHandle}`;
        // Shopify's JSON API is the most reliable way to get product data
        const { data } = await axiosWithRetry(`${productUrl}.json`);
        const productData = data.product;
        if (!productData) {
            return null;
        }
        const variants = productData.variants.map((variant) => ({
            title: variant.title,
            sku: variant.sku || null,
            price: normalizePrice(variant.price),
            image: variant.featured_image ? normalizeImageUrl(variant.featured_image.src) : null,
        }));
        const images = productData.images.map((image) => normalizeImageUrl(image.src));
        return {
            title: productData.title,
            handle: productData.handle,
            productUrl,
            description: cheerio.load(productData.body_html || '').root().text().trim(),
            price: productData.variants[0] ? normalizePrice(productData.variants[0].price) : 0,
            priceMin: productData.price_min ? productData.price_min / 100 : 0, // Correctly handle cents
            priceMax: productData.price_max ? productData.price_max / 100 : 0, // Correctly handle cents
            images,
            variants,
        };
    }
    catch (error) {
        console.error(`Failed to scrape product details for handle: ${productHandle}`, error);
        return null;
    }
};
const scrapeProductHandlesForCategory = async (categoryUrl, log) => {
    const productHandles = new Set();
    let currentPageUrl = categoryUrl;
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
        }
        catch (error) {
            console.error(`Failed to scrape category page: ${currentPageUrl}`, error);
            currentPageUrl = undefined; // Stop pagination on error
        }
    }
    return Array.from(productHandles);
};
const scrapeCategories = async (log) => {
    log('Starting to scrape categories from /collections...');
    try {
        const { data } = await axiosWithRetry(`${BASE_URL}/collections`);
        const $ = cheerio.load(data);
        const categories = [];
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
    }
    catch (error) {
        console.error('Failed to scrape main collections page.', error);
        log('ERROR: Failed to scrape main collections page.');
        return [];
    }
};
// --- MAIN ORCHESTRATOR ---
const runScraper = async (log) => {
    const categories = await scrapeCategories(log);
    if (categories.length === 0) {
        throw new Error("No categories found. Aborting scrape.");
    }
    const scrapedProducts = new Map();
    const fullCatalog = [];
    for (const categoryInfo of categories) {
        log(`--- Processing Category: ${categoryInfo.name} ---`);
        const category = { ...categoryInfo, products: [] };
        const productHandles = await scrapeProductHandlesForCategory(category.url, log);
        log(`Found ${productHandles.length} product handles in ${category.name}. Scraping details...`);
        for (const handle of productHandles) {
            // Check cache first to avoid re-scraping
            if (scrapedProducts.has(handle)) {
                log(`Product "${handle}" already scraped. Using cached data.`);
                const product = scrapedProducts.get(handle);
                if (product)
                    category.products.push(product);
                continue;
            }
            const productDetails = await scrapeProductDetails(handle);
            if (productDetails) {
                log(`Successfully scraped: ${productDetails.title}`);
                category.products.push(productDetails);
                scrapedProducts.set(handle, productDetails); // Cache the result
            }
            else {
                log(`Failed to scrape details for handle: ${handle}`);
            }
        }
        fullCatalog.push(category);
    }
    log('--- Scrape Finished ---');
    return fullCatalog;
};
exports.runScraper = runScraper;
//# sourceMappingURL=justbrand-scraper.js.map