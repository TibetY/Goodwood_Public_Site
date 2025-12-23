import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    Fab,
    Drawer,
    Avatar,
    Divider,
    CircularProgress,
    Chip,
    Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Rate limiting configuration
const RATE_LIMITS = {
    MAX_MESSAGES_PER_SESSION: 10,      // Max messages per chat session
    MAX_MESSAGES_PER_HOUR: 20,         // Max messages per hour per user
    MESSAGE_COOLDOWN_MS: 3000,         // 3 second cooldown between messages
    MAX_MESSAGE_LENGTH: 500,           // Max characters per message
};

export default function RateLimitedChatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Welcome! I'm here to answer your questions about Freemasonry and Goodwood Lodge No. 159. How can I help you today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
    const [lastMessageTime, setLastMessageTime] = useState<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get rate limit data from localStorage
    const getRateLimitData = () => {
        const data = localStorage.getItem('chatbot_rate_limit');
        if (!data) return { count: 0, timestamp: Date.now() };
        return JSON.parse(data);
    };

    const updateRateLimitData = () => {
        const data = getRateLimitData();
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        // Reset if more than an hour has passed
        if (now - data.timestamp > oneHour) {
            const newData = { count: 1, timestamp: now };
            localStorage.setItem('chatbot_rate_limit', JSON.stringify(newData));
            return newData;
        }

        // Increment count
        data.count++;
        localStorage.setItem('chatbot_rate_limit', JSON.stringify(data));
        return data;
    };

    const checkRateLimits = (): { allowed: boolean; message?: string } => {
        // Check session message limit
        const userMessageCount = messages.filter(m => m.role === 'user').length;
        if (userMessageCount >= RATE_LIMITS.MAX_MESSAGES_PER_SESSION) {
            return {
                allowed: false,
                message: `You've reached the maximum of ${RATE_LIMITS.MAX_MESSAGES_PER_SESSION} messages per session. Please refresh to start a new conversation or contact the lodge directly.`
            };
        }

        // Check hourly limit
        const rateLimitData = getRateLimitData();
        if (rateLimitData.count >= RATE_LIMITS.MAX_MESSAGES_PER_HOUR) {
            return {
                allowed: false,
                message: `You've reached the hourly limit of ${RATE_LIMITS.MAX_MESSAGES_PER_HOUR} messages. Please try again later or contact the lodge directly.`
            };
        }

        // Check cooldown
        const now = Date.now();
        const timeSinceLastMessage = now - lastMessageTime;
        if (timeSinceLastMessage < RATE_LIMITS.MESSAGE_COOLDOWN_MS) {
            const remainingSeconds = Math.ceil((RATE_LIMITS.MESSAGE_COOLDOWN_MS - timeSinceLastMessage) / 1000);
            return {
                allowed: false,
                message: `Please wait ${remainingSeconds} seconds before sending another message.`
            };
        }

        // Check message length
        if (input.length > RATE_LIMITS.MAX_MESSAGE_LENGTH) {
            return {
                allowed: false,
                message: `Message too long. Please keep messages under ${RATE_LIMITS.MAX_MESSAGE_LENGTH} characters.`
            };
        }

        return { allowed: true };
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const suggestedQuestions = [
        "What is Freemasonry?",
        "How do I become a Freemason?",
        "What are the requirements to join?",
        "Tell me about Goodwood Lodge"
    ];

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        setError(null);
        setRateLimitWarning(null);

        // Check rate limits
        const rateLimitCheck = checkRateLimits();
        if (!rateLimitCheck.allowed) {
            setRateLimitWarning(rateLimitCheck.message || 'Rate limit exceeded');
            return;
        }

        const userMessage = input.trim();
        setInput('');
        setLoading(true);
        setLastMessageTime(Date.now());

        // Update rate limit counter
        updateRateLimitData();

        const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(newMessages);

        try {
            const response = await fetch('/.netlify/functions/chat-function', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: newMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            const assistantMessage = data.content[0].text;

            setMessages([...newMessages, { 
                role: 'assistant', 
                content: assistantMessage 
            }]);

        } catch (error) {
            console.error('Error:', error);
            setError('I apologize, but I encountered an error. Please try again or contact the lodge directly.');
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestedQuestion = (question: string) => {
        setInput(question);
    };

    // Show remaining messages
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const remainingMessages = RATE_LIMITS.MAX_MESSAGES_PER_SESSION - userMessageCount;

    return (
        <>
            <Fab
                color="primary"
                aria-label="chat"
                onClick={() => setOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000
                }}
            >
                <ChatIcon />
            </Fab>

            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 400 },
                        height: '100vh'
                    }
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 2,
                        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <SmartToyIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                Masonic Assistant
                            </Typography>
                            <Typography variant="caption">
                                {remainingMessages} questions remaining
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Rate Limit Warning */}
                {remainingMessages <= 3 && remainingMessages > 0 && (
                    <Alert severity="warning" sx={{ m: 2 }}>
                        You have {remainingMessages} question{remainingMessages !== 1 ? 's' : ''} remaining in this session.
                    </Alert>
                )}

                {/* Messages */}
                <Box
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: 2,
                        bgcolor: 'section.neutral',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}
                >
                    {messages.map((message, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                                gap: 1
                            }}
                        >
                            {message.role === 'assistant' && (
                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                    <SmartToyIcon fontSize="small" />
                                </Avatar>
                            )}
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 1.5,
                                    maxWidth: '75%',
                                    bgcolor: message.role === 'user' ? '#1a237e' : 'white',
                                    color: message.role === 'user' ? 'white' : 'inherit',
                                    borderRadius: 2,
                                    wordBreak: 'break-word'
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {message.content}
                                </Typography>
                            </Paper>
                        </Box>
                    ))}

                    {loading && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                <SmartToyIcon fontSize="small" />
                            </Avatar>
                            <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2 }}>
                                <CircularProgress size={20} />
                            </Paper>
                        </Box>
                    )}

                    {/* Error Message */}
                    {error && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {/* Rate Limit Warning */}
                    {rateLimitWarning && (
                        <Alert severity="warning">
                            {rateLimitWarning}
                        </Alert>
                    )}

                    {/* Suggested Questions */}
                    {messages.length === 1 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Suggested questions:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {suggestedQuestions.map((question, index) => (
                                    <Chip
                                        key={index}
                                        label={question}
                                        onClick={() => handleSuggestedQuestion(question)}
                                        size="small"
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Contact Info at Limit */}
                    {remainingMessages === 0 && (
                        <Alert severity="info">
                            For more questions, please contact:<br/>
                            <strong>W. Bro. Greg Skelly, Secretary</strong><br/>
                        </Alert>
                    )}

                    <div ref={messagesEndRef} />
                </Box>

                <Divider />

                {/* Input */}
                <Box sx={{ p: 2, bgcolor: 'white' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            placeholder="Ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            multiline
                            maxRows={4}
                            disabled={loading || remainingMessages === 0}
                            size="small"
                            helperText={input.length > 400 ? `${RATE_LIMITS.MAX_MESSAGE_LENGTH - input.length} characters remaining` : ''}
                        />
                        <IconButton
                            color="primary"
                            onClick={handleSend}
                            disabled={!input.trim() || loading || remainingMessages === 0}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Limited to {RATE_LIMITS.MAX_MESSAGES_PER_SESSION} questions per session
                    </Typography>
                </Box>
            </Drawer>
        </>
    );
}