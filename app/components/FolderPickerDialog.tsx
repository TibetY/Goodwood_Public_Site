import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Breadcrumbs, Link, List, ListItemButton, ListItemIcon, ListItemText,
    CircularProgress, Box, Typography, Alert, TextField,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import AddIcon from '@mui/icons-material/Add';

interface FolderPickerDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    title: string;
    confirmLabel?: string;
    accessToken?: string;
}

interface FolderItem {
    name: string;
    path: string;
    isFolder: boolean;
    metadata?: { name?: string; date?: string };
}

export default function FolderPickerDialog({
    open,
    onClose,
    onSelect,
    title,
    confirmLabel = 'Select This Folder',
    accessToken,
}: FolderPickerDialogProps) {
    const [pickerPath, setPickerPath] = useState('');
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDate, setNewFolderDate] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (open) {
            setPickerPath('');
            setShowNewFolder(false);
            setNewFolderName('');
            setNewFolderDate('');
            setError(null);
        }
    }, [open]);

    const fetchFolders = async (path: string) => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/.netlify/functions/list-folder?path=${encodeURIComponent(path)}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to load folders');
            }

            const { items } = await response.json();
            setFolders((items || []).filter((item: FolderItem) => item.isFolder));
        } catch (err: any) {
            setError(err.message || 'Failed to load folders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !accessToken) return;
        fetchFolders(pickerPath);
    }, [open, pickerPath, accessToken]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || creating || !accessToken) return;

        setCreating(true);
        setError(null);

        try {
            const safeName = newFolderName.trim().replace(/\s+/g, '_');
            const folderPath = pickerPath ? `${pickerPath}/${safeName}` : safeName;

            const metadata: Record<string, string> = { name: newFolderName.trim() };
            if (newFolderDate) {
                metadata.date = newFolderDate;
            }

            const response = await fetch('/.netlify/functions/create-folder', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ folderPath, metadata }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create folder');
            }

            setNewFolderName('');
            setNewFolderDate('');
            setShowNewFolder(false);
            fetchFolders(pickerPath);
        } catch (err: any) {
            setError(err.message || 'Failed to create folder');
        } finally {
            setCreating(false);
        }
    };

    const breadcrumbParts = pickerPath ? pickerPath.split('/') : [];

    const getDisplayName = (folder: FolderItem) =>
        folder.metadata?.name || folder.name.replace(/_/g, ' ');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderOpenIcon color="primary" />
                {title}
            </DialogTitle>
            <DialogContent>
                <Breadcrumbs separator={<ChevronRightIcon fontSize="small" />} sx={{ mb: 1 }}>
                    <Link
                        component="button"
                        underline="hover"
                        color={pickerPath ? 'inherit' : 'text.primary'}
                        onClick={() => setPickerPath('')}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: pickerPath ? 'normal' : 'bold' }}
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
                                onClick={() => setPickerPath(path)}
                                sx={{ fontWeight: isLast ? 'bold' : 'normal' }}
                            >
                                {part.replace(/_/g, ' ')}
                            </Link>
                        );
                    })}
                </Breadcrumbs>

                {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}

                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : folders.length === 0 && !showNewFolder ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No sub-folders here
                    </Typography>
                ) : (
                    <List dense sx={{ maxHeight: 280, overflowY: 'auto' }}>
                        {folders.map((folder) => (
                            <ListItemButton key={folder.path} onClick={() => setPickerPath(folder.path)}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <FolderIcon color="primary" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={getDisplayName(folder)}
                                    secondary={folder.metadata?.date || undefined}
                                />
                                <ChevronRightIcon fontSize="small" color="action" />
                            </ListItemButton>
                        ))}
                    </List>
                )}

                {accessToken && (
                    <Box sx={{ mt: 1 }}>
                        {!showNewFolder ? (
                            <Button
                                size="small"
                                startIcon={<CreateNewFolderIcon />}
                                onClick={() => setShowNewFolder(true)}
                                sx={{ textTransform: 'none' }}
                            >
                                Create new folder here
                            </Button>
                        ) : (
                            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <TextField
                                    autoFocus
                                    fullWidth
                                    size="small"
                                    label="Folder Name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="e.g., Installation, Ladies Night"
                                    disabled={creating}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Date (optional)"
                                    type="date"
                                    value={newFolderDate}
                                    onChange={(e) => setNewFolderDate(e.target.value)}
                                    disabled={creating}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{ mt: 1 }}
                                />
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                    <Button
                                        size="small"
                                        onClick={() => { setShowNewFolder(false); setNewFolderName(''); setNewFolderDate(''); }}
                                        disabled={creating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={handleCreateFolder}
                                        disabled={creating || !newFolderName.trim()}
                                        startIcon={creating ? <CircularProgress size={14} /> : <AddIcon />}
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Selected location:
                    </Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <HomeIcon fontSize="small" color="primary" />
                        {pickerPath ? pickerPath.replace(/_/g, ' ').replace(/\//g, ' / ') : 'Photos (root)'}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={() => onSelect(pickerPath)}>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
