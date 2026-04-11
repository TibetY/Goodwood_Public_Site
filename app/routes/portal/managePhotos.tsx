import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
    Container, Typography, Box, Button, IconButton, Alert,
    CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Breadcrumbs, Link, ImageList, ImageListItem,
    ImageListItemBar, Checkbox, Paper, useMediaQuery, useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';

const BUCKET = 'photos';
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic)$/i;

interface StorageItem {
    name: string;
    id: string | null;
    isFolder: boolean;
    path: string;
}

export default function ManagePhotos() {
    const { t } = useTranslation();
    const { user, loading: authLoading, session } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));
    const cols = isXs ? 2 : 4;

    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState<StorageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Selection state
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // New folder dialog
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSelectedPaths(new Set());

        try {
            const { data, error: listError } = await supabase.storage
                .from(BUCKET)
                .list(currentPath, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

            if (listError) throw listError;

            const storageItems: StorageItem[] = (data || [])
                .filter((item) => {
                    // Filter out the .emptyFolderPlaceholder files from display
                    if (item.name === '.emptyFolderPlaceholder') return false;
                    // Show folders and image files
                    return item.id === null || IMAGE_EXTENSIONS.test(item.name);
                })
                .map((item) => ({
                    name: item.name,
                    id: item.id,
                    isFolder: item.id === null,
                    path: currentPath ? `${currentPath}/${item.name}` : item.name,
                }));

            setItems(storageItems);
        } catch (err: any) {
            setError(err.message || 'Failed to load photos');
        } finally {
            setLoading(false);
        }
    }, [currentPath]);

    useEffect(() => {
        if (user) fetchItems();
    }, [user, fetchItems]);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    function getPublicUrl(path: string) {
        return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;
    }

    // Navigation
    const navigateToFolder = (folderPath: string) => {
        setCurrentPath(folderPath);
    };

    const breadcrumbParts = currentPath ? currentPath.split('/') : [];

    // Selection
    const toggleSelection = (path: string) => {
        setSelectedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const selectedFiles = items.filter((i) => !i.isFolder && selectedPaths.has(i.path));

    // Upload handler
    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);
        setUploadProgress(`Uploading 0/${files.length}...`);

        let uploaded = 0;
        let failed = 0;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) {
                failed++;
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                failed++;
                continue;
            }

            try {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const response = await fetch('/.netlify/functions/upload-photo', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: base64,
                        fileType: file.type,
                        folderPath: currentPath,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    console.error(`Failed to upload ${file.name}:`, errData.error);
                    failed++;
                } else {
                    uploaded++;
                }
            } catch {
                failed++;
            }

            setUploadProgress(`Uploading ${uploaded + failed}/${files.length}...`);
        }

        setUploading(false);
        setUploadProgress('');

        if (uploaded > 0) {
            setSuccess(`Uploaded ${uploaded} photo${uploaded > 1 ? 's' : ''} successfully${failed > 0 ? ` (${failed} failed)` : ''}`);
        } else if (failed > 0) {
            setError(`Failed to upload ${failed} file${failed > 1 ? 's' : ''}. Images must be under 10MB.`);
        }

        // Reset the input so the same files can be re-selected
        event.target.value = '';
        fetchItems();
    };

    // Create folder
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        setCreatingFolder(true);
        setError(null);

        try {
            // Supabase Storage doesn't have "create folder" — upload a placeholder
            const folderPath = currentPath
                ? `${currentPath}/${newFolderName.trim()}`
                : newFolderName.trim();

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(`${folderPath}/.emptyFolderPlaceholder`, new Uint8Array(0), {
                    contentType: 'application/octet-stream',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            setSuccess(`Folder "${newFolderName.trim()}" created`);
            setFolderDialogOpen(false);
            setNewFolderName('');
            fetchItems();
        } catch (err: any) {
            setError(err.message || 'Failed to create folder');
        } finally {
            setCreatingFolder(false);
        }
    };

    // Delete selected
    const handleDeleteSelected = async () => {
        if (selectedFiles.length === 0) return;

        setDeleting(true);
        setError(null);

        try {
            const response = await fetch('/.netlify/functions/delete-photo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paths: selectedFiles.map((f) => f.path) }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to delete photos');
            }

            setSuccess(`Deleted ${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}`);
            setDeleteDialogOpen(false);
            setSelectedPaths(new Set());
            fetchItems();
        } catch (err: any) {
            setError(err.message || 'Failed to delete photos');
        } finally {
            setDeleting(false);
        }
    };

    if (authLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>{t('common.loading')}</Typography>
            </Container>
        );
    }

    if (!user) return null;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/portal')} color="primary">
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        {t('portal.managePhotos.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('portal.managePhotos.description')}
                    </Typography>
                </Box>
            </Box>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>
            )}

            {/* Breadcrumbs */}
            <Paper sx={{ px: 2, py: 1.5, mb: 2 }} elevation={1}>
                <Breadcrumbs>
                    <Link
                        component="button"
                        underline="hover"
                        color={currentPath ? 'inherit' : 'text.primary'}
                        onClick={() => setCurrentPath('')}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                        <FolderIcon fontSize="small" /> Photos
                    </Link>
                    {breadcrumbParts.map((part, idx) => {
                        const path = breadcrumbParts.slice(0, idx + 1).join('/');
                        const isLast = idx === breadcrumbParts.length - 1;
                        return (
                            <Link
                                key={path}
                                component="button"
                                underline="hover"
                                color={isLast ? 'text.primary' : 'inherit'}
                                onClick={() => setCurrentPath(path)}
                            >
                                {part.replace(/_/g, ' ')}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            </Paper>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                    component="label"
                    disabled={uploading}
                >
                    {uploading ? uploadProgress : 'Upload Photos'}
                    <input type="file" hidden multiple accept="image/*" onChange={handleUpload} />
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<CreateNewFolderIcon />}
                    onClick={() => setFolderDialogOpen(true)}
                >
                    New Folder
                </Button>
                {selectedFiles.length > 0 && (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        Delete ({selectedFiles.length})
                    </Button>
                )}
            </Box>

            {/* Content */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : items.length === 0 ? (
                <Typography textAlign="center" color="text.secondary" sx={{ py: 8 }}>
                    This folder is empty. Upload photos or create a subfolder.
                </Typography>
            ) : (
                <ImageList cols={cols} gap={8} sx={{ mt: 0 }}>
                    {/* Folders first */}
                    {items.filter((i) => i.isFolder).map((folder) => (
                        <ImageListItem
                            key={folder.path}
                            onClick={() => navigateToFolder(folder.path)}
                            sx={{
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                '&:hover': { borderColor: 'primary.main' },
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 150,
                                    backgroundColor: 'action.hover',
                                }}
                            >
                                <FolderIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                            </Box>
                            <ImageListItemBar
                                title={folder.name.replace(/_/g, ' ')}
                                sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.85rem' } }}
                            />
                        </ImageListItem>
                    ))}

                    {/* Images */}
                    {items.filter((i) => !i.isFolder).map((photo) => (
                        <ImageListItem
                            key={photo.path}
                            sx={{
                                cursor: 'pointer',
                                border: '2px solid',
                                borderColor: selectedPaths.has(photo.path) ? 'primary.main' : 'transparent',
                                borderRadius: 1,
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            <img
                                src={getPublicUrl(photo.path)}
                                alt={photo.name}
                                loading="lazy"
                                style={{ display: 'block', width: '100%', height: 180, objectFit: 'cover' }}
                            />
                            <Checkbox
                                checked={selectedPaths.has(photo.path)}
                                onChange={() => toggleSelection(photo.path)}
                                sx={{
                                    position: 'absolute',
                                    top: 4,
                                    left: 4,
                                    color: 'white',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    borderRadius: '4px',
                                    p: 0.25,
                                    '&.Mui-checked': { color: 'primary.main' },
                                }}
                                size="small"
                            />
                            <ImageListItemBar
                                title={photo.name}
                                sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.75rem' } }}
                            />
                        </ImageListItem>
                    ))}
                </ImageList>
            )}

            {/* New Folder Dialog */}
            <Dialog open={folderDialogOpen} onClose={() => !creatingFolder && setFolderDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Folder Name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        margin="normal"
                        helperText="e.g., 2025_2026 or Installation"
                        disabled={creatingFolder}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFolderDialogOpen(false)} disabled={creatingFolder}>Cancel</Button>
                    <Button
                        onClick={handleCreateFolder}
                        variant="contained"
                        disabled={creatingFolder || !newFolderName.trim()}
                        startIcon={creatingFolder ? <CircularProgress size={16} /> : null}
                    >
                        {creatingFolder ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Photos</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
                    <Button
                        onClick={handleDeleteSelected}
                        variant="contained"
                        color="error"
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
