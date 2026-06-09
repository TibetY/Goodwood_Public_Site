import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Breadcrumbs, Link, List, ListItemButton, ListItemIcon, ListItemText,
    CircularProgress, Box, Typography, Alert,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { supabase } from '../utils/supabase';

interface FolderPickerDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    bucket?: string;
    title: string;
    confirmLabel?: string;
}

export default function FolderPickerDialog({
    open,
    onClose,
    onSelect,
    bucket = 'photos',
    title,
    confirmLabel = 'Select This Folder',
}: FolderPickerDialogProps) {
    const [pickerPath, setPickerPath] = useState('');
    const [folders, setFolders] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setPickerPath('');
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        supabase.storage
            .from(bucket)
            .list(pickerPath, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
            .then(({ data, error: listError }) => {
                if (cancelled) return;
                if (listError) throw listError;

                const folderNames = (data || [])
                    .filter((item) => item.id === null && item.name !== '.emptyFolderPlaceholder')
                    .map((item) => item.name);

                setFolders(folderNames);
            })
            .catch((err: any) => {
                if (!cancelled) setError(err.message || 'Failed to load folders');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [open, pickerPath, bucket]);

    const breadcrumbParts = pickerPath ? pickerPath.split('/') : [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreateNewFolderIcon color="primary" />
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

                {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : folders.length === 0 ? (
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
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}

                <Box sx={{ mt: 1, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
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
