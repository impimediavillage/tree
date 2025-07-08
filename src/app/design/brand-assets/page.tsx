
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Palette, Sparkles, Store, Leaf } from 'lucide-react';
import { DesignResultDialog } from '@/components/design/DesignResultDialog';

export default function BrandAssetsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [subjectType, setSubjectType] = useState<'store' | 'strain' | null>(null);
    const [subjectName, setSubjectName] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleGenerateClick = () => {
        if (!subjectType) {
            toast({ title: "Selection Required", description: "Please choose whether to use your store name or a custom strain name.", variant: "destructive" });
            return;
        }
        if (subjectType === 'strain' && !subjectName.trim()) {
            toast({ title: "Strain Name Required", description: "Please enter a name for the strain.", variant: "destructive" });
            return;
        }

        setIsDialogOpen(true);
    };

    const finalSubjectName = subjectType === 'store' ? (currentUser?.dispensaryId ? "My Store" : "The Wellness Tree") : subjectName;
    const isStoreAsset = subjectType === 'store';

    return (
        <>
            <div className="container mx-auto max-w-2xl py-12 px-4">
                <Card className="shadow-xl border-primary/20">
                    <CardHeader className="text-center">
                        <Palette className="mx-auto h-14 w-14 text-primary mb-3"/>
                        <CardTitle className="text-4xl font-extrabold">AI Asset Generator</CardTitle>
                        <CardDescription className="text-lg">
                            Create a stunning promotional pack for your store or a specific strain.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-3">
                            <Label className="text-lg font-semibold">1. Choose Your Subject</Label>
                            <RadioGroup onValueChange={(value) => setSubjectType(value as 'store' | 'strain')} value={subjectType || ''}>
                                <div className="flex items-center space-x-3 p-4 border rounded-md hover:bg-muted/50">
                                    <RadioGroupItem value="store" id="r_store" />
                                    <Label htmlFor="r_store" className="font-normal flex items-center gap-2 text-base">
                                        <Store className="h-5 w-5 text-blue-500" />
                                        Use Store Name
                                        <span className="text-muted-foreground text-sm">({currentUser?.dispensaryId ? "Your Store" : "The Wellness Tree"})</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-4 border rounded-md hover:bg-muted/50">
                                    <RadioGroupItem value="strain" id="r_strain" />
                                    <Label htmlFor="r_strain" className="font-normal flex items-center gap-2 text-base">
                                        <Leaf className="h-5 w-5 text-green-500" />
                                        Use a Custom Strain/Product Name
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        
                        {subjectType === 'strain' && (
                            <div className="space-y-2 animate-fade-in-scale-up" style={{animationDuration: '0.3s'}}>
                                <Label htmlFor="strain-name" className="text-lg font-semibold">2. Enter Name</Label>
                                <Input 
                                    id="strain-name" 
                                    placeholder="e.g., Lemon Haze, Cosmic Cookies" 
                                    value={subjectName} 
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    className="text-base h-12"
                                />
                            </div>
                        )}

                        <div className="pt-4">
                            <Button 
                                size="lg" 
                                className="w-full text-lg py-6"
                                onClick={handleGenerateClick}
                                disabled={!subjectType || (subjectType === 'strain' && !subjectName.trim())}
                            >
                                <Sparkles className="mr-2 h-5 w-5"/>
                                Generate Sticker & Apparel Pack
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {isDialogOpen && (
                 <DesignResultDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    subjectName={finalSubjectName}
                    isStoreAsset={isStoreAsset}
                />
            )}
        </>
    );
}

