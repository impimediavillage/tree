'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Leaf, Store, Palette } from 'lucide-react';

interface Quote {
  quotes: string[];
}

export default function TripleSClubPage() {
  const [quotes, setQuotes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [showHowToJoin, setShowHowToJoin] = useState(false);
  const [showStickerSets, setShowStickerSets] = useState(false);
  const [stickerPage, setStickerPage] = useState(0);
  const [stickerImages, setStickerImages] = useState<string[]>([]);
  
  const imagesPerPage = 12;
  
  useEffect(() => {
    // Load quotes
    fetch('/data/triple-s-quotes.json')
      .then(res => res.json())
      .then((data: Quote) => setQuotes(data.quotes))
      .catch(err => console.error('Failed to load quotes:', err));
    
    // Load AI club images from API route
    loadAiClubImages();

    // Dynamically load sticker images
    loadStickerImages();
  }, []);
  
  const loadAiClubImages = async () => {
    try {
      const response = await fetch('/api/ai-club');
      const data = await response.json();
      console.log('AI club images API response:', data);
      if (data.images && Array.isArray(data.images)) {
        setImagesList(data.images);
        console.log('Loaded Triple S Canna club images:', data.images.length);
      } else {
        console.error('Invalid API response format:', data);
      }
    } catch (error) {
      console.error('Failed to load Triple S Canna club images:', error);
    }
  };
  
  const loadStickerImages = async () => {
    try {
      // Fetch the API route that lists images in the directory
      const response = await fetch('/api/sticker-images');
      const data = await response.json();
      console.log('Sticker images API response:', data); // Debug log
      if (data.images && Array.isArray(data.images)) {
        setStickerImages(data.images);
        console.log('Loaded sticker images:', data.images.length); // Debug log
      } else {
        console.error('Invalid API response format:', data);
        loadFallbackImages();
      }
    } catch (error) {
      console.error('Failed to load sticker images:', error);
      loadFallbackImages();
    }
  };

  const loadFallbackImages = () => {
    // Fallback: load images based on the directory listing we know exists
    const fallbackImages: string[] = [];
    const knownNumbers = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 42, 45, 46,
      84, 85, 86, 87, 88, 89, 90, 91, 95, 96, 103, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
      120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139,
      140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159,
      160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179,
      180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 192, 193, 194, 195, 196, 197, 198, 199,
      200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219,
      220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 240,
      241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259,
      260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279,
      280, 281, 282, 283, 284, 285, 286, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299,
      300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319,
      320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339,
      340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 355, 356, 357, 358, 359,
      360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379,
      380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399,
      400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 418, 419,
      420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439,
      440, 441, 442, 443, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459,
      460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479,
      480, 481, 482, 483, 484, 485, 486, 487
    ];
    knownNumbers.forEach(num => {
      fallbackImages.push(`/images/2025-triple-s-400/${num}.png`);
    });
    setStickerImages(fallbackImages);
    console.log('Loaded fallback images:', fallbackImages.length);
  };
  
  // Shuffle images on each page change
  useEffect(() => {
    if (imagesList.length > 0) {
      const shuffled = [...imagesList].sort(() => Math.random() - 0.5);
      setImagesList(shuffled);
    }
  }, [currentPage]);
  
  const totalPages = Math.ceil(imagesList.length / imagesPerPage);
  const startIndex = currentPage * imagesPerPage;
  const currentImages = imagesList.slice(startIndex, startIndex + imagesPerPage);
  
  // Sticker sets pagination
  const stickerTotalPages = Math.ceil(stickerImages.length / imagesPerPage);
  const stickerStartIndex = stickerPage * imagesPerPage;
  const currentStickerImages = stickerImages.slice(stickerStartIndex, stickerStartIndex + imagesPerPage);
  
  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  const handleStickerPrevious = () => {
    setStickerPage(prev => Math.max(0, prev - 1));
  };
  
  const handleStickerNext = () => {
    setStickerPage(prev => Math.min(stickerTotalPages - 1, prev + 1));
  };
  
  const getRandomQuote = (index: number) => {
    if (quotes.length === 0) return '';
    return quotes[(startIndex + index) % quotes.length];
  };

  // How to Join slide-in page
  if (showHowToJoin) {
    return (
      <div className="min-h-screen bg-background p-4 animate-in slide-in-from-right duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-black text-[#3D2E17]">How to Join Triple S Club</h1>
            <Button
              onClick={() => setShowHowToJoin(false)}
              className="bg-[#3D2E17] hover:bg-[#006B3E] text-white"
            >
              <X className="mr-2 h-5 w-5" />
              Close
            </Button>
          </div>
          
          <div className="space-y-8">
            {/* Opportunity 1: Home Growers */}
            <div className="bg-[#006B3E]/10 border-2 border-[#006B3E] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Leaf className="h-8 w-8 text-[#006B3E]" />
                <h2 className="text-2xl font-black text-[#006B3E]">For Home Growers & Cultivators</h2>
              </div>
              <div className="space-y-3 text-[#3D2E17]">
                <p className="font-bold text-lg">Share Your Garden Grows - Get Our Design Packs!</p>
                <p className="leading-relaxed">
                  As a home grower or cultivator, you can share your legal THC garden products with the Triple S Canna Club community. Here's how it works:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">
                    <strong>Offer Free Samples:</strong> You cannot sell your home-grown THC products directly, but you can offer them as free samples to club members.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Get Design Packs:</strong> In exchange for sharing your products, we provide you with our exclusive Triple S design packs to sell and keep 100% of the price you set.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Revenue Split:</strong> We take 25% commission on design pack sales, with weekly payouts to South African bank accounts.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Attach Stickers:</strong> Each THC product you share must be attached to one of our design pack stickers to identify it as a Triple S Club sample.
                  </li>
                </ul>
              </div>
            </div>

            {/* Opportunity 2: Cannabis Stores */}
            <div className="bg-[#3D2E17]/10 border-2 border-[#3D2E17] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Store className="h-8 w-8 text-[#3D2E17]" />
                <h2 className="text-2xl font-black text-[#3D2E17]">For Cannabis Stores & Dispensaries</h2>
              </div>
              <div className="space-y-3 text-[#3D2E17]">
                <p className="font-bold text-lg">Feature Home Grower Products in Your Store</p>
                <p className="leading-relaxed">
                  If you run a cannabis store, dispensary, or existing canna club, you can partner with Triple S Club to offer unique home-grown products:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">
                    <strong>Curated Selection:</strong> Add home grower products to your store inventory as free samples for customers.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Design Pack Sales:</strong> Sell our exclusive sticker design packs alongside the free THC samples.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Only THC Products:</strong> Our design pack system only applies to THC products - CBD products don't require our stickers.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Revenue Share:</strong> Keep 75% of design pack sales, with weekly payouts to South African bank accounts.
                  </li>
                </ul>
              </div>
            </div>

            {/* Opportunity 3: Existing Clubs */}
            <div className="bg-[#006B3E]/10 border-2 border-[#006B3E] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="h-8 w-8 text-[#006B3E]" />
                <h2 className="text-2xl font-black text-[#006B3E]">For Existing Canna Clubs</h2>
              </div>
              <div className="space-y-3 text-[#3D2E17]">
                <p className="font-bold text-lg">Join Our Network & Monetize Your Community</p>
                <p className="leading-relaxed">
                  Already running a cannabis club? Partner with Triple S to expand your offerings and revenue streams:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li className="leading-relaxed">
                    <strong>Network Access:</strong> Connect with home growers and other clubs in our network.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Design Pack System:</strong> Use our sticker packs to legally facilitate THC product sharing.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Educational Resources:</strong> We provide guidance on legal compliance and best practices.
                  </li>
                  <li className="leading-relaxed">
                    <strong>Weekly Payouts:</strong> Receive 75% of design pack sales via South African bank transfers every week.
                  </li>
                </ul>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-6">
              <h3 className="text-xl font-black text-amber-900 mb-3">Important Legal Notice</h3>
              <p className="text-amber-900 leading-relaxed">
                <strong>THC Products Only:</strong> Our design pack sticker system is specifically designed for THC products to ensure legal compliance. 
                Home growers cannot sell THC products directly, but can offer them as free samples when attached to our design packs. 
                This system ensures all parties comply with local cannabis regulations while building a supportive community.
              </p>
              <p className="text-amber-900 leading-relaxed mt-3">
                <strong>Payment Terms:</strong> Currently, we only support weekly payouts to South African bank accounts. 
                International payment options will be added in future updates.
              </p>
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <Button
                onClick={() => window.location.href = '/dispensary-signup'}
                className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg px-8 py-6"
              >
                <Store className="mr-2 h-6 w-6" />
                Sign Up Your Store
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sticker Sets slide-in page
  if (showStickerSets) {
    return (
      <div className="min-h-screen bg-background p-4 animate-in slide-in-from-right duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-[#3D2E17]">Triple S Sticker Design Sets</h1>
              <p className="text-lg text-[#006B3E] font-bold mt-2">
                Premium Design Packs for THC Products • Page {stickerPage + 1} of {stickerTotalPages}
              </p>
            </div>
            <Button
              onClick={() => setShowStickerSets(false)}
              className="bg-[#3D2E17] hover:bg-[#006B3E] text-white"
            >
              <X className="mr-2 h-5 w-5" />
              Close
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
            {currentStickerImages.map((imagePath, index) => (
              <div
                key={`${imagePath}-${index}`}
                className="relative aspect-square cursor-pointer group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-[#006B3E]/20 hover:border-[#006B3E] transition-all overflow-hidden"
              >
                <Image
                  src={imagePath}
                  alt={`Sticker Design ${stickerStartIndex + index + 1}`}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#006B3E]/0 to-[#006B3E]/0 group-hover:from-[#006B3E]/10 group-hover:to-transparent transition-all duration-200" />
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              onClick={handleStickerPrevious}
              disabled={stickerPage === 0}
              className="bg-[#006B3E] hover:bg-[#3D2E17] text-white transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Previous
            </Button>
            
            <span className="text-[#3D2E17] font-bold">
              {stickerPage + 1} / {stickerTotalPages}
            </span>
            
            <Button
              onClick={handleStickerNext}
              disabled={stickerPage === stickerTotalPages - 1}
              className="bg-[#3D2E17] hover:bg-[#006B3E] text-white transition-all duration-200 active:scale-95"
            >
              Next
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main page
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Link href="/">
              <Button
                variant="outline"
                className="border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white"
                size="icon"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-4xl font-black text-[#3D2E17]">
              Triple S Canna Club
            </h1>
          </div>
          
          {/* Three Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 my-6">
            <Button
              onClick={() => setShowHowToJoin(true)}
              className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#90EE90] text-white font-bold px-6 py-3 transition-all duration-200 transform hover:scale-105"
            >
              <Leaf className="mr-2 h-5 w-5" />
              How to Join
            </Button>
            
            <Button
              onClick={() => window.location.href = '/dispensary-signup'}
              className="bg-[#3D2E17] hover:bg-[#006B3E] active:bg-[#90EE90] text-white font-bold px-6 py-3 transition-all duration-200 transform hover:scale-105"
            >
              <Store className="mr-2 h-5 w-5" />
              Sign Up Store
            </Button>
            
            <Button
              onClick={() => setShowStickerSets(true)}
              className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#90EE90] text-white font-bold px-6 py-3 transition-all duration-200 transform hover:scale-105"
            >
              <Palette className="mr-2 h-5 w-5" />
              View Sticker Sets
            </Button>
          </div>
          
          <p className="text-lg text-[#006B3E] font-bold">
            AI Stoners Club • Page {currentPage + 1} of {totalPages}
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0">
          {currentImages.map((imagePath, index) => (
            <div
              key={`${imagePath}-${index}`}
              className="relative aspect-[3/4] cursor-pointer group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
            >
              <Image
                src={imagePath}
                alt={`Triple S Member ${startIndex + index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              />
              
              {hoveredIndex === index && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-lg p-3 shadow-lg relative">
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
                    <p className="text-sm font-bold text-[#3D2E17] text-center">
                      {getRandomQuote(index)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            onClick={handlePrevious}
            disabled={currentPage === 0}
            className="bg-[#006B3E] hover:bg-[#3D2E17] text-white transition-all duration-200 active:scale-95"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Previous
          </Button>
          
          <span className="text-[#3D2E17] font-bold">
            {currentPage + 1} / {totalPages}
          </span>
          
          <Button
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
            className="bg-[#3D2E17] hover:bg-[#006B3E] text-white transition-all duration-200 active:scale-95"
          >
            Next
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
