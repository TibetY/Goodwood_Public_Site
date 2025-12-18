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
    Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function FreemasonryChatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Welcome! I'm here to answer your questions about Freemasonry and Goodwood Lodge No. 159. How can I help you today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        "What happens at lodge meetings?",
        "Tell me about Goodwood Lodge"
    ];

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setLoading(true);

        const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(newMessages);

        try {
            // Call our Netlify function instead of direct API
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
            setMessages([...newMessages, { 
                role: 'assistant', 
                content: 'I apologize, but I encountered an error. Please try again or contact the lodge directly for assistance.' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestedQuestion = (question: string) => {
        setInput(question);
    };

    return (
        <>
            {/* Floating Action Button */}
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

            {/* Chat Drawer */}
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
                                Ask me about Freemasonry
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Messages */}
                <Box
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: 2,
                        bgcolor: '#f5f5f5',
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
                                <Avatar sx={{ bgcolor: '#1a237e', width: 32, height: 32 }}>
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
                            <Avatar sx={{ bgcolor: '#1a237e', width: 32, height: 32 }}>
                                <SmartToyIcon fontSize="small" />
                            </Avatar>
                            <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2 }}>
                                <CircularProgress size={20} />
                            </Paper>
                        </Box>
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
                            disabled={loading}
                            size="small"
                        />
                        <IconButton
                            color="primary"
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Powered by Claude AI
                    </Typography>
                </Box>
            </Drawer>
        </>
    );
}