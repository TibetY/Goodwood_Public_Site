import { useState } from 'react';
import { useLoaderData } from 'react-router';
import {
    Container, Typography, ImageList, ImageListItem,
    Dialog, DialogContent, IconButton, Box,
    useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const DROPBOX_SHARED_LINK = 'https://www.dropbox.com/scl/fo/7gd10a4uuajp1nl41b1kt/AC9kDN6IoQI1W406N-K6rbU?rlkey=fphtf4p8pfashffjhqtd606gd&st=uwxnfm4g&dl=0';
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic)$/i;

// Cache for 1 hour — matches Dropbox temporary link validity
const CACHE_TTL = 60 * 60 * 1000;
let photosCache: { data: Photo[]; timestamp: number } | null = null;

interface Photo {
    url: string;
    name: string;
}

export async function loader() {
    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) {
        console.error('DROPBOX_ACCESS_TOKEN is not set');
        return { photos: [] };
    }

    try {
        const now = Date.now();
        if (photosCache && now - photosCache.timestamp < CACHE_TTL) {
            return { photos: photosCache.data };
        }

        const listRes = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shared_link: { url: DROPBOX_SHARED_LINK },
                path: '',
            }),
        });

        if (!listRes.ok) {
            console.error('Dropbox list_folder error:', await listRes.text());
            return { photos: [] };
        }

        const listJson = await listRes.json();
        console.log('Dropbox entries count:', listJson.entries?.length);
        const { entries } = listJson;
        const imageFiles = entries.filter(
            (e: any) => e['.tag'] === 'file' && IMAGE_EXTENSIONS.test(e.name)
        );
        console.log('All entry names:', entries.map((e: any) => `${e['.tag']}:${e.name}`));
        console.log('Image files found:', imageFiles.length);

        const photos = (
            await Promise.all(
                imageFiles.map(async (file: any) => {
                    const linkRes = await fetch(
                        'https://api.dropboxapi.com/2/files/get_temporary_link',
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ path: file.id }),
                        }
                    );
                    if (!linkRes.ok) return null;
                    const { link } = await linkRes.json();
                    return { url: link, name: file.name.replace(/\.[^.]+$/, '') } as Photo;
                })
            )
        ).filter(Boolean) as Photo[];

        photosCache = { data: photos, timestamp: now };
        return { photos };
    } catch (err) {
        console.error('Error fetching photos from Dropbox:', err);
        return { photos: [] };
    }
}

export default function Photos() {
    const { photos } = useLoaderData<typeof loader>();
    const { t } = useTranslation();
    const [selected, setSelected] = useState<Photo | null>(null);
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));
    const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const cols = isXs ? 1 : isSm ? 2 : 3;

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" textAlign="center">
                {t('photos.title')}
            </Typography>

            {photos.length === 0 ? (
                <Typography textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
                    {t('photos.noPhotos')}
                </Typography>
            ) : (
                <ImageList variant="masonry" cols={cols} gap={8} sx={{ mt: 4 }}>
                    {photos.map((photo) => (
                        <ImageListItem
                            key={photo.url}
                            onClick={() => setSelected(photo)}
                            sx={{
                                cursor: 'pointer',
                                borderRadius: 1,
                                overflow: 'hidden',
                                '& img': { transition: 'opacity 0.2s' },
                                '&:hover img': { opacity: 0.85 },
                            }}
                        >
                            <img
                                src={photo.url}
                                alt={photo.name}
                                loading="lazy"
                                style={{ display: 'block', width: '100%', borderRadius: 4 }}
                            />
                        </ImageListItem>
                    ))}
                </ImageList>
            )}

            <Dialog
                open={!!selected}
                onClose={() => setSelected(null)}
                maxWidth="lg"
                fullWidth
            >
                <DialogContent sx={{ p: 0, position: 'relative', backgroundColor: 'black' }}>
                    <IconButton
                        onClick={() => setSelected(null)}
                        aria-label="close"
                        sx={{ position: 'absolute', top: 8, right: 8, color: 'white', zIndex: 1 }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {selected && (
                        <Box
                            component="img"
                            src={selected.url}
                            alt={selected.name}
                            sx={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Container>
    );
}
