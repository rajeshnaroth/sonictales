import { Button } from "../../ui/button";
import { ArrowLeft, ExternalLink, Download, Star } from "lucide-react";
import { Product } from "../../../data/products";

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
}

function getYouTubeEmbedUrl(url?: string) {
  if (!url) return null;
  let videoId = "";

  if (url.includes("youtube.com/watch?v=")) {
    videoId = url.split("watch?v=")[1].split("&")[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  } else if (url.includes("youtube.com/embed/")) {
    videoId = url.split("embed/")[1].split("?")[0];
  } else if (url.includes("youtube.com/shorts/")) {
    videoId = url.split("shorts/")[1].split("?")[0];
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null;
}

function renderStars(rating: number, count: number | null) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
  }
  if (hasHalfStar) {
    stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
  }
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-white/20" />);
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex">{stars}</div>
      {count && <span className="text-xs text-white/60 ml-1">({count})</span>}
    </div>
  );
}

export function ProductDetail({ product, onBack }: ProductDetailProps) {
  const embedUrl = getYouTubeEmbedUrl(product.youtube_link || product.youtube_embed);
  const isFree = product.other_metadata.free;
  const priceLabel = isFree ? "FREE" : `$${product.price}`;

  return (
    <div className="pt-24 pb-20 px-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-8 text-white/60 hover:text-white hover:bg-white/5 p-0">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sounds
        </Button>

        <div className="mb-6 flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm ${isFree ? "bg-green-500/80 text-white" : "bg-blue-500/80 text-white"}`}>{priceLabel}</span>
          {product.synth && <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{product.synth === "zebra3" ? "Zebra 3" : "Zebra 2"}</span>}
          {product.file_size && <span className="text-white/60 text-sm">{product.file_size}</span>}
        </div>

        <h2 className="text-2xl md:text-3xl mb-8 whitespace-nowrap overflow-hidden text-ellipsis">{product.title}</h2>

        {embedUrl && (
          <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-8">
            <iframe
              src={embedUrl}
              title={product.title}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="bg-gray-900/50 rounded-xl p-8">
          <div className="mb-4">{renderStars(product.rating, product.rating_count)}</div>

          <p className="text-white/80 text-base leading-relaxed mb-6 whitespace-pre-line">{product.description}</p>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              {isFree && <Download className="w-4 h-4 text-green-400" />}
              <span className={`text-sm ${isFree ? "text-green-400" : "text-blue-400"}`}>
                {isFree ? "Free Download" : `Purchase for ${priceLabel}`}
              </span>
            </div>

            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors text-sm"
            >
              <span className="mr-2">Get it</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
