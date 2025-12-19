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
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/Upload';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Edit officer dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
    const [formData, setFormData] = useState<Officer>({
        title: '',
        name: '',
        image: '',
        position: 0
    });

    // Image upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    // React Query: Fetch officers
    const { data: officers = [], isLoading: loading } = useQuery({
        queryKey: ['officers'],
        queryFn: async () => {
            const response = await fetch('/.netlify/functions/list-officers', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch officers');
            }
            const data = await response.json();
            return data.officers;
        },
        enabled: !!user && !!session,
    });

    // React Query: Upload image mutation
    const uploadImageMutation = useMutation({
        mutationFn: async ({ file, officerName }: { file: File, officerName: string }) => {
            const reader = new FileReader();
            return new Promise<string>((resolve, reject) => {
                reader.onload = async () => {
                    try {
                        const base64Data = reader.result as string;
                        const response = await fetch('/.netlify/functions/upload-officer-image', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session?.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                fileName: file.name,
                                fileData: base64Data,
                                fileType: file.type,
                                officerName
                            })
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to upload image');
                        }
                        const data = await response.json();
                        resolve(data.url);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        onSuccess: (imageUrl) => {
            setFormData({ ...formData, image: imageUrl });
            setSuccess('Image uploaded successfully');
            setSelectedFile(null);
            setImagePreview(null);
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to upload image');
        },
    });

    // React Query: Save officer mutation
    const saveOfficerMutation = useMutation({
        mutationFn: async (officerData: Officer) => {
            const response = await fetch('/.netlify/functions/upsert-officer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...officerData,
                    name: officerData.name || 'TBA'
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save officer');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['officers'] });
            setSuccess('Officer updated successfully');
            handleCloseDialog();
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to save officer');
        },
    });

    const handleOpenDialog = (officer: Officer) => {
        setEditingOfficer(officer);
        setFormData({
            id: officer.id,
            title: officer.title,
            name: officer.name || '',
            image: officer.image || '',
            position: officer.position
        });
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
        setSelectedFile(null);
        setImagePreview(null);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be less than 5MB');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadImage = () => {
        if (!selectedFile) return;
        setError(null);
        uploadImageMutation.mutate({ file: selectedFile, officerName: formData.name || 'officer' });
    };

    const handleSaveOfficer = () => {
        if (!formData.title) {
            setError('Title is required');
            return;
        }
        setError(null);
        setSuccess(null);
        saveOfficerMutation.mutate(formData);
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
                        Edit officer names and images
                    </Typography>
                </Box>
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
                            {/* <TableCell><strong>Position</strong></TableCell> */}
                            <TableCell><strong>Title</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            {/* <TableCell><strong>Image</strong></TableCell> */}
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {officers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        No officers found.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            officers.map((officer) => (
                                <TableRow key={officer.id} hover>
                                    {/* <TableCell>{officer.position}</TableCell> */}
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
                                    {/* <TableCell>
                                        {officer.image ? (
                                            <Typography variant="caption" color="text.secondary">
                                                {officer.image.substring(0, 30)}...
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                No image
                                            </Typography>
                                        )}
                                    </TableCell> */}
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit Officer Dialog */}
            <Dialog open={dialogOpen} onClose={() => !saveOfficerMutation.isPending && handleCloseDialog()} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Officer - {editingOfficer ? t(editingOfficer.title) : ''}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Officer Position"
                            value={t(formData.title)}
                            margin="normal"
                            helperText="This position cannot be changed"
                            disabled
                            slotProps={{
                                input: { readOnly: true },
                            }}
                            sx={{
                                '& .MuiInputBase-input.Mui-disabled': {
                                    WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                                },
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Name (Optional)"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            margin="normal"
                            helperText="e.g., W. Bro. John Smith or leave blank for TBA"
                            disabled={saveOfficerMutation.isPending}
                        />

                        {/* Image Upload Section */}
                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Officer Image
                            </Typography>

                            {/* Current or preview image */}
                            {(imagePreview || formData.image) && (
                                <Box sx={{ mb: 2, textAlign: 'center' }}>
                                    <Avatar
                                        src={imagePreview || formData.image}
                                        sx={{ width: 120, height: 120, mx: 'auto' }}
                                    />
                                </Box>
                            )}

                            {/* File input */}
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<UploadIcon />}
                                    disabled={saveOfficerMutation.isPending || uploadImageMutation.isPending}
                                >
                                    Choose Image
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </Button>
                                {selectedFile && (
                                    <>
                                        <Typography variant="body2" sx={{ flex: 1 }}>
                                            {selectedFile.name}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleUploadImage}
                                            disabled={uploadImageMutation.isPending}
                                            startIcon={uploadImageMutation.isPending ? <CircularProgress size={16} /> : <UploadIcon />}
                                        >
                                            {uploadImageMutation.isPending ? 'Uploading...' : 'Upload'}
                                        </Button>
                                    </>
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Max file size: 5MB. Supported formats: JPG, PNG, WebP
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            label="Image URL (Optional)"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            margin="normal"
                            helperText="Or enter a direct URL to an image"
                            disabled={saveOfficerMutation.isPending}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} disabled={saveOfficerMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveOfficer}
                        variant="contained"
                        disabled={saveOfficerMutation.isPending}
                        startIcon={saveOfficerMutation.isPending ? <CircularProgress size={16} /> : null}
                    >
                        {saveOfficerMutation.isPending ? 'Saving...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}