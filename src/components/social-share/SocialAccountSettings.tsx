'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Youtube, 
  MessageCircle,
  Mail,
  Smartphone,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { db, functions } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { SocialMediaAccount, SocialPlatform, PlatformConfig } from '@/types/social-media';

interface SocialAccountSettingsProps {
  userContext?: 'dispensary' | 'leaf' | 'influencer';
}

const platformConfigs: PlatformConfig[] = [
  {
    platform: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    authMethod: 'oauth',
    requiresOAuth: true,
    supportsScheduling: true,
    maxCharacters: 63206,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Connect your Facebook Page using OAuth 2.0 authentication.',
    docsUrl: 'https://developers.facebook.com/docs/graph-api'
  },
  {
    platform: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#E4405F',
    authMethod: 'oauth',
    requiresOAuth: true,
    supportsScheduling: true,
    maxCharacters: 2200,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Connect via Facebook Business account with Instagram access.',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api'
  },
  {
    platform: 'twitter',
    name: 'Twitter / X',
    icon: '🐦',
    color: '#1DA1F2',
    authMethod: 'api_key',
    requiresOAuth: false,
    supportsScheduling: true,
    maxCharacters: 280,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Enter your Twitter API key and secret from developer.twitter.com',
    docsUrl: 'https://developer.twitter.com/en/docs'
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    authMethod: 'oauth',
    requiresOAuth: true,
    supportsScheduling: true,
    maxCharacters: 3000,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Connect your LinkedIn Company Page via OAuth.',
    docsUrl: 'https://docs.microsoft.com/en-us/linkedin/'
  },
  {
    platform: 'youtube',
    name: 'YouTube',
    icon: '📹',
    color: '#FF0000',
    authMethod: 'oauth',
    requiresOAuth: true,
    supportsScheduling: true,
    maxCharacters: 5000,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Connect your YouTube channel via Google OAuth.',
    docsUrl: 'https://developers.google.com/youtube/v3'
  },
  {
    platform: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    authMethod: 'credentials',
    requiresOAuth: false,
    supportsScheduling: false,
    maxCharacters: 2200,
    supportsImages: false,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Enter your TikTok username and app password.',
    docsUrl: 'https://developers.tiktok.com/'
  },
  {
    platform: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    authMethod: 'api_key',
    requiresOAuth: false,
    supportsScheduling: false,
    maxCharacters: 4096,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: false,
    setupInstructions: 'Enter your WhatsApp Business API credentials.',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp'
  },
  {
    platform: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: '#0088cc',
    authMethod: 'api_key',
    requiresOAuth: false,
    supportsScheduling: true,
    maxCharacters: 4096,
    supportsImages: true,
    supportsVideos: true,
    supportsHashtags: true,
    setupInstructions: 'Create a bot via @BotFather and enter the bot token.',
    docsUrl: 'https://core.telegram.org/bots/api'
  }
];

const connectSocialAccount = httpsCallable(functions, 'connectSocialAccount');
const disconnectSocialAccount = httpsCallable(functions, 'disconnectSocialAccount');
const refreshSocialToken = httpsCallable(functions, 'refreshSocialToken');

export function SocialAccountSettings({ userContext = 'dispensary' }: SocialAccountSettingsProps) {
  const { currentUser, currentDispensary } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Connection form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  // Determine the correct entity ID based on user context
  const getEntityId = () => {
    if (userContext === 'dispensary' && currentDispensary?.id) {
      return currentDispensary.id;
    }
    return currentUser?.uid;
  };

  // Determine the correct collection path
  const getCollectionPath = () => {
    if (userContext === 'dispensary' && currentDispensary?.id) {
      return `dispensaries/${currentDispensary.id}/socialAccounts`;
    }
    return `users/${currentUser?.uid}/socialAccounts`;
  };

  useEffect(() => {
    const entityId = getEntityId();
    if (entityId) {
      fetchConnectedAccounts();
    }
  }, [currentUser?.uid, currentDispensary?.id, userContext]);

  const fetchConnectedAccounts = async () => {
    const entityId = getEntityId();
    if (!entityId) return;
    
    setIsLoading(true);
    try {
      const collectionPath = getCollectionPath();
      const [collection1, collection2, ...rest] = collectionPath.split('/');
      const accountsRef = collection(db, collection1, collection2, ...rest);
      const snapshot = await getDocs(accountsRef);
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SocialMediaAccount[];
      
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load connected accounts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectClick = (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setUsername('');
    setPassword('');
    setApiKey('');
    setApiSecret('');
    setShowConnectDialog(true);
  };

  const handleConnect = async () => {
    const entityId = getEntityId();
    if (!entityId || !selectedPlatform) return;

    setIsConnecting(true);
    try {
      const connectionData: any = {
        entityId: entityId,
        userContext: userContext,
        platform: selectedPlatform.platform,
        authMethod: selectedPlatform.authMethod
      };

      if (selectedPlatform.authMethod === 'api_key') {
        connectionData.apiKey = apiKey;
        connectionData.apiSecret = apiSecret;
      } else if (selectedPlatform.authMethod === 'credentials') {
        connectionData.username = username;
        connectionData.password = password;
      } else if (selectedPlatform.requiresOAuth) {
        // Initiate OAuth flow
        toast({
          title: 'OAuth Required',
          description: 'You will be redirected to authorize your account.',
        });
        // TODO: Implement OAuth redirect
        return;
      }

      await connectSocialAccount(connectionData);
      
      toast({
        title: 'Account Connected',
        description: `${selectedPlatform.name} has been connected successfully!`,
      });
      
      setShowConnectDialog(false);
      fetchConnectedAccounts();
    } catch (error: any) {
      console.error('Error connecting account:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect account',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string, platformName: string) => {
    const entityId = getEntityId();
    if (!entityId) return;

    try {
      await disconnectSocialAccount({
        entityId: entityId,
        userContext: userContext,
        accountId
      });
      
      toast({
        title: 'Account Disconnected',
        description: `${platformName} has been disconnected.`,
      });
      
      fetchConnectedAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect account',
        variant: 'destructive'
      });
    }
  };

  const getAccountStatus = (platform: SocialPlatform) => {
    return accounts.find(acc => acc.platform === platform);
  };

  const getStatusIcon = (status?: SocialMediaAccount) => {
    if (!status) return <XCircle className="h-5 w-5 text-gray-400" />;
    if (status.status === 'connected') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status.status === 'expired') return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Social Media Accounts
          </CardTitle>
          <CardDescription>
            Connect your social media accounts to share content directly from The Wellness Tree.
            Your credentials are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformConfigs.map((platform) => {
              const account = getAccountStatus(platform.platform);
              const isConnected = !!account && account.status === 'connected';

              return (
                <Card 
                  key={platform.platform}
                  className="relative overflow-hidden border-2 hover:shadow-md transition-shadow"
                  style={{ borderColor: isConnected ? platform.color : undefined }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div 
                          className="text-3xl p-2 rounded-lg"
                          style={{ backgroundColor: `${platform.color}15` }}
                        >
                          {platform.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{platform.name}</h3>
                          {account && account.username && (
                            <p className="text-sm text-muted-foreground">@{account.username}</p>
                          )}
                          {account && (
                            <Badge 
                              variant={account.status === 'connected' ? 'default' : 'secondary'}
                              className="mt-1"
                            >
                              {account.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {getStatusIcon(account)}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnect(account.id!, platform.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Disconnect
                          </Button>
                          {account.authMethod === 'oauth' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await refreshSocialToken({
                                    dispensaryId: currentDispensary?.id,
                                    accountId: account.id
                                  });
                                  toast({ title: 'Token Refreshed' });
                                  fetchConnectedAccounts();
                                } catch (error: any) {
                                  toast({ 
                                    title: 'Refresh Failed', 
                                    description: error.message,
                                    variant: 'destructive' 
                                  });
                                }
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnectClick(platform)}
                          style={{ backgroundColor: platform.color }}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {selectedPlatform?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlatform?.setupInstructions}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPlatform?.authMethod === 'credentials' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password / App Token</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use an app-specific password if available for better security.
                  </p>
                </div>
              </>
            )}

            {selectedPlatform?.authMethod === 'api_key' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="your_api_key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="your_api_secret"
                  />
                </div>
              </>
            )}

            {selectedPlatform?.docsUrl && (
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open(selectedPlatform.docsUrl, '_blank')}
              >
                View documentation →
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
