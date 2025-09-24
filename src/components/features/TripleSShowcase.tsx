'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Store } from 'lucide-react';

const allImageFiles = [
'103.png', '10.png', '110.png', '111.png', '112.png', '113.png', '114.png', '115.png', '116.png', '117.png', '118.png', '119.png', '11.png', '120.png', '121.png', '122.png', '123.png', '124.png', '125.png', '126.png', '127.png', '128.png', '129.png', '12.png', '130.png', '131.png', '132.png', '133.png', '134.png', '135.png', '136.png', '137.png', '138.png', '139.png', '13.png', '140.png', '141.png', '142.png', '143.png', '144.png', '145.png', '146.png', '147.png', '148.png', '149.png', '14.png', '150.png', '151.png', '152.png', '153.png', '154.png', '155.png', '156.png', '157.png', '158.png', '159.png', '15.png', '160.png', '161.png', '162.png', '163.png', '164.png', '165.png', '166.png', '167.png', '168.png', '169.png', '16.png', '170.png', '171.png', '172.png', '173.png', '174.png', '175.png', '176.png', '177.png', '178.png', '179.png', '17.png', '180.png', '181.png', '182.png', '183.png', '184.png', '185.png', '186.png', '187.png', '188.png', '189.png', '18.png', '190.png', '192.png', '193.png', '194.png', '195.png', '196.png', '197.png', '198.png', '199.png', '19.png', '1.png', '200.png', '201.png', '202.png', '203.png', '204.png', '205.png', '206.png', '207.png', '208.png', '209.png', '20.png', '210.png', '211.png', '212.png', '213.png', '214.png', '215.png', '216.png', '217.png', '218.png', '219.png', '21.png', '220.png', '221.png', '222.png', '223.png', '224.png', '225.png', '226.png', '227.png', '228.png', '229.png', '22.png', '230.png', '231.png', '232.png', '233.png', '234.png', '235.png', '236.png', '237.png', '238.png', '23.png', '240.png', '241.png', '242.png', '243.png', '244.png', '245.png', '246.png', '247.png', '248.png', '249.png', '24.png', '250.png', '251.png', '252.png', '253.png', '254.png', '255.png', '256.png', '257.png', '258.png', '259.png', '25.png', '260.png', '261.png', '262.png', '263.png', '264.png', '265.png', '266.png', '267.png', '268.png', '269.png', '26.png', '270.png', '271.png', '272.png', '273.png', '274.png', '275.png', '276.png', '277.png', '278.png', '279.png', '27.png', '280.png', '281.png', '282.png', '283.png', '284.png', '285.png', '286.png', '289.png', '28.png', '290.png', '291.png', '292.png', '293.png', '294.png', '295.png', '296.png', '297.png', '298.png', '299.png', '29.png', '2.png', '300.png', '301.png', '302.png', '303.png', '304.png', '305.png', '306.png', '307.png', '308.png', '309.png', '30.png', '310.png', '311.png', '312.png', '313.png', '314.png', '315.png', '316.png', '317.png', '318.png', '319.png', '31.png', '320.png', '321.png', '322.png', '323.png', '324.png', '325.png', '326.png', '327.png', '328.png', '329.png', '32.png', '330.png', '331.png', '332.png', '333.png', '334.png', '335.png', '336.png', '337.png', '338.png', '339.png', '33.png', '340.png', '341.png', '342.png', '343.png', '344.png', '345.png', '346.png', '347.png', '348.png', '349.png', '34.png', '350.png', '351.png', '352.png', '353.png', '355.png', '356.png', '357.png', '358.png', '359.png', '35.png', '360.png', '361.png', '362.png', '363.png', '364.png', '365.png', '366.png', '367.png', '368.png', '369.png', '370.png', '371.png', '372.png', '373.png', '374.png', '375.png', '376.png', '377.png', '378.png', '379.png', '380.png', '381.png', '382.png', '383.png', '384.png', '385.png', '386.png', '387.png', '388.png', '389.png', '390.png', '391.png', '392.png', '393.png', '394.png', '395.png', '396.png', '397.png', '398.png', '399.png', '3.png', '400.png', '401.png', '402.png', '403.png', '404.png', '405.png', '406.png', '407.png', '408.png', '409.png', '410.png', '411.png', '412.png', '413.png', '414.png', '415.png', '416.png', '418.png', '419.png', '420.png', '421.png', '422.png', '423.png', '424.png', '425.png', '426.png', '427.png', '428.png', '429.png', '42.png', '430.png', '431.png', '432.png', '433.png', '434.png', '435.png', '436.png', '437.png', '438.png', '439.png', '440.png', '441.png', '442.png', '443.png', '445.png', '446.png', '447.png', '448.png', '449.png', '450.png', '451.png', '452.png', '453.png', '454.png', '455.png', '456.png', '457.png', '458.png', '459.png', '45.png', '460.png', '461.png', '462.png', '463.png', '464.png', '465.png', '466.png', '467.png', '468.png', '469.png', '46.png', '470.png', '471.png', '472.png', '473.png', '474.png', '475.png', '476.png', '477.png', '478.png', '479.png', '480.png', '481.png', '482.png', '483.png', '484.png', '485.png', '486.png', '487.png', '4.png', '5.png', '6.png', '7.png', '84.png', '85.png', '86.png', '87.png', '88.png', '89.png', '8.png', '90.png', '91.png', '95.png', '96.png', '9.png'
].filter(Boolean);

const TripleSShowcase = () => {
  const [shuffledImages, setShuffledImages] = useState<string[]>([]);

  useEffect(() => {
    const array = [...allImageFiles];
    // Fisher-Yates shuffle for variety
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    // Use a larger set of images to ensure the animation is smooth
    const selectedImages = array.slice(0, 40).map(file => `/images/2025-triple-s-400/${file}`);
    setShuffledImages([...selectedImages, ...selectedImages]); // Duplicate for seamless looping
  }, []);

  return (
    <section 
      className="animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50 rounded-lg p-6 shadow-lg overflow-hidden"
      style={{ animationFillMode: 'backwards', animationDelay: '0.3s' }}
      data-ai-hint="triple-s-club-section"
    >
      <div className="text-center mb-6">
        <h2 
          className="text-5xl font-extrabold text-primary tracking-tight"
          style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
          The Triple S Club
        </h2>
        <blockquote 
          className="text-lg text-foreground max-w-3xl mx-auto mt-4 italic"
          style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
          &quot;Share your garden delights by joining the Triple S club - You sell our Sticker designs and keep the profit - we help you share your legal home grow with fellow canna club enthusiasts.&quot;
        </blockquote>
      </div>
      
      <div className="relative w-full overflow-hidden" data-ai-hint="image-scroller-container">
        <div className="flex animate-scroll" style={{ animationDuration: '5s' }}>
          {shuffledImages.map((src, index) => (
            <figure key={index} className="shrink-0 mx-2" data-ai-hint={`showcase-image-${index}`}>
              <div className="overflow-hidden rounded-lg border-2 border-primary/20 shadow-lg">
                <Image
                  src={src}
                  alt={`Showcase image ${index + 1}`}
                  className="aspect-[3/4] h-64 w-auto object-contain bg-muted/20"
                  width={250}
                  height={333}
                />
              </div>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
        <Card className="bg-muted/30 p-6 border-primary/20 flex flex-col">
          <CardContent className="flex flex-col items-center justify-center gap-4 flex-grow">
            <h3 className="text-xl font-bold text-foreground">Create your own club or store</h3>
            <p className="text-sm text-foreground italic">
              Create your own custom club / store caps, tshirts, hoodies and beanie and sticker sets with your own funky designs. Trade wholesale and retail CBD products with a public store and private Inter store trading.
            </p>
          </CardContent>
          <div className="mt-auto pt-4">
            <Button asChild size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
              <Link href="/dispensary-signup">
                <Store className="mr-2 h-5 w-5" />
                Create Club / Store
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="bg-muted/30 p-6 border-primary/20 flex flex-col">
          <CardContent className="flex flex-col items-center justify-center gap-4 flex-grow">
            <p className="text-sm text-foreground">
              Sign up as Triple S leaf club member to access all our AI models. Create your own customized Apparel including caps, beanies, hoodies, and tees. Get expert cannibinoid related advise with Cannibinoid AI.
            </p>
          </CardContent>
          <div className="mt-auto pt-4">
            <Button asChild size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
              <Link href="/auth/signup">
                <Leaf className="mr-2 h-5 w-5" />
                Sign up as a leaf
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default TripleSShowcase;
