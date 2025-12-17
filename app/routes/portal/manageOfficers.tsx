import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
    Container,
    Typography,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Tooltip,
    Avatar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';

interface Officer {
    id?: string;
    title: string;
    name: string;
    image?: string;
    position: number;
}

export default function ManageOfficers() {
    const { t } = useTranslation();
    const { user, loading: authLoading, session } = useAuth();
    const navigate = useNavigate();
    const [officers, setOfficers] = useState<Officer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Add/Edit officer dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
    const [formData, setFormData] = useState<Officer>({
        title: '',
        name: '',
        image: '',
        position: 0
    });
    const [saving, setSaving] = useState(false);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [officerToDelete, setOfficerToDelete] = useState<Officer | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user && session) {
            fetchOfficers();
        }
    }, [user, session]);

    const fetchOfficers = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/.netlify/functions/list-officers', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch officers');
            }

            const data = await response.json();
            setOfficers(data.officers);
        } catch (err: any) {
            setError(err.message || 'Failed to load officers');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (officer?: Officer) => {
        if (officer) {
            setEditingOfficer(officer);
            setFormData({
                id: officer.id,
                title: officer.title,
                name: officer.name,
                image: officer.image || '',
                position: officer.position
            });
        } else {
            setEditingOfficer(null);
            const maxPosition = officers.length > 0
                ? Math.max(...officers.map(o => o.position)) + 1
                : 1;
            setFormData({
                title: '',
                name: '',
                image: '',
                position: maxPosition
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingOfficer(null);
        setFormData({
            title: '',
            name: '',
            image: '',
            position: 0
        });
    };

    const handleSaveOfficer = async () => {
        if (!formData.title || !formData.name) {
            setError('Title and name are required');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/upsert-officer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save officer');
            }

            setSuccess(editingOfficer ? 'Officer updated successfully' : 'Officer added successfully');
            handleCloseDialog();
            fetchOfficers();
        } catch (err: any) {
            setError(err.message || 'Failed to save officer');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOfficer = async () => {
        if (!officerToDelete) return;

        setDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/delete-officer', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    officerId: officerToDelete.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete officer');
            }

            setSuccess(`Officer ${officerToDelete.name} deleted successfully`);
            setDeleteDialogOpen(false);
            setOfficerToDelete(null);
            fetchOfficers();
        } catch (err: any) {
            setError(err.message || 'Failed to delete officer');
        } finally {
            setDeleting(false);
        }
    };

    const openDeleteDialog = (officer: Officer) => {
        setOfficerToDelete(officer);
        setDeleteDialogOpen(true);
    };

    const getInitials = (name: string) => {
        const cleanName = name.replace(/^(V\.W\.|W\.|R\.W\.)?\s*Bro\.\s*/i, '');
        if (cleanName === 'TBA') return 'TBA';
        const parts = cleanName.split(' ');
        return parts.map(part => part[0]).join('').toUpperCase();
    };

    if (authLoading || loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Loading...</Typography>
            </Container>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/portal')} color="primary">
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        Manage Officers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View and manage lodge officers
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        backgroundColor: '#13294b',
                        '&:hover': {
                            backgroundColor: '#1c3f72ff'
                        }
                    }}
                >
                    Add Officer
                </Button>
            </Box>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Officers Table */}
            <TableContainer component={Paper} elevation={2}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Position</strong></TableCell>
                            <TableCell><strong>Title</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Image</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {officers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        No officers found. Click "Add Officer" to add officers.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            officers.map((officer) => (
                                <TableRow key={officer.id} hover>
                                    <TableCell>{officer.position}</TableCell>
                                    <TableCell>{t(officer.title)}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            {officer.image ? (
                                                <Avatar src={officer.image} alt={officer.name} />
                                            ) : (
                                                <Avatar>{getInitials(officer.name)}</Avatar>
                                            )}
                                            {officer.name}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {officer.image ? (
                                            <Typography variant="caption" color="text.secondary">
                                                {officer.image.substring(0, 30)}...
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                No image
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit Officer">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenDialog(officer)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Officer">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => openDeleteDialog(officer)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Officer Dialog */}
            <Dialog open={dialogOpen} onClose={() => !saving && handleCloseDialog()} maxWidth="sm" fullWidth>
                <DialogTitle>{editingOfficer ? 'Edit Officer' : 'Add New Officer'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Position (Order)"
                            type="number"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                            required
                            margin="normal"
                            helperText="Lower numbers appear first"
                            disabled={saving}
                        />
                        <TextField
                            fullWidth
                            label="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            margin="normal"
                            helperText="e.g., officers.wm (translation key)"
                            disabled={saving}
                        />
                        <TextField
                            fullWidth
                            label="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            margin="normal"
                            helperText="e.g., W. Bro. John Smith or TBA"
                            disabled={saving}
                        />
                        <TextField
                            fullWidth
                            label="Image URL (Optional)"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            margin="normal"
                            helperText="Full URL to officer's photo"
                            disabled={saving}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveOfficer}
                        variant="contained"
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} /> : null}
                    >
                        {saving ? 'Saving...' : editingOfficer ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete officer <strong>{officerToDelete?.name}</strong>?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteOfficer}
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