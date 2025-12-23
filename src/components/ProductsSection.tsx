import { Product } from "../data/products";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Star, ExternalLink, Download, ArrowRight } from "lucide-react";

interface ProductsSectionProps {
  products: Product[];
  title: string;
  showSeeAll: boolean;
  onSeeAllClick?: () => void;
}

export function ProductsSection({ products, title, showSeeAll, onSeeAllClick }: ProductsSectionProps) {
  const formatPrice = (price: number) => {
    if (price === 0) return "FREE";
    return `$${price}`;
  };

  const renderStars = (rating: number, count: number | null) => {
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
  };

  return (
    <section className="py-20 px-6 bg-gray-950/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl mb-6">{title}</h2>
            <p className="text-white/60 text-lg max-w-3xl">
              {title === "Featured Sounds"
                ? "A selection of our most popular synth patches and sound effects."
                : "Professional synth patches and sound effects for film scoring, music production, and cinematic sound design. Compatible with u-he Zebra synthesizers."}
            </p>
          </div>

          {showSeeAll && onSeeAllClick && (
            <button onClick={onSeeAllClick} className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors group">
              <span>See All</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Products grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div key={product.id} className="group bg-gray-900/50 rounded-xl overflow-hidden hover:bg-gray-900/70 transition-colors">
              {/* Square thumbnail */}
              <div className="relative aspect-square bg-gray-900 overflow-hidden">
                <ImageWithFallback src={product.thumbnail} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

                {/* Price badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs tracking-wide backdrop-blur-sm ${product.other_metadata.free ? "bg-green-500/80 text-white" : "bg-blue-500/80 text-white"}`}>
                    {formatPrice(product.price)}
                  </span>
                </div>

                {/* File size */}
                {product.file_size && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white/80">{product.file_size}</span>
                  </div>
                )}

                {/* Hover overlay with play button for YouTube videos */}
                {product.youtube_link && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <a
                      href={product.youtube_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
                    >
                      <div className="w-0 h-0 border-l-6 border-l-black border-t-4 border-t-transparent border-b-4 border-b-transparent ml-1" />
                    </a>
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-lg mb-2 line-clamp-2">{product.title}</h3>

                  {/* Rating */}
                  <div className="mb-3">{renderStars(product.rating, product.rating_count)}</div>
                </div>

                {/* Description */}
                <p className="text-white/70 text-sm mb-4 line-clamp-3">{product.description}</p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {product.other_metadata.free && <Download className="w-4 h-4 text-green-400" />}
                    <span className={`text-sm ${product.other_metadata.free ? "text-green-400" : "text-blue-400"}`}>{product.other_metadata.free ? "Free Download" : "Purchase"}</span>
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
          ))}
        </div>

        {/* Call to action */}
        <div className="mt-16 text-center">
          <div className="bg-gray-900/50 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl mb-4">Visit Our Gumroad Store</h3>
            <p className="text-white/70 mb-6">Discover more sound design resources and stay updated with our latest releases.</p>
            <a
              href="https://sonictales.gumroad.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white text-black hover:bg-white/90 rounded-lg transition-colors"
            >
              <span className="mr-2">Browse All Products</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
