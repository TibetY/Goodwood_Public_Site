import { useState, useMemo } from 'react';
import { useLoaderData } from 'react-router';
import {
    Container, Typography, ImageList, ImageListItem,
    Dialog, DialogContent, IconButton, Box, Divider,
    useMediaQuery, useTheme, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

const DROPBOX_SHARED_LINK = 'https://www.dropbox.com/scl/fo/7gd10a4uuajp1nl41b1kt/AC9kDN6IoQI1W406N-K6rbU?rlkey=fphtf4p8pfashffjhqtd606gd&st=uwxnfm4g&dl=0';
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic)$/i;

// Cache for 24 hours — paths don't expire
const CACHE_TTL = 24 * 60 * 60 * 1000;
let photosCache: { data: Photo[]; timestamp: number } | null = null;

interface Photo {
    path: string; // path within shared folder, e.g. /2025-2026/event/image.jpg
    name: string;
}

function photoUrl(path: string, full = false) {
    const params = new URLSearchParams({ path });
    if (full) params.set('full', '1');
    return `/.netlify/functions/dropbox-photo?${params}`;
}

function formatFolderName(name: string): string {
    // Year range like 2024_2025 or 2025-2026 → 2024 – 2025
    if (/^\d{4}[-_]\d{4}$/.test(name)) {
        return name.replace(/[-_]/, ' – ');
    }
    return name.replace(/_/g, ' ');
}

async function listFolderEntries(token: string, path: string): Promise<any[]> {
    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_link: { url: DROPBOX_SHARED_LINK }, path }),
    });
    if (!res.ok) {
        console.error(`list_folder error for "${path}":`, await res.text());
        return [];
    }
    const json = await res.json();
    let entries = json.entries;
    let cursor = json.cursor;
    let hasMore = json.has_more;
    while (hasMore) {
        const cont = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ cursor }),
        });
        const contJson = await cont.json();
        entries = entries.concat(contJson.entries);
        cursor = contJson.cursor;
        hasMore = contJson.has_more;
    }
    return entries;
}

async function listImagesRecursively(token: string, folderPath: string): Promise<Photo[]> {
    const entries = await listFolderEntries(token, folderPath);
    const images: Photo[] = entries
        .filter((e: any) => e['.tag'] === 'file' && IMAGE_EXTENSIONS.test(e.name))
        .map((e: any) => ({
            path: `${folderPath}/${e.name}`,
            name: e.name.replace(/\.[^.]+$/, ''),
        }));
    const folders = entries.filter((e: any) => e['.tag'] === 'folder');
    const nested = await Promise.all(
        folders.map((f: any) => listImagesRecursively(token, `${folderPath}/${f.name}`))
    );
    return images.concat(nested.flat());
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

        const photos = await listImagesRecursively(token, '');
        console.log('Photos found:', photos.length);

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
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));
    const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const cols = isXs ? 1 : isSm ? 2 : 3;

    const groups = useMemo(() => {
        const map = new Map<string, Photo[]>();
        for (const photo of photos) {
            const folder = photo.path.split('/').filter(Boolean)[0] ?? 'Other';
            if (!map.has(folder)) map.set(folder, []);
            map.get(folder)!.push(photo);
        }

        // Sort by the leading 4-digit year; folders without one (e.g. "Earlier") go last
        const folderYear = (name: string) => parseInt(name.match(/^\d{4}/)?.[0] ?? '0');
        const entries = Array.from(map.entries()).sort((a, b) => {
            const diff = folderYear(b[0]) - folderYear(a[0]);
            return sortOrder === 'newest' ? diff : -diff;
        });

        return entries;
    }, [photos, sortOrder]);

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Typography variant="h3" component="h1" fontWeight="bold">
                    {t('photos.title')}
                </Typography>
                <ToggleButtonGroup
                    value={sortOrder}
                    exclusive
                    onChange={(_, val) => val && setSortOrder(val)}
                    size="small"
                >
                    <ToggleButton value="newest">{t('photos.newestFirst')}</ToggleButton>
                    <ToggleButton value="oldest">{t('photos.oldestFirst')}</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {photos.length === 0 ? (
                <Typography textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
                    {t('photos.noPhotos')}
                </Typography>
            ) : (
                groups.map(([folder, folderPhotos]) => (
                    <Box key={folder} sx={{ mt: 6 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {formatFolderName(folder)}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <ImageList variant="masonry" cols={cols} gap={8}>
                            {folderPhotos.map((photo) => (
                                <ImageListItem
                                    key={photo.path}
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
                                        src={photoUrl(photo.path)}
                                        alt={photo.name}
                                        loading="lazy"
                                        style={{ display: 'block', width: '100%', borderRadius: 4 }}
                                    />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    </Box>
                ))
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
                            src={photoUrl(selected.path, true)}
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
