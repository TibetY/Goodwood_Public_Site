import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
    Container,
    Typography,
    Box,
    Button,
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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CommitteeMember {
    id?: number;
    committee_id: number;
    name: string;
    position: number;
}

interface Committee {
    id?: number;
    title: string;
    members: CommitteeMember[];
}

export default function ManageCommittees() {
    const { t } = useTranslation();
    const { user, loading: authLoading, session } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Committee dialog state
    const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
    const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);
    const [committeeFormData, setCommitteeFormData] = useState({ title: '' });

    // Member dialog state
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
    const [selectedCommitteeId, setSelectedCommitteeId] = useState<number | null>(null);
    const [memberFormData, setMemberFormData] = useState({ name: '', position: 1 });

    // Delete dialogs
    const [deleteCommitteeDialogOpen, setDeleteCommitteeDialogOpen] = useState(false);
    const [committeeToDelete, setCommitteeToDelete] = useState<Committee | null>(null);

    const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<CommitteeMember | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    // React Query: Fetch committees
    const { data: committees = [], isLoading: loading } = useQuery({
        queryKey: ['committees'],
        queryFn: async () => {
            const response = await fetch('/.netlify/functions/list-committees', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch committees');
            }
            const data = await response.json();
            return data.committees;
        },
        enabled: !!user && !!session,
    });

    // React Query: Save committee mutation
    const saveCommitteeMutation = useMutation({
        mutationFn: async ({ id, title }: { id?: number, title: string }) => {
            const response = await fetch('/.netlify/functions/upsert-committee', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, title })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save committee');
            }
            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['committees'] });
            setSuccess(variables.id ? 'Committee updated successfully' : 'Committee created successfully');
            handleCloseCommitteeDialog();
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to save committee');
        },
    });

    // React Query: Delete committee mutation
    const deleteCommitteeMutation = useMutation({
        mutationFn: async (committeeId: number) => {
            const response = await fetch('/.netlify/functions/delete-committee', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ committeeId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete committee');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['committees'] });
            setSuccess(`Committee "${committeeToDelete?.title}" deleted successfully`);
            setDeleteCommitteeDialogOpen(false);
            setCommitteeToDelete(null);
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to delete committee');
        },
    });

    // React Query: Save member mutation
    const saveMemberMutation = useMutation({
        mutationFn: async ({ id, committee_id, name, position }: { id?: number, committee_id: number, name: string, position: number }) => {
            const response = await fetch('/.netlify/functions/upsert-committee-member', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, committee_id, name, position })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save member');
            }
            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['committees'] });
            setSuccess(variables.id ? 'Member updated successfully' : 'Member added successfully');
            handleCloseMemberDialog();
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to save member');
        },
    });

    // React Query: Delete member mutation
    const deleteMemberMutation = useMutation({
        mutationFn: async (memberId: number) => {
            const response = await fetch('/.netlify/functions/delete-committee-member', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ memberId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete member');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['committees'] });
            setSuccess(`Member "${memberToDelete?.name}" removed successfully`);
            setDeleteMemberDialogOpen(false);
            setMemberToDelete(null);
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to delete member');
        },
    });

    // Committee operations
    const handleOpenCommitteeDialog = (committee?: Committee) => {
        if (committee) {
            setEditingCommittee(committee);
            setCommitteeFormData({ title: committee.title });
        } else {
            setEditingCommittee(null);
            setCommitteeFormData({ title: '' });
        }
        setCommitteeDialogOpen(true);
    };

    const handleCloseCommitteeDialog = () => {
        setCommitteeDialogOpen(false);
        setEditingCommittee(null);
        setCommitteeFormData({ title: '' });
    };

    const handleSaveCommittee = () => {
        if (!committeeFormData.title) {
            setError('Committee title is required');
            return;
        }
        setError(null);
        setSuccess(null);
        saveCommitteeMutation.mutate({ id: editingCommittee?.id, title: committeeFormData.title });
    };

    const handleDeleteCommittee = () => {
        if (!committeeToDelete) return;
        setError(null);
        setSuccess(null);
        deleteCommitteeMutation.mutate(committeeToDelete.id!);
    };

    // Member operations
    const handleOpenMemberDialog = (committeeId: number, member?: CommitteeMember) => {
        setSelectedCommitteeId(committeeId);
        if (member) {
            setEditingMember(member);
            setMemberFormData({ name: member.name, position: member.position });
        } else {
            setEditingMember(null);
            const committee = committees.find(c => c.id === committeeId);
            const maxPosition = committee?.members.length ? Math.max(...committee.members.map(m => m.position)) + 1 : 1;
            setMemberFormData({ name: '', position: maxPosition });
        }
        setMemberDialogOpen(true);
    };

    const handleCloseMemberDialog = () => {
        setMemberDialogOpen(false);
        setEditingMember(null);
        setSelectedCommitteeId(null);
        setMemberFormData({ name: '', position: 1 });
    };

    const handleSaveMember = () => {
        if (!memberFormData.name) {
            setError('Member name is required');
            return;
        }
        setError(null);
        setSuccess(null);
        saveMemberMutation.mutate({
            id: editingMember?.id,
            committee_id: selectedCommitteeId!,
            name: memberFormData.name,
            position: memberFormData.position
        });
    };

    const handleDeleteMember = () => {
        if (!memberToDelete) return;
        setError(null);
        setSuccess(null);
        deleteMemberMutation.mutate(memberToDelete.id!);
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
                        Manage Committees
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage lodge committees and their members
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenCommitteeDialog()}
                    sx={{
                        backgroundColor: '#13294b',
                        '&:hover': {
                            backgroundColor: '#1c3f72ff'
                        }
                    }}
                >
                    Add Committee
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

            {/* Committees List */}
            {committees.length === 0 ? (
                <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No committees found. Click "Add Committee" to create one.
                    </Typography>
                </Paper>
            ) : (
                committees.map((committee) => (
                    <Accordion key={committee.id} elevation={2} sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                                <Typography variant="h6" sx={{ flex: 1 }}>
                                    {committee.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Tooltip title="Edit Committee">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenCommitteeDialog(committee);
                                            }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Committee">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCommitteeToDelete(committee);
                                                setDeleteCommitteeDialogOpen(true);
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Members ({committee.members.length})
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenMemberDialog(committee.id!)}
                                    >
                                        Add Member
                                    </Button>
                                </Box>
                                {committee.members.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                        No members added yet
                                    </Typography>
                                ) : (
                                    <List dense>
                                        {committee.members.map((member) => (
                                            <Box key={member.id}>
                                                <ListItem>
                                                    <ListItemText
                                                        primary={member.name}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <Tooltip title="Edit Member">
                                                            <IconButton
                                                                edge="end"
                                                                size="small"
                                                                onClick={() => handleOpenMemberDialog(committee.id!, member)}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Remove Member">
                                                            <IconButton
                                                                edge="end"
                                                                size="small"
                                                                color="error"
                                                                onClick={() => {
                                                                    setMemberToDelete(member);
                                                                    setDeleteMemberDialogOpen(true);
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            </Box>
                                        ))}
                                    </List>
                                )}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))
            )}

            {/* Committee Dialog */}
            <Dialog open={committeeDialogOpen} onClose={() => !saveCommitteeMutation.isPending && handleCloseCommitteeDialog()} maxWidth="sm" fullWidth>
                <DialogTitle>{editingCommittee ? 'Edit Committee' : 'Add New Committee'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Committee Title"
                            value={committeeFormData.title}
                            onChange={(e) => setCommitteeFormData({ title: e.target.value })}
                            required
                            margin="normal"
                            disabled={saveCommitteeMutation.isPending}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCommitteeDialog} disabled={saveCommitteeMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveCommittee}
                        variant="contained"
                        disabled={saveCommitteeMutation.isPending}
                        startIcon={saveCommitteeMutation.isPending ? <CircularProgress size={16} /> : null}
                    >
                        {saveCommitteeMutation.isPending ? 'Saving...' : editingCommittee ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Member Dialog */}
            <Dialog open={memberDialogOpen} onClose={() => !saveMemberMutation.isPending && handleCloseMemberDialog()} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Member Name"
                            value={memberFormData.name}
                            onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                            required
                            margin="normal"
                            disabled={saveMemberMutation.isPending}
                        />
                        {/* <TextField
                            fullWidth
                            label="Position (Order)"
                            type="number"
                            value={memberFormData.position}
                            onChange={(e) => setMemberFormData({ ...memberFormData, position: parseInt(e.target.value) })}
                            required
                            margin="normal"
                            helperText="Lower numbers appear first"
                            disabled={saveMemberMutation.isPending}
                        /> */}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMemberDialog} disabled={saveMemberMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveMember}
                        variant="contained"
                        disabled={saveMemberMutation.isPending}
                        startIcon={saveMemberMutation.isPending ? <CircularProgress size={16} /> : null}
                    >
                        {saveMemberMutation.isPending ? 'Saving...' : editingMember ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Committee Dialog */}
            <Dialog open={deleteCommitteeDialogOpen} onClose={() => !deleteCommitteeMutation.isPending && setDeleteCommitteeDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the committee <strong>{committeeToDelete?.title}</strong>?
                        This will also delete all members of this committee. This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteCommitteeDialogOpen(false)} disabled={deleteCommitteeMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteCommittee}
                        variant="contained"
                        color="error"
                        disabled={deleteCommitteeMutation.isPending}
                        startIcon={deleteCommitteeMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deleteCommitteeMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Member Dialog */}
            <Dialog open={deleteMemberDialogOpen} onClose={() => !deleteMemberMutation.isPending && setDeleteMemberDialogOpen(false)}>
                <DialogTitle>Confirm Remove</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from this committee?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteMemberDialogOpen(false)} disabled={deleteMemberMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteMember}
                        variant="contained"
                        color="error"
                        disabled={deleteMemberMutation.isPending}
                        startIcon={deleteMemberMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deleteMemberMutation.isPending ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
