import { Box } from "@mui/material";

interface RoundedImageProps {
  src: string;
  alt: string;
}

const RoundedImage: React.FC<RoundedImageProps> = ({ src, alt }) => {
  return (
    <Box
      component="img"   
      src={src}
      alt={alt}
      sx={{
        width: '100%',
        height: "auto",
        borderRadius: 2,
        display: 'block',
        objectFit: 'cover',
      }}
    />
  );
};

export default RoundedImage;