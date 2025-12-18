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
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Committee dialog state
    const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
    const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);
    const [committeeFormData, setCommitteeFormData] = useState({ title: '' });
    const [savingCommittee, setSavingCommittee] = useState(false);

    // Member dialog state
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
    const [selectedCommitteeId, setSelectedCommitteeId] = useState<number | null>(null);
    const [memberFormData, setMemberFormData] = useState({ name: '', position: 1 });
    const [savingMember, setSavingMember] = useState(false);

    // Delete dialogs
    const [deleteCommitteeDialogOpen, setDeleteCommitteeDialogOpen] = useState(false);
    const [committeeToDelete, setCommitteeToDelete] = useState<Committee | null>(null);
    const [deletingCommittee, setDeletingCommittee] = useState(false);

    const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<CommitteeMember | null>(null);
    const [deletingMember, setDeletingMember] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user && session) {
            fetchCommittees();
        }
    }, [user, session]);

    const fetchCommittees = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/.netlify/functions/list-committees', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch committees');
            }

            const data = await response.json();
            setCommittees(data.committees);
        } catch (err: any) {
            setError(err.message || 'Failed to load committees');
        } finally {
            setLoading(false);
        }
    };

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

    const handleSaveCommittee = async () => {
        if (!committeeFormData.title) {
            setError('Committee title is required');
            return;
        }

        setSavingCommittee(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/upsert-committee', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: editingCommittee?.id,
                    title: committeeFormData.title
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save committee');
            }

            setSuccess(editingCommittee ? 'Committee updated successfully' : 'Committee created successfully');
            handleCloseCommitteeDialog();
            fetchCommittees();
        } catch (err: any) {
            setError(err.message || 'Failed to save committee');
        } finally {
            setSavingCommittee(false);
        }
    };

    const handleDeleteCommittee = async () => {
        if (!committeeToDelete) return;

        setDeletingCommittee(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/delete-committee', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    committeeId: committeeToDelete.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete committee');
            }

            setSuccess(`Committee "${committeeToDelete.title}" deleted successfully`);
            setDeleteCommitteeDialogOpen(false);
            setCommitteeToDelete(null);
            fetchCommittees();
        } catch (err: any) {
            setError(err.message || 'Failed to delete committee');
        } finally {
            setDeletingCommittee(false);
        }
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

    const handleSaveMember = async () => {
        if (!memberFormData.name) {
            setError('Member name is required');
            return;
        }

        setSavingMember(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/upsert-committee-member', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: editingMember?.id,
                    committee_id: selectedCommitteeId,
                    name: memberFormData.name,
                    position: memberFormData.position
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save member');
            }

            setSuccess(editingMember ? 'Member updated successfully' : 'Member added successfully');
            handleCloseMemberDialog();
            fetchCommittees();
        } catch (err: any) {
            setError(err.message || 'Failed to save member');
        } finally {
            setSavingMember(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;

        setDeletingMember(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/delete-committee-member', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    memberId: memberToDelete.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete member');
            }

            setSuccess(`Member "${memberToDelete.name}" removed successfully`);
            setDeleteMemberDialogOpen(false);
            setMemberToDelete(null);
            fetchCommittees();
        } catch (err: any) {
            setError(err.message || 'Failed to delete member');
        } finally {
            setDeletingMember(false);
        }
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
            <Dialog open={committeeDialogOpen} onClose={() => !savingCommittee && handleCloseCommitteeDialog()} maxWidth="sm" fullWidth>
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
                            disabled={savingCommittee}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCommitteeDialog} disabled={savingCommittee}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveCommittee}
                        variant="contained"
                        disabled={savingCommittee}
                        startIcon={savingCommittee ? <CircularProgress size={16} /> : null}
                    >
                        {savingCommittee ? 'Saving...' : editingCommittee ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Member Dialog */}
            <Dialog open={memberDialogOpen} onClose={() => !savingMember && handleCloseMemberDialog()} maxWidth="sm" fullWidth>
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
                            disabled={savingMember}
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
                            disabled={savingMember}
                        /> */}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMemberDialog} disabled={savingMember}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveMember}
                        variant="contained"
                        disabled={savingMember}
                        startIcon={savingMember ? <CircularProgress size={16} /> : null}
                    >
                        {savingMember ? 'Saving...' : editingMember ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Committee Dialog */}
            <Dialog open={deleteCommitteeDialogOpen} onClose={() => !deletingCommittee && setDeleteCommitteeDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the committee <strong>{committeeToDelete?.title}</strong>?
                        This will also delete all members of this committee. This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteCommitteeDialogOpen(false)} disabled={deletingCommittee}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteCommittee}
                        variant="contained"
                        color="error"
                        disabled={deletingCommittee}
                        startIcon={deletingCommittee ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deletingCommittee ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Member Dialog */}
            <Dialog open={deleteMemberDialogOpen} onClose={() => !deletingMember && setDeleteMemberDialogOpen(false)}>
                <DialogTitle>Confirm Remove</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from this committee?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteMemberDialogOpen(false)} disabled={deletingMember}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteMember}
                        variant="contained"
                        color="error"
                        disabled={deletingMember}
                        startIcon={deletingMember ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deletingMember ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
