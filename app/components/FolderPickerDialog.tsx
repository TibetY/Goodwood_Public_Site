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
import { supabase } from '../utils/supabase';

interface FolderPickerDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    bucket?: string;
    title: string;
    confirmLabel?: string;
    accessToken?: string;
}

export default function FolderPickerDialog({
    open,
    onClose,
    onSelect,
    bucket = 'photos',
    title,
    confirmLabel = 'Select This Folder',
    accessToken,
}: FolderPickerDialogProps) {
    const [pickerPath, setPickerPath] = useState('');
    const [folders, setFolders] = useState<string[]>([]);
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

    const fetchFolders = (path: string) => {
        setLoading(true);
        setError(null);

        supabase.storage
            .from(bucket)
            .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
            .then(({ data, error: listError }) => {
                if (listError) throw listError;

                const folderNames = (data || [])
                    .filter((item) => item.id === null && item.name !== '.emptyFolderPlaceholder')
                    .map((item) => item.name);

                setFolders(folderNames);
            })
            .catch((err: any) => {
                setError(err.message || 'Failed to load folders');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        if (!open) return;
        fetchFolders(pickerPath);
    }, [open, pickerPath, bucket]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || creating) return;

        setCreating(true);
        setError(null);

        try {
            let folderLabel = newFolderName.trim();
            if (newFolderDate) {
                folderLabel = `${folderLabel} (${newFolderDate})`;
            }
            const safeName = folderLabel.replace(/\s+/g, '_');
            const folderPath = pickerPath ? `${pickerPath}/${safeName}` : safeName;

            const response = await fetch('/.netlify/functions/create-folder', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ folderPath }),
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderOpenIcon color="primary" />
                {title}
            </DialogTitle>
            <DialogContent>
                {/* Breadcrumbs */}
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

                {/* Folder list */}
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
                        {folders.map((name) => {
                            const path = pickerPath ? `${pickerPath}/${name}` : name;
                            return (
                                <ListItemButton key={path} onClick={() => setPickerPath(path)}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <FolderIcon color="primary" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={name.replace(/_/g, ' ')} />
                                    <ChevronRightIcon fontSize="small" color="action" />
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}

                {/* Inline create folder */}
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

                {/* Selected path preview */}
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
