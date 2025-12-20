'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Image as ImageIcon,
  Trash2,
  Search,
  Filter,
  HardDrive,
  FolderOpen,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  Download,
} from 'lucide-react';
import Image from 'next/image';

interface MediaFile {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  uploadedAt: Date;
  type: 'mock' | 'upload' | 'other';
}

export function ApparelMediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const { toast } = useToast();

  // Storage quota (you can make this configurable)
  const STORAGE_QUOTA_MB = 500;

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchTerm, typeFilter]);

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const mediaFiles: MediaFile[] = [];
      let totalSize = 0;

      // List all files in apparel-items folder
      const apparelRef = ref(storage, 'apparel-items');
      const apparelList = await listAll(apparelRef);

      for (const itemRef of apparelList.prefixes) {
        const fileList = await listAll(itemRef);
        
        for (const fileRef of fileList.items) {
          try {
            const [url, metadata] = await Promise.all([
              getDownloadURL(fileRef),
              getMetadata(fileRef)
            ]);

            const file: MediaFile = {
              id: fileRef.fullPath,
              name: fileRef.name,
              url,
              path: fileRef.fullPath,
              size: metadata.size,
              uploadedAt: new Date(metadata.timeCreated),
              type: 'mock',
            };

            mediaFiles.push(file);
            totalSize += metadata.size;
          } catch (error) {
            console.error(`Error fetching file ${fileRef.name}:`, error);
          }
        }
      }

      // List files in creator-uploads folder
      const uploadsRef = ref(storage, 'creator-uploads');
      try {
        const uploadsList = await listAll(uploadsRef);
        
        for (const fileRef of uploadsList.items) {
          try {
            const [url, metadata] = await Promise.all([
              getDownloadURL(fileRef),
              getMetadata(fileRef)
            ]);

            const file: MediaFile = {
              id: fileRef.fullPath,
              name: fileRef.name,
              url,
              path: fileRef.fullPath,
              size: metadata.size,
              uploadedAt: new Date(metadata.timeCreated),
              type: 'upload',
            };

            mediaFiles.push(file);
            totalSize += metadata.size;
          } catch (error) {
            console.error(`Error fetching file ${fileRef.name}:`, error);
          }
        }
      } catch (error) {
        // creator-uploads folder might not exist yet
        console.log('No creator uploads folder found');
      }

      // Sort by upload date (newest first)
      mediaFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      setFiles(mediaFiles);
      setStorageUsed(totalSize / (1024 * 1024)); // Convert to MB
    } catch (error) {
      console.error('Error fetching media files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media library',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = files;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((f) => f.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(term));
    }

    setFilteredFiles(filtered);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePreview = (file: MediaFile) => {
    setPreviewFile(file);
    setPreviewDialogOpen(true);
  };

  const handleDownload = async (file: MediaFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download Started',
        description: `Downloading ${file.name}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map((f) => f.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select files to delete',
        variant: 'destructive',
      });
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = selectedFiles.map(async (filePath) => {
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      });

      await Promise.all(deletePromises);

      toast({
        title: 'Files Deleted',
        description: `Successfully deleted ${selectedFiles.length} file(s)`,
      });

      setSelectedFiles([]);
      setDeleteDialogOpen(false);
      await fetchMediaFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete some files',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const storagePercentage = (storageUsed / STORAGE_QUOTA_MB) * 100;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Files</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{files.length}</p>
            </div>
            <FolderOpen className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Mock Images</p>
              <p className="text-2xl font-bold text-[#3D2E17]">
                {files.filter((f) => f.type === 'mock').length}
              </p>
            </div>
            <ImageIcon className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 dark:bg-orange-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">User Uploads</p>
              <p className="text-2xl font-bold text-[#3D2E17]">
                {files.filter((f) => f.type === 'upload').length}
              </p>
            </div>
            <ImageIcon className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-[#006B3E]" />
              <span className="font-bold text-[#3D2E17]">Storage Usage</span>
            </div>
            <span className="text-sm font-semibold text-[#5D4E37]">
              {storageUsed.toFixed(2)} MB / {STORAGE_QUOTA_MB} MB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                storagePercentage > 90
                  ? 'bg-red-600'
                  : storagePercentage > 70
                  ? 'bg-orange-500'
                  : 'bg-[#006B3E]'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          {storagePercentage > 90 && (
            <Alert variant="destructive">
              <AlertDescription>
                Storage is running low. Consider deleting unused files.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="mock">Mock Images</SelectItem>
              <SelectItem value="upload">User Uploads</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedFiles.length === 0}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedFiles.length})
          </Button>
        </div>
      </Card>

      {/* Select All */}
      {filteredFiles.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-semibold text-[#5D4E37]">
            Select All ({filteredFiles.length})
          </span>
        </div>
      )}

      {/* Media Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#006B3E]" />
            <p className="text-[#5D4E37] font-semibold">Loading media library...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-[#3D2E17] text-lg mb-2">No Files Found</h3>
            <p className="text-[#5D4E37]">Upload some apparel mock images to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`relative group rounded-lg border-2 overflow-hidden transition-all hover:scale-105 hover:shadow-lg ${
                  selectedFiles.includes(file.id)
                    ? 'border-[#006B3E] ring-2 ring-[#006B3E]'
                    : 'border-border hover:border-[#006B3E]'
                }`}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedFiles.includes(file.id)}
                    onCheckedChange={() => toggleFileSelection(file.id)}
                    className="bg-white/90 backdrop-blur"
                  />
                </div>

                {/* Type Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <Badge
                    className={`text-xs font-bold ${
                      file.type === 'mock'
                        ? 'bg-purple-600 text-white'
                        : 'bg-orange-600 text-white'
                    }`}
                  >
                    {file.type === 'mock' ? 'Mock' : 'Upload'}
                  </Badge>
                </div>

                {/* Image */}
                <div className="relative aspect-square bg-muted">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handlePreview(file)}
                      className="rounded-full"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleDownload(file)}
                      className="rounded-full"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* File Info */}
                <div className="p-2 bg-background">
                  <p className="text-xs font-semibold text-[#3D2E17] truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[#3D2E17]">
              {previewFile?.name}
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <p>Size: {previewFile && formatFileSize(previewFile.size)}</p>
              <p>Uploaded: {previewFile?.uploadedAt.toLocaleDateString()}</p>
              <p>Type: {previewFile?.type === 'mock' ? 'Mock Image' : 'User Upload'}</p>
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
            {previewFile && (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => previewFile && handleDownload(previewFile)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[#3D2E17]">
              Delete Selected Files?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedFiles.length} file(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
