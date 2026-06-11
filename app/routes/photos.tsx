import { useState, useMemo } from 'react';
import { useLoaderData } from 'react-router';
import {
    Container, Typography, ImageList, ImageListItem,
    Dialog, DialogContent, IconButton, Box, Divider,
    useMediaQuery, useTheme, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'photos';
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic)$/i;

// Cache for 5 minutes — Supabase listing is fast, keep photos fresh
const CACHE_TTL = 5 * 60 * 1000;
let photosCache: { data: Photo[]; folderMeta: FolderMeta; timestamp: number } | null = null;

interface Photo {
    path: string;   // e.g. "2024_2025/Installation/image.jpg"
    name: string;
    url: string;     // direct Supabase public URL
}

interface FolderMeta {
    [folderPath: string]: { name?: string; date?: string };
}

function formatFolderName(name: string): string {
    if (/^\d{4}[-_]\d{4}$/.test(name)) {
        return name.replace(/[-_]/, ' – ');
    }
    return name.replace(/_/g, ' ');
}

async function listImagesRecursively(
    supabase: ReturnType<typeof createClient>,
    folderPath: string,
    publicBaseUrl: string,
    folderMeta: FolderMeta = {}
): Promise<{ photos: Photo[]; folderMeta: FolderMeta }> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(folderPath, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (error || !data) {
        console.error(`Error listing "${folderPath}":`, error?.message);
        return { photos: [], folderMeta };
    }

    const photos: Photo[] = [];
    const folders: string[] = [];

    for (const item of data) {
        const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        if (item.name === '.folder-meta.json' || item.name === '.emptyFolderPlaceholder') {
            continue;
        }
        if (item.id === null) {
            folders.push(fullPath);
        } else if (IMAGE_EXTENSIONS.test(item.name)) {
            photos.push({
                path: fullPath,
                name: item.name.replace(/\.[^.]+$/, ''),
                url: `${publicBaseUrl}/storage/v1/object/public/${BUCKET}/${encodeURI(fullPath)}`,
            });
        }
    }

    // Read metadata for each subfolder in parallel
    const metaResults = await Promise.allSettled(
        folders.map(async (f) => {
            try {
                const { data: metaFile } = await supabase.storage
                    .from(BUCKET)
                    .download(`${f}/.folder-meta.json`);
                if (metaFile) {
                    folderMeta[f] = JSON.parse(await metaFile.text());
                }
            } catch {
                // no metadata file
            }
        })
    );

    const nested = await Promise.all(
        folders.map((f) => listImagesRecursively(supabase, f, publicBaseUrl, folderMeta))
    );

    const allPhotos = photos.concat(nested.flatMap((n) => n.photos));
    return { photos: allPhotos, folderMeta };
}

export async function loader() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration is missing');
        return { photos: [], folderMeta: {} };
    }

    try {
        const now = Date.now();
        if (photosCache && now - photosCache.timestamp < CACHE_TTL) {
            return { photos: photosCache.data, folderMeta: photosCache.folderMeta };
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const result = await listImagesRecursively(supabase, '', supabaseUrl);
        console.log('Photos found:', result.photos.length);

        photosCache = { data: result.photos, folderMeta: result.folderMeta, timestamp: now };
        return { photos: result.photos, folderMeta: result.folderMeta };
    } catch (err) {
        console.error('Error fetching photos from Supabase:', err);
        return { photos: [], folderMeta: {} };
    }
}

export default function Photos() {
    const { photos, folderMeta } = useLoaderData<typeof loader>();
    const { t } = useTranslation();
    const [selected, setSelected] = useState<Photo | null>(null);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));
    const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const cols = isXs ? 1 : isSm ? 2 : 3;

    const getEventDisplayName = (yearFolder: string, eventFolder: string) => {
        if (!eventFolder) return '';
        const path = `${yearFolder}/${eventFolder}`;
        return folderMeta?.[path]?.name || formatFolderName(eventFolder);
    };

    const groups = useMemo(() => {
        const map = new Map<string, Map<string, Photo[]>>();
        for (const photo of photos) {
            const parts = photo.path.split('/').filter(Boolean);
            const year = parts[0] ?? 'Other';
            const event = parts.length >= 3 ? parts[1] : '';
            if (!map.has(year)) map.set(year, new Map());
            const eventMap = map.get(year)!;
            if (!eventMap.has(event)) eventMap.set(event, []);
            eventMap.get(event)!.push(photo);
        }

        const folderYear = (name: string) => parseInt(name.match(/^\d{4}/)?.[0] ?? '0');
        const years = Array.from(map.entries()).sort((a, b) => {
            const diff = folderYear(b[0]) - folderYear(a[0]);
            return sortOrder === 'newest' ? diff : -diff;
        });

        return years.map(([year, eventMap]) => {
            const events = Array.from(eventMap.entries()).sort((a, b) => {
                const metaA = folderMeta?.[`${year}/${a[0]}`];
                const metaB = folderMeta?.[`${year}/${b[0]}`];
                if (metaA?.date && metaB?.date) {
                    return sortOrder === 'newest'
                        ? metaB.date.localeCompare(metaA.date)
                        : metaA.date.localeCompare(metaB.date);
                }
                return sortOrder === 'newest' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]);
            });
            return { year, events };
        });
    }, [photos, folderMeta, sortOrder]);

    return (
        <>
            {/* Page Header Band */}
            <Box
                sx={{
                    backgroundColor: 'section.hero',
                    borderBottom: (theme) => `1px solid ${theme.palette.section.border}`,
                }}
            >
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                        Goodwood Lodge No. 159
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'flex-end' },
                            justifyContent: 'space-between',
                            gap: 2,
                        }}
                    >
                        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2.25rem', md: '3rem' } }}>
                            {t('photos.title')}
                        </Typography>
                        <ToggleButtonGroup
                            value={sortOrder}
                            exclusive
                            onChange={(_, val) => val && setSortOrder(val)}
                            size="small"
                            sx={{
                                backgroundColor: 'background.paper',
                                '& .MuiToggleButton-root': {
                                    borderColor: 'section.border',
                                    color: 'text.secondary',
                                    '&.Mui-selected': {
                                        color: 'accent.navy',
                                        backgroundColor: 'section.hero',
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="newest">{t('photos.newestFirst')}</ToggleButton>
                            <ToggleButton value="oldest">{t('photos.oldestFirst')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Container>
            </Box>

            {/* Gallery Content */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
                <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
                    {photos.length === 0 ? (
                        <Typography textAlign="center" sx={{ color: 'section.subtle', mt: 4 }}>
                            {t('photos.noPhotos')}
                        </Typography>
                    ) : (
                        groups.map(({ year, events }, yearIndex) => (
                            <Box key={year} sx={{ mt: yearIndex === 0 ? 0 : 8 }}>
                                <Typography variant="h4" component="h2" gutterBottom>
                                    {formatFolderName(year)}
                                </Typography>
                                <Divider sx={{ mb: 4, borderColor: 'section.border' }} />
                                {events.map(([event, eventPhotos]) => {
                                    const eventMeta = event ? folderMeta?.[`${year}/${event}`] : undefined;
                                    return (
                                        <Box key={event} sx={{ mb: 5 }}>
                                            {event && (
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="overline" sx={{ color: 'accent.gold' }}>
                                                        {getEventDisplayName(year, event)}
                                                    </Typography>
                                                    {eventMeta?.date && (
                                                        <Typography variant="body2" sx={{ color: 'section.subtle' }}>
                                                            {new Date(eventMeta.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                            <ImageList variant="masonry" cols={cols} gap={8}>
                                                {eventPhotos.map((photo) => (
                                                    <ImageListItem key={photo.path}>
                                                        {/* Real <button> so the lightbox is keyboard-operable (WCAG 2.1.1) */}
                                                        <Box
                                                            component="button"
                                                            type="button"
                                                            onClick={() => setSelected(photo)}
                                                            aria-label={`${t('photos.viewPhoto', 'View photo')}: ${photo.name}`}
                                                            sx={{
                                                                p: 0,
                                                                width: '100%',
                                                                backgroundColor: 'transparent',
                                                                cursor: 'pointer',
                                                                borderRadius: 1,
                                                                overflow: 'hidden',
                                                                border: '1px solid',
                                                                borderColor: 'section.border',
                                                                transition: 'transform 0.25s ease, opacity 0.25s ease',
                                                                '& img': { transition: 'opacity 0.25s ease' },
                                                                '&:hover': { transform: 'translateY(-2px)' },
                                                                '&:hover img': { opacity: 0.85 },
                                                            }}
                                                        >
                                                            <img
                                                                src={photo.url}
                                                                alt={photo.name}
                                                                loading="lazy"
                                                                style={{ display: 'block', width: '100%', borderRadius: 4 }}
                                                            />
                                                        </Box>
                                                    </ImageListItem>
                                                ))}
                                            </ImageList>
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))
                    )}
                </Container>
            </Box>

            <Dialog
                open={!!selected}
                onClose={() => setSelected(null)}
                maxWidth="lg"
                fullWidth
                slotProps={{
                    paper: {
                        sx: { backgroundColor: 'transparent', boxShadow: 'none' },
                    },
                }}
            >
                <DialogContent sx={{ p: 0, position: 'relative', backgroundColor: 'rgba(11, 23, 38, 0.95)' }}>
                    <IconButton
                        onClick={() => setSelected(null)}
                        aria-label={t('photos.closePhoto', 'Close photo')}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: 'common.white',
                            zIndex: 1,
                            backgroundColor: 'rgba(0, 0, 0, 0.35)',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
                        }}
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
        </>
    );
}
