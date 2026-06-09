import { useState, useEffect, useCallback, useRef, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import {
    Container, Typography, Box, Button, IconButton, Alert,
    CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Breadcrumbs, Link, Checkbox, Paper, useMediaQuery, useTheme,
    Chip, Tooltip, LinearProgress, Divider, Menu, MenuItem, ListItemIcon,
    ListItemText, Grid, ButtonGroup,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import SortIcon from '@mui/icons-material/Sort';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import EditIcon from '@mui/icons-material/Edit';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';
import FolderPickerDialog from '../../components/FolderPickerDialog';

const BUCKET = 'photos';

interface StorageItem {
    name: string;
    id: string | null;
    isFolder: boolean;
    path: string;
    updatedAt?: string;
    metadata?: { name?: string; date?: string };
}

type SortMode = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

export default function ManagePhotos() {
    const { t } = useTranslation();
    const { user, loading: authLoading, session } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));
    const isSm = useMediaQuery(theme.breakpoints.down('md'));

    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState<StorageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadTotal, setUploadTotal] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');

    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDate, setNewFolderDate] = useState('');
    const [newFolderParent, setNewFolderParent] = useState('');
    const [parentPickerOpen, setParentPickerOpen] = useState(false);
    const [creatingFolder, setCreatingFolder] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sortMode, setSortMode] = useState<SortMode>('name-asc');
    const [sortAnchorEl, setSortAnchorEl] = useState<HTMLElement | null>(null);

    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<StorageItem | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renaming, setRenaming] = useState(false);

    const [folderContextMenu, setFolderContextMenu] = useState<{ anchor: HTMLElement; folder: StorageItem } | null>(null);

    const [uploadMenuAnchor, setUploadMenuAnchor] = useState<HTMLElement | null>(null);
    const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
    const [uploadTargetPath, setUploadTargetPath] = useState<string | null>(null);

    const [movePickerOpen, setMovePickerOpen] = useState(false);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    const fetchItems = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        setError(null);
        setSelectedPaths(new Set());

        try {
            const response = await fetch(
                `/.netlify/functions/list-folder?path=${encodeURIComponent(currentPath)}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to load photos');
            }

            const { items: fetchedItems } = await response.json();
            setItems(fetchedItems || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load photos');
        } finally {
            setLoading(false);
        }
    }, [currentPath, session?.access_token]);

    useEffect(() => {
        if (user) fetchItems();
    }, [user, fetchItems]);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    function getPublicUrl(path: string) {
        return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;
    }

    const sortedItems = useCallback(() => {
        const folders = items.filter((i) => i.isFolder);
        const files = items.filter((i) => !i.isFolder);

        const sortFn = (a: StorageItem, b: StorageItem) => {
            switch (sortMode) {
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'date-asc': return (a.updatedAt || '').localeCompare(b.updatedAt || '');
                case 'date-desc': return (b.updatedAt || '').localeCompare(a.updatedAt || '');
                default: return 0;
            }
        };

        return [...folders.sort(sortFn), ...files.sort(sortFn)];
    }, [items, sortMode]);

    const navigateToFolder = (folderPath: string) => {
        setCurrentPath(folderPath);
    };

    const breadcrumbParts = currentPath ? currentPath.split('/') : [];

    const toggleSelection = (path: string) => {
        setSelectedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const fileItems = items.filter((i) => !i.isFolder);
    const selectedFiles = fileItems.filter((f) => selectedPaths.has(f.path));
    const allFilesSelected = fileItems.length > 0 && fileItems.every((f) => selectedPaths.has(f.path));

    const toggleSelectAll = () => {
        if (allFilesSelected) {
            setSelectedPaths(new Set());
        } else {
            setSelectedPaths(new Set(fileItems.map((f) => f.path)));
        }
    };

    const uploadFiles = async (files: File[], destinationPath: string = currentPath) => {
        if (files.length === 0) return;

        const imageFiles = files.filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            setError('No valid image files selected. Supported formats: JPG, PNG, GIF, WebP, HEIC');
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress(0);
        setUploadTotal(imageFiles.length);
        setUploadStatusText(`Preparing ${imageFiles.length} file${imageFiles.length > 1 ? 's' : ''}...`);

        let uploaded = 0;
        let failed = 0;
        const failedNames: string[] = [];

        for (const file of imageFiles) {
            if (file.size > 10 * 1024 * 1024) {
                failed++;
                failedNames.push(`${file.name} (too large)`);
                setUploadProgress(uploaded + failed);
                continue;
            }

            setUploadStatusText(`Uploading ${file.name}...`);

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
                        folderPath: destinationPath,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    console.error(`Failed to upload ${file.name}:`, errData.error);
                    failed++;
                    failedNames.push(file.name);
                } else {
                    uploaded++;
                }
            } catch {
                failed++;
                failedNames.push(file.name);
            }

            setUploadProgress(uploaded + failed);
        }

        setUploading(false);
        setUploadProgress(0);
        setUploadTotal(0);
        setUploadStatusText('');

        if (uploaded > 0) {
            setSuccess(`Uploaded ${uploaded} photo${uploaded > 1 ? 's' : ''} successfully${failed > 0 ? ` (${failed} failed)` : ''}`);
        }
        if (failed > 0 && uploaded === 0) {
            setError(`Failed to upload: ${failedNames.join(', ')}. Images must be under 10MB.`);
        }

        fetchItems();
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            setUploadTargetPath(null);
            return;
        }
        const destination = uploadTargetPath ?? currentPath;
        setUploadTargetPath(null);
        await uploadFiles(Array.from(files), destination);
        event.target.value = '';
    };

    const handlePickUploadFolder = (path: string) => {
        setUploadTargetPath(path);
        setUploadPickerOpen(false);
        fileInputRef.current?.click();
    };

    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragOver(false);
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        dragCounter.current = 0;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await uploadFiles(files);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        setCreatingFolder(true);
        setError(null);

        try {
            const safeFolderName = newFolderName.trim().replace(/\s+/g, '_');
            const parentPath = newFolderParent;
            const folderPath = parentPath
                ? `${parentPath}/${safeFolderName}`
                : safeFolderName;

            const metadata: Record<string, string> = { name: newFolderName.trim() };
            if (newFolderDate) {
                metadata.date = newFolderDate;
            }

            const response = await fetch('/.netlify/functions/create-folder', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ folderPath, metadata }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create folder');
            }

            setSuccess(`Folder "${newFolderName.trim()}" created`);
            setFolderDialogOpen(false);
            setNewFolderName('');
            setNewFolderDate('');
            setNewFolderParent('');
            if (parentPath === currentPath) {
                fetchItems();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create folder');
        } finally {
            setCreatingFolder(false);
        }
    };

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

    const handleRenameFolder = async () => {
        if (!renameTarget || !renameValue.trim() || renaming) return;

        setRenaming(true);
        setError(null);

        try {
            const oldPrefix = renameTarget.path;
            const safeName = renameValue.trim().replace(/\s+/g, '_');
            const parentPath = currentPath;
            const newPrefix = parentPath ? `${parentPath}/${safeName}` : safeName;

            const listResponse = await fetch(
                `/.netlify/functions/list-folder?path=${encodeURIComponent(oldPrefix)}&includeAll=true`,
                { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
            );

            if (!listResponse.ok) throw new Error('Failed to list folder contents');
            const { items: folderItems } = await listResponse.json();

            const allFiles = (folderItems || []).map((f: any) => f.name);

            if (allFiles.length === 0) {
                const createResponse = await fetch('/.netlify/functions/create-folder', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ folderPath: newPrefix }),
                });
                if (!createResponse.ok) throw new Error('Failed to create new folder');
            } else {
                const moves = allFiles.map((name: string) => ({
                    from: `${oldPrefix}/${name}`,
                    to: `${newPrefix}/${name}`,
                }));

                const moveResponse = await fetch('/.netlify/functions/move-files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ moves }),
                });

                if (!moveResponse.ok) {
                    const errData = await moveResponse.json();
                    throw new Error(errData.error || 'Failed to move files');
                }
            }

            setSuccess(`Folder renamed to "${renameValue.trim()}"`);
            setRenameDialogOpen(false);
            setRenameTarget(null);
            setRenameValue('');
            fetchItems();
        } catch (err: any) {
            setError(err.message || 'Failed to rename folder');
        } finally {
            setRenaming(false);
        }
    };

    const handleDeleteFolder = async (folder: StorageItem) => {
        setError(null);

        try {
            const listResponse = await fetch(
                `/.netlify/functions/list-folder?path=${encodeURIComponent(folder.path)}&includeAll=true`,
                { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
            );

            if (!listResponse.ok) throw new Error('Failed to list folder contents');
            const { items: folderItems } = await listResponse.json();

            const filePaths = (folderItems || []).map((f: any) => `${folder.path}/${f.name}`);

            const response = await fetch('/.netlify/functions/delete-photo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paths: filePaths }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to delete folder contents');
            }

            const displayName = folder.metadata?.name || folder.name.replace(/_/g, ' ');
            setSuccess(`Folder "${displayName}" deleted`);
            fetchItems();
        } catch (err: any) {
            setError(err.message || 'Failed to delete folder');
        }
    };

    const handleMoveSelected = async (destinationPath: string) => {
        if (selectedFiles.length === 0 || moving) return;

        if (destinationPath === currentPath) {
            setMovePickerOpen(false);
            return;
        }

        setMoving(true);
        setError(null);

        try {
            const moves = selectedFiles.map((file) => ({
                from: file.path,
                to: destinationPath ? `${destinationPath}/${file.name}` : file.name,
            }));

            const response = await fetch('/.netlify/functions/move-files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ moves }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to move photos');
            }

            setSuccess(`Moved ${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}`);
            setMovePickerOpen(false);
            setSelectedPaths(new Set());
            fetchItems();
        } catch (err: any) {
            setError(err.message || 'Failed to move photos');
        } finally {
            setMoving(false);
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

    const folders = sortedItems().filter((i) => i.isFolder);
    const photos = sortedItems().filter((i) => !i.isFolder);

    return (
        <Container
            maxWidth="lg"
            sx={{ py: 4 }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
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
                <Chip
                    icon={<PhotoLibraryIcon />}
                    label={`${fileItems.length} photo${fileItems.length !== 1 ? 's' : ''}`}
                    variant="outlined"
                    size="small"
                />
            </Box>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>
            )}

            {/* Upload Progress Bar */}
            {uploading && (
                <Paper sx={{ px: 2, py: 1.5, mb: 2 }} elevation={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                        <CloudUploadIcon color="primary" fontSize="small" />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                            {uploadStatusText}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {uploadProgress}/{uploadTotal}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={uploadTotal > 0 ? (uploadProgress / uploadTotal) * 100 : 0}
                        sx={{ borderRadius: 1 }}
                    />
                </Paper>
            )}

            {/* Breadcrumbs */}
            <Paper sx={{ px: 2, py: 1.5, mb: 2 }} elevation={1}>
                <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />}>
                    <Link
                        component="button"
                        underline="hover"
                        color={currentPath ? 'inherit' : 'text.primary'}
                        onClick={() => setCurrentPath('')}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: currentPath ? 'normal' : 'bold' }}
                    >
                        <HomeIcon fontSize="small" /> Photos
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
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    fontWeight: isLast ? 'bold' : 'normal',
                                }}
                            >
                                {isLast && <FolderOpenIcon fontSize="small" />}
                                {part.replace(/_/g, ' ')}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            </Paper>

            {/* Toolbar */}
            <Paper sx={{ px: 2, py: 1.5, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }} elevation={1}>
                <ButtonGroup variant="contained" disabled={uploading} size={isXs ? 'small' : 'medium'}>
                    <Button
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Upload Photos
                    </Button>
                    <Button
                        size="small"
                        sx={{ px: 0.5 }}
                        onClick={(e) => setUploadMenuAnchor(e.currentTarget)}
                    >
                        <ArrowDropDownIcon />
                    </Button>
                </ButtonGroup>
                <Menu
                    anchorEl={uploadMenuAnchor}
                    open={Boolean(uploadMenuAnchor)}
                    onClose={() => setUploadMenuAnchor(null)}
                >
                    <MenuItem
                        onClick={() => {
                            setUploadMenuAnchor(null);
                            setUploadPickerOpen(true);
                        }}
                    >
                        <ListItemIcon><FolderIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Choose folder & upload…</ListItemText>
                    </MenuItem>
                </Menu>
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleUpload}
                />

                <Button
                    variant="outlined"
                    startIcon={<CreateNewFolderIcon />}
                    onClick={() => { setNewFolderParent(currentPath); setFolderDialogOpen(true); }}
                    size={isXs ? 'small' : 'medium'}
                >
                    New Folder
                </Button>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {fileItems.length > 0 && (
                    <Tooltip title={allFilesSelected ? 'Deselect All' : 'Select All'}>
                        <IconButton onClick={toggleSelectAll} size="small" color={allFilesSelected ? 'primary' : 'default'}>
                            {allFilesSelected ? <DeselectIcon /> : <SelectAllIcon />}
                        </IconButton>
                    </Tooltip>
                )}

                <Tooltip title="Sort">
                    <IconButton onClick={(e) => setSortAnchorEl(e.currentTarget)} size="small">
                        <SortIcon />
                    </IconButton>
                </Tooltip>

                <Box sx={{ flex: 1 }} />

                {selectedFiles.length > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<DriveFileMoveIcon />}
                        onClick={() => setMovePickerOpen(true)}
                        size={isXs ? 'small' : 'medium'}
                    >
                        Move ({selectedFiles.length})
                    </Button>
                )}

                {selectedFiles.length > 0 && (
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteDialogOpen(true)}
                        size={isXs ? 'small' : 'medium'}
                    >
                        Delete ({selectedFiles.length})
                    </Button>
                )}
            </Paper>

            {/* Sort Menu */}
            <Menu
                anchorEl={sortAnchorEl}
                open={Boolean(sortAnchorEl)}
                onClose={() => setSortAnchorEl(null)}
            >
                <MenuItem onClick={() => { setSortMode('name-asc'); setSortAnchorEl(null); }} selected={sortMode === 'name-asc'}>
                    <ListItemIcon><SortByAlphaIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Name (A-Z)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setSortMode('name-desc'); setSortAnchorEl(null); }} selected={sortMode === 'name-desc'}>
                    <ListItemIcon><SortByAlphaIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Name (Z-A)</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { setSortMode('date-desc'); setSortAnchorEl(null); }} selected={sortMode === 'date-desc'}>
                    <ListItemIcon><CalendarTodayIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Newest First</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setSortMode('date-asc'); setSortAnchorEl(null); }} selected={sortMode === 'date-asc'}>
                    <ListItemIcon><CalendarTodayIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Oldest First</ListItemText>
                </MenuItem>
            </Menu>

            {/* Content */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : items.length === 0 && !isDragOver ? (
                /* Empty State / Drop Zone */
                <Paper
                    sx={{
                        py: 8,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'action.selected',
                        },
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    elevation={0}
                >
                    <CloudUploadIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        This folder is empty
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                        Drag & drop photos here, or click to browse
                    </Typography>
                    <Button variant="outlined" startIcon={<UploadIcon />}>
                        Browse Files
                    </Button>
                </Paper>
            ) : (
                <Box>
                    {/* Drag Overlay */}
                    {isDragOver && (
                        <Paper
                            sx={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 9999,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)',
                            }}
                            elevation={0}
                        >
                            <CloudUploadIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h5" color="white" fontWeight="bold">
                                Drop photos here
                            </Typography>
                            <Typography variant="body1" color="grey.400">
                                {currentPath
                                    ? `Upload to: ${currentPath.replace(/_/g, ' ')}`
                                    : 'Upload to root folder'}
                            </Typography>
                        </Paper>
                    )}

                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
                                Folders ({folders.length})
                            </Typography>
                            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                                {folders.map((folder) => (
                                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={folder.path}>
                                        <Paper
                                            sx={{
                                                p: 2,
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 2,
                                                transition: 'all 0.15s',
                                                position: 'relative',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    backgroundColor: 'action.hover',
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: 2,
                                                },
                                            }}
                                            elevation={0}
                                            onClick={() => navigateToFolder(folder.path)}
                                        >
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    opacity: 0.5,
                                                    '&:hover': { opacity: 1 },
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFolderContextMenu({ anchor: e.currentTarget, folder });
                                                }}
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                            <FolderIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                                            <Typography
                                                variant="body2"
                                                fontWeight={500}
                                                noWrap
                                                title={folder.metadata?.name || folder.name.replace(/_/g, ' ')}
                                            >
                                                {folder.metadata?.name || folder.name.replace(/_/g, ' ')}
                                            </Typography>
                                            {folder.metadata?.date && (
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {new Date(folder.metadata.date + 'T00:00:00').toLocaleDateString()}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Photos Section */}
                    {photos.length > 0 && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 1 }}>
                                <Typography variant="overline" color="text.secondary">
                                    Photos ({photos.length})
                                </Typography>
                                {selectedFiles.length > 0 && (
                                    <Typography variant="caption" color="primary">
                                        {selectedFiles.length} selected
                                    </Typography>
                                )}
                            </Box>
                            <Grid container spacing={1}>
                                {photos.map((photo) => {
                                    const isSelected = selectedPaths.has(photo.path);
                                    return (
                                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={photo.path}>
                                            <Paper
                                                sx={{
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    borderRadius: 2,
                                                    border: '2px solid',
                                                    borderColor: isSelected ? 'primary.main' : 'transparent',
                                                    transition: 'all 0.15s',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        boxShadow: 3,
                                                        transform: 'translateY(-1px)',
                                                        '& .photo-overlay': { opacity: 1 },
                                                    },
                                                }}
                                                elevation={isSelected ? 4 : 1}
                                                onClick={() => toggleSelection(photo.path)}
                                            >
                                                <Box
                                                    sx={{
                                                        position: 'relative',
                                                        paddingTop: '100%',
                                                        backgroundColor: 'grey.100',
                                                    }}
                                                >
                                                    <img
                                                        src={getPublicUrl(photo.path)}
                                                        alt={photo.name}
                                                        loading="lazy"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        }}
                                                    />
                                                    {/* Hover overlay */}
                                                    <Box
                                                        className="photo-overlay"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%)',
                                                            opacity: isSelected ? 1 : 0,
                                                            transition: 'opacity 0.15s',
                                                        }}
                                                    />
                                                    {/* Checkbox */}
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(photo.path)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 4,
                                                            left: 4,
                                                            color: 'white',
                                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                                            borderRadius: '6px',
                                                            p: 0.25,
                                                            '&.Mui-checked': { color: 'primary.main', backgroundColor: 'rgba(255,255,255,0.9)' },
                                                        }}
                                                        size="small"
                                                    />
                                                </Box>
                                                {/* Filename */}
                                                <Box sx={{ px: 1, py: 0.75 }}>
                                                    <Typography
                                                        variant="caption"
                                                        noWrap
                                                        color="text.secondary"
                                                        title={photo.name}
                                                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                                    >
                                                        <ImageIcon sx={{ fontSize: 14 }} />
                                                        {photo.name}
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    )}

                    {/* Drop zone hint when folder has content */}
                    {!isDragOver && (
                        <Paper
                            sx={{
                                mt: 3,
                                py: 3,
                                textAlign: 'center',
                                border: '2px dashed',
                                borderColor: 'divider',
                                borderRadius: 2,
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: 'action.hover',
                                },
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            elevation={0}
                        >
                            <CloudUploadIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="text.disabled">
                                Drag & drop photos here, or click to browse
                            </Typography>
                        </Paper>
                    )}
                </Box>
            )}

            {/* Folder Context Menu */}
            <Menu
                anchorEl={folderContextMenu?.anchor}
                open={Boolean(folderContextMenu)}
                onClose={() => setFolderContextMenu(null)}
            >
                <MenuItem onClick={() => {
                    if (folderContextMenu) {
                        navigateToFolder(folderContextMenu.folder.path);
                    }
                    setFolderContextMenu(null);
                }}>
                    <ListItemIcon><FolderOpenIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Open</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    if (folderContextMenu) {
                        setRenameTarget(folderContextMenu.folder);
                        setRenameValue(folderContextMenu.folder.metadata?.name || folderContextMenu.folder.name.replace(/_/g, ' '));
                        setRenameDialogOpen(true);
                    }
                    setFolderContextMenu(null);
                }}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Rename</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => {
                    if (folderContextMenu) {
                        handleDeleteFolder(folderContextMenu.folder);
                    }
                    setFolderContextMenu(null);
                }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Delete Folder</ListItemText>
                </MenuItem>
            </Menu>

            {/* New Folder Dialog */}
            <Dialog open={folderDialogOpen} onClose={() => !creatingFolder && setFolderDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreateNewFolderIcon color="primary" />
                    Create New Folder
                </DialogTitle>
                <DialogContent>
                    {/* Parent folder selector */}
                    <Box sx={{ mt: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderOpenIcon fontSize="small" color="primary" />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Create inside:
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {newFolderParent ? newFolderParent.replace(/_/g, ' ').replace(/\//g, ' / ') : 'Photos (root)'}
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setParentPickerOpen(true)}
                            disabled={creatingFolder}
                        >
                            Browse
                        </Button>
                    </Box>

                    <TextField
                        autoFocus
                        fullWidth
                        label="Folder Name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        margin="normal"
                        placeholder="e.g., Installation, Ladies Night"
                        disabled={creatingFolder}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <TextField
                        fullWidth
                        label="Date (optional)"
                        type="date"
                        value={newFolderDate}
                        onChange={(e) => setNewFolderDate(e.target.value)}
                        margin="normal"
                        disabled={creatingFolder}
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                        helperText="Stored as metadata for ordering — not part of the folder name"
                    />
                    {newFolderName.trim() && (
                        <Box sx={{ mt: 1, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Full path:
                            </Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FolderIcon fontSize="small" color="primary" />
                                {newFolderParent ? `${newFolderParent.replace(/_/g, ' ')} / ` : ''}
                                {newFolderName.trim()}
                            </Typography>
                            {newFolderDate && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    <CalendarTodayIcon sx={{ fontSize: 14 }} />
                                    Date: {newFolderDate}
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setFolderDialogOpen(false); setNewFolderName(''); setNewFolderDate(''); setNewFolderParent(''); }} disabled={creatingFolder}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateFolder}
                        variant="contained"
                        disabled={creatingFolder || !newFolderName.trim()}
                        startIcon={creatingFolder ? <CircularProgress size={16} /> : <CreateNewFolderIcon />}
                    >
                        {creatingFolder ? 'Creating...' : 'Create Folder'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Folder Picker: choose parent for new folder */}
            <FolderPickerDialog
                open={parentPickerOpen}
                onClose={() => setParentPickerOpen(false)}
                onSelect={(path) => {
                    setNewFolderParent(path);
                    setParentPickerOpen(false);
                }}
                title="Choose Parent Folder"
                confirmLabel="Select This Folder"
                accessToken={session?.access_token}
            />

            {/* Rename Folder Dialog */}
            <Dialog open={renameDialogOpen} onClose={() => !renaming && setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon color="primary" />
                    Rename Folder
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="New Name"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        margin="normal"
                        disabled={renaming}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setRenameDialogOpen(false); setRenameTarget(null); setRenameValue(''); }} disabled={renaming}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRenameFolder}
                        variant="contained"
                        disabled={renaming || !renameValue.trim()}
                        startIcon={renaming ? <CircularProgress size={16} /> : null}
                    >
                        {renaming ? 'Renaming...' : 'Rename'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                    <DeleteIcon />
                    Delete Photos
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''}?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This action cannot be undone.
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
                        {deleting ? 'Deleting...' : `Delete ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Folder Picker: choose upload destination */}
            <FolderPickerDialog
                open={uploadPickerOpen}
                onClose={() => setUploadPickerOpen(false)}
                onSelect={handlePickUploadFolder}
                title="Choose Upload Destination"
                confirmLabel="Upload Here"
                accessToken={session?.access_token}
            />

            {/* Folder Picker: choose move destination */}
            <FolderPickerDialog
                open={movePickerOpen}
                onClose={() => !moving && setMovePickerOpen(false)}
                onSelect={handleMoveSelected}
                title={`Move ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''} To…`}
                confirmLabel={moving ? 'Moving…' : 'Move Here'}
                accessToken={session?.access_token}
            />
        </Container>
    );
}
