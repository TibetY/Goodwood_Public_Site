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
    Chip,
    CircularProgress,
    Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../context/auth-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Member {
    id: string;
    email: string;
    display_name: string;
    phone_number: string;
    title: string;
    position: string;
    dues_paid: boolean;
    dues_paid_date: string | null;
    member_number: string;
    join_date: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
}

export default function ManageMembers() {
    const { t } = useTranslation();
    const { user, loading: authLoading, session } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Add member dialog state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberDisplayName, setNewMemberDisplayName] = useState('');

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    // React Query: Fetch members
    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const response = await fetch('/.netlify/functions/list-members', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch members');
            }
            const data = await response.json();
            return data.members;
        },
        enabled: !!user && !!session,
    });

    // React Query: Invite member mutation
    const inviteMutation = useMutation({
        mutationFn: async ({ email, displayName }: { email: string, displayName: string }) => {
            const response = await fetch('/.netlify/functions/invite-member', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, displayName })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send invitation');
            }
            return response.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            setSuccess(`Invitation sent to ${variables.email}`);
            setAddDialogOpen(false);
            setNewMemberEmail('');
            setNewMemberDisplayName('');
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to send invitation');
        },
    });

    // React Query: Delete member mutation
    const deleteMutation = useMutation({
        mutationFn: async (userId: string) => {
            const response = await fetch('/.netlify/functions/delete-member', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete member');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            setSuccess(`Member ${memberToDelete?.email} deleted successfully`);
            setDeleteDialogOpen(false);
            setMemberToDelete(null);
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to delete member');
        },
    });

    const handleInviteMember = () => {
        if (!newMemberEmail) {
            setError('Email is required');
            return;
        }
        setError(null);
        setSuccess(null);
        inviteMutation.mutate({ email: newMemberEmail, displayName: newMemberDisplayName });
    };

    const handleDeleteMember = () => {
        if (!memberToDelete) return;
        setError(null);
        setSuccess(null);
        deleteMutation.mutate(memberToDelete.id);
    };

    const handleResetPassword = async (email: string) => {
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/.netlify/functions/reset-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send password reset');
            }

            setSuccess(`Password reset email sent to ${email}`);
        } catch (err: any) {
            setError(err.message || 'Failed to send password reset');
        }
    };

    const openDeleteDialog = (member: Member) => {
        setMemberToDelete(member);
        setDeleteDialogOpen(true);
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
                        Manage Members
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View and manage lodge members
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setAddDialogOpen(true)}
                    sx={{
                        backgroundColor: '#13294b',
                        '&:hover': {
                            backgroundColor: '#1c3f72ff'
                        }
                    }}
                >
                    Invite Member
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

            {/* Members Table */}
            <TableContainer component={Paper} elevation={2}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Display Name</strong></TableCell>
                            <TableCell><strong>Email</strong></TableCell>
                            <TableCell><strong>Phone</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Last Sign In</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {members.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        No members found. Click "Invite Member" to add members.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            members.map((member) => (
                                <TableRow key={member.id} hover>
                                    <TableCell>{member.display_name || '-'}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{member.phone_number || '-'}</TableCell>
                                    <TableCell>
                                        {member.email_confirmed_at ? (
                                            <Chip label="Active" color="success" size="small" />
                                        ) : (
                                            <Chip label="Pending" color="warning" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {member.last_sign_in_at
                                            ? new Date(member.last_sign_in_at).toLocaleDateString()
                                            : 'Never'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Send Password Reset">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleResetPassword(member.email)}
                                            >
                                                <LockResetIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Member">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => openDeleteDialog(member)}
                                                disabled={member.id === user.id}
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

            {/* Add Member Dialog */}
            <Dialog open={addDialogOpen} onClose={() => !inviteMutation.isPending && setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            required
                            margin="normal"
                            disabled={inviteMutation.isPending}
                        />
                        <TextField
                            fullWidth
                            label="Display Name (Optional)"
                            value={newMemberDisplayName}
                            onChange={(e) => setNewMemberDisplayName(e.target.value)}
                            margin="normal"
                            disabled={inviteMutation.isPending}
                            helperText="e.g., W. Bro. John Smith"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)} disabled={inviteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInviteMember}
                        variant="contained"
                        disabled={inviteMutation.isPending || !newMemberEmail}
                        startIcon={inviteMutation.isPending ? <CircularProgress size={16} /> : <EmailIcon />}
                    >
                        {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => !deleteMutation.isPending && setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete member <strong>{memberToDelete?.email}</strong>?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteMember}
                        variant="contained"
                        color="error"
                        disabled={deleteMutation.isPending}
                        startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
